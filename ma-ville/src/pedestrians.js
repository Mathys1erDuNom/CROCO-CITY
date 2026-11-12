import * as THREE from 'three';
import {
  TILE_SIZE, PED_RADIUS, PED_SPEED,
  LAUNCH_FACTOR, LAUNCH_UP, GRAVITY, BRIDGE_HEIGHT,
  FIGHTER_SPEED, FIGHTER_SIGHT, FIGHTER_CHARGE, PUNCH_RANGE, PUNCH_POWER, PUNCH_UP, PUNCH_COOLDOWN,
  POLICE_SIGHT, POLICE_SPEED, POLICE_RANGE, SHOT_COOLDOWN, SHOT_POWER, SHOT_UP,
  FLOAT_SINK, CROC_SWIM_DEPTH, FLOAT_BOB, CROC_DRAG_SPEED, CROC_SWIM_BOOST, CROC_MOUTH, DROWN_TIME, DROWN_DEPTH, SPLASH_RATE,
} from './config.js';
import { placeModel } from './city.js';
import { loadModel } from './loader.js';
import { emitSplash, emitShot } from './effects.js';
import { MAP, isRoad, isGrass, isFree, isWater, isBeach, isWaterAt, canMove, heightAt, DIRECTIONS } from './map.js';

// Comportements : où le piéton a le droit de marcher
const PED_STYLES = {
  crazy: isRoad,      // le fou : marche sur la route
  calm: isGrass,      // le calme : évite les routes, reste dans l'herbe
  distracted: isFree, // pas attentif : marche partout
  fighter: isFree,    // le combattant : marche partout et va taper les autres
  police: isFree,     // le policier : marche partout et tire sur ceux qui ont frappé quelqu'un
  crocodile: (col, row) => isWater(col, row) || isBeach(col, row), // reste dans l'eau et sur la plage, attrape ceux qui passent
};

export const pedestrians = [];

// Si le personnage marche de travers ou à reculons : 0, Math.PI / 2, Math.PI, -Math.PI / 2
const HEADING_OFFSET = 0;

// Écart max autour du centre d'une case de route (la chaussée fait ±0.3 case de large)
const ROAD_SPREAD = TILE_SIZE * 0.25;

// Ajoute un personnage qui marche au hasard.
//  - pack  : dossier du pack (ex : 'characters')
//  - name  : fichier sans .glb (ex : 'character-a')
//  - style : 'crazy' (sur la route), 'calm' (évite les routes), 'distracted' (partout)
//            'fighter' (cherche les autres piétons pour les taper)
//            'police' (pistolet à la main, poursuit et abat ceux qui ont frappé quelqu'un)
//            ou 'crocodile' (attrape ceux qui passent et les emmène au fond de l'eau)
export async function addPedestrian(scene, pack, name, col, row, style = 'crazy') {
  const canWalk = PED_STYLES[style];
  if (!canWalk) throw new Error(`Comportement de piéton inconnu : "${style}" (choix : ${Object.keys(PED_STYLES)})`);

  // placeModel charge le modèle et applique l'échelle du pack
  const model = await placeModel(scene, pack, name, col, row);

  // Ordre 'YXZ' : quand il tombe, il bascule dans le sens où il regarde
  model.rotation.order = 'YXZ';

  // Policier : le bras droit est tendu vers l'avant, le pistolet au bout
  let gun = null;
  if (style === 'police') {
    gun = await loadModel('weapons', 'weapon-shooter');
    const arm = model.getObjectByName('arm-right');
    // shortcut: réglé sur les personnages Kenney (bras à l'horizontale, long de 0.27) ; à ajuster pour un autre pack
    if (arm) {
      arm.rotation.y = Math.PI / 2;   // le bras pointe devant au lieu de sur le côté
      gun.position.set(-0.27, 0, 0);  // au bout du bras = la main
      gun.rotation.y = -Math.PI / 2;  // le canon regarde devant
    } else {
      gun.position.set(-0.15, 0.3, 0.15); // modèle sans bras : posé à côté de lui
    }
    gun.scale.setScalar(0.5);
    (arm ?? model).add(gun);
  }

  const ped = {
    model, pack, name, col, row, canWalk,
    fighter: style === 'fighter' || style === 'crocodile' || style === 'police', punchCooldown: 0, charging: false,
    police: style === 'police', gun,
    wanted: false, // a frappé quelqu'un : les policiers le recherchent
    sink: style === 'crocodile' ? CROC_SWIM_DEPTH : FLOAT_SINK, // enfoncement dans l'eau
    phase: Math.random() * 10, // décalage des vagues : ils ne flottent pas tous pareil
    croc: style === 'crocodile', victim: null, lair: null, drownTimer: 0, // proie dans la gueule, case d'eau visée
    baseY: model.position.y, // hauteur de pose (vient de config.js)
    nextCol: col, nextRow: row, dir: null,
    targetX: model.position.x, targetZ: model.position.z, // point exact visé dans la case suivante
    state: 'walking', // 'walking', 'flying' (projeté), 'down' (au sol, pour toujours), 'grabbed' (dans la gueule), 'gone' (disparu)
    vx: 0, vy: 0, vz: 0,
    spinX: 0, spinY: 0, spinZ: 0, // vitesses de rotation en vol
    landing: 0,                   // tombe sur le ventre ou sur le dos
    lastX: model.position.x, lastZ: model.position.z, splashCount: 0, // pour les éclaboussures
  };
  chooseNext(ped);
  pedestrians.push(ped);
}

// Choix aléatoire parmi les cases voisines permises (sans demi-tour si possible)
function chooseNext(ped) {
  // Case permise ET raccordée à la même hauteur (on monte sur un pont par la rampe)
  let options = DIRECTIONS.filter((d) => canMove(ped.col, ped.row, d) && ped.canWalk(ped.col + d.dc, ped.row + d.dr));
  // Coincé (ex : un calme posé au milieu d'une route) : il passe par n'importe quelle case libre
  const lost = options.length === 0;
  if (lost) {
    options = DIRECTIONS.filter((d) => canMove(ped.col, ped.row, d));
    // Hors de sa zone (ex : crocodile sorti chasser) : il prend le chemin le plus court pour y revenir
    const home = nearestCell(ped, ped.canWalk);
    const gap = (d) => Math.hypot(ped.col + d.dc - home.col, ped.row + d.dr - home.row);
    if (home && options.length > 0) options = [options.reduce((best, d) => (gap(d) < gap(best) ? d : best))];
  }

  // Combattant qui a une cible : il prend la case qui le rapproche le plus d'elle
  const prey = !lost && ped.fighter && findPrey(ped);
  if (prey && options.length > 0) {
    const gap = (d) => Math.hypot((ped.col + d.dc) * TILE_SIZE - prey.model.position.x, (ped.row + d.dr) * TILE_SIZE - prey.model.position.z);
    options = [options.reduce((best, d) => (gap(d) < gap(best) ? d : best))];
  } else if (ped.dir) {
    const withoutUTurn = options.filter(
      (d) => !(d.dc === -ped.dir.dc && d.dr === -ped.dir.dr)
    );
    if (withoutUTurn.length > 0) options = withoutUTurn;
  }
  if (options.length === 0) return;

  const choice = options[Math.floor(Math.random() * options.length)];
  ped.dir = choice;
  ped.nextCol = ped.col + choice.dc;
  ped.nextRow = ped.row + choice.dr;

  // Sur la route : un point au hasard sur la chaussée, pas forcément le milieu
  const spread = isRoad(ped.nextCol, ped.nextRow) ? ROAD_SPREAD : 0;
  ped.targetX = ped.nextCol * TILE_SIZE + (Math.random() * 2 - 1) * spread;
  ped.targetZ = ped.nextRow * TILE_SIZE + (Math.random() * 2 - 1) * spread;

  // Le personnage se tourne vers là où il va
  const pos = ped.model.position;
  ped.model.rotation.y = Math.atan2(ped.targetX - pos.x, ped.targetZ - pos.z) + HEADING_OFFSET;
}

// La case la plus proche qui vérifie test(col, row) (null s'il n'y en a aucune)
function nearestCell(ped, test) {
  let home = null;
  let best = Infinity;
  MAP.forEach((line, row) => line.forEach((_, col) => {
    const distance = Math.hypot(col - ped.col, row - ped.row);
    if (test(col, row) && distance < best) { best = distance; home = { col, row }; }
  }));
  return home;
}

// Éclaboussures quand il bouge dans l'eau (depuis l'image d'avant, quelle que soit la raison : marche, nage, traîné...)
function splash(ped, delta) {
  const pos = ped.model.position;
  const moved = Math.hypot(pos.x - ped.lastX, pos.z - ped.lastZ);
  ped.lastX = pos.x;
  ped.lastZ = pos.z;
  if (ped.state === 'gone' || moved < 0.001 || !isWaterAt(pos.x, pos.z)) return;
  ped.splashCount += SPLASH_RATE * delta;
  for (; ped.splashCount >= 1; ped.splashCount--) emitSplash(ped.model.parent, { x: pos.x, y: 0.05, z: pos.z });
}

// Vitesse réelle : le crocodile va plus vite dans l'eau
function speedOf(ped, speed) {
  const pos = ped.model.position;
  return ped.croc && isWaterAt(pos.x, pos.z) ? speed * CROC_SWIM_BOOST : speed;
}

// Hauteur du sol sous le piéton. Dans l'eau, il flotte : un peu enfoncé, et il monte et descend avec les vagues.
function floorY(ped) {
  const pos = ped.model.position;
  const y = ped.baseY + heightAt(pos.x, pos.z);
  if (!isWaterAt(pos.x, pos.z)) return y;
  return y - ped.sink + Math.sin(performance.now() / 500 + ped.phase) * FLOAT_BOB;
}

// Le piéton debout le plus proche que le combattant peut voir (même niveau), ou null
function findPrey(fighter) {
  const p = fighter.model.position;
  let prey = null;
  let best = fighter.police ? POLICE_SIGHT : FIGHTER_SIGHT;
  for (const other of pedestrians) {
    // Le crocodile prend aussi les corps au sol ; le combattant ne tape que ceux debout
    const target = other.state === 'walking' || (fighter.croc && other.state === 'down');
    if (other === fighter || !target) continue;
    if (!fighter.croc && other.croc) continue; // les combattants n'osent pas taper un crocodile
    if (fighter.police && !other.wanted) continue; // le policier ne vise que les criminels
    const o = other.model.position;
    if (Math.abs(o.y - p.y) > BRIDGE_HEIGHT * 0.6) continue; // sur le pont alors qu'il est en bas
    const distance = Math.hypot(o.x - p.x, o.z - p.z);
    if (distance < best) { best = distance; prey = other; }
  }
  return prey;
}

// Le combattant fonce droit sur sa cible, et la frappe s'il est assez près.
// Renvoie false s'il n'y a personne d'assez proche (il marche alors normalement).
function charge(ped, delta) {
  const prey = findPrey(ped);
  const pos = ped.model.position;
  if (!prey) return false;
  const dx = prey.model.position.x - pos.x;
  const dz = prey.model.position.z - pos.z;
  const distance = Math.hypot(dx, dz);
  if (distance > (ped.police ? POLICE_RANGE : FIGHTER_CHARGE)) return false;

  ped.model.rotation.y = Math.atan2(dx, dz) + HEADING_OFFSET;
  if (ped.police) {
    // À portée : il reste sur place et tire. La cible tombe, projetée dans le sens de la balle.
    // shortcut: il tire à travers les bâtiments ; ajouter un test de ligne de vue si ça se voit trop
    if (ped.punchCooldown <= 0 && distance > 0) {
      const muzzle = ped.gun.getWorldPosition(new THREE.Vector3());
      emitShot(ped.model.parent, muzzle, { x: prey.model.position.x, y: muzzle.y, z: prey.model.position.z });
      launchPedestrian(prey, dx / distance, dz / distance, SHOT_POWER, SHOT_UP);
      ped.punchCooldown = SHOT_COOLDOWN;
    }
  } else if (distance < PED_RADIUS * 2 + PUNCH_RANGE) {
    if (ped.croc) {
      grab(ped, prey);
    } else if (ped.punchCooldown <= 0 && distance > 0) {
      // Coup de poing : la cible est projetée dans la direction du coup
      launchPedestrian(prey, dx / distance, dz / distance, PUNCH_POWER, PUNCH_UP);
      ped.wanted = true; // crime : les policiers qui le voient vont le poursuivre
      ped.punchCooldown = PUNCH_COOLDOWN;
    }
  } else {
    const step = Math.min(distance, speedOf(ped, FIGHTER_SPEED) * delta);
    pos.x += (dx / distance) * step;
    pos.z += (dz / distance) * step;
  }
  // Il quitte la grille : on note la case où il se trouve maintenant
  ped.col = Math.round(pos.x / TILE_SIZE);
  ped.row = Math.round(pos.z / TILE_SIZE);
  return true;
}

// Le crocodile attrape sa proie et part vers la case d'eau la plus proche
function grab(croc, prey) {
  prey.state = 'grabbed';
  prey.model.rotation.x = Math.PI / 2; // à plat dans sa gueule
  prey.model.rotation.z = 0;
  croc.victim = prey;
  croc.lair = nearestCell(croc, isWater) ?? { col: croc.col, row: croc.row }; // pas d'eau : il reste sur place
  croc.drownTimer = 0;
}

// Il ramène la proie dans l'eau, l'emmène au fond, puis elle disparaît et il reprend sa vie
function dragVictim(croc, delta) {
  const pos = croc.model.position;
  const dx = croc.lair.col * TILE_SIZE - pos.x;
  const dz = croc.lair.row * TILE_SIZE - pos.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 0.05) {
    const step = Math.min(distance, speedOf(croc, CROC_DRAG_SPEED) * delta);
    pos.x += (dx / distance) * step;
    pos.z += (dz / distance) * step;
    croc.model.rotation.y = Math.atan2(dx, dz) + HEADING_OFFSET;
  } else {
    croc.drownTimer += delta; // arrivé dans l'eau : il la tire vers le fond
  }
  pos.y = floorY(croc);

  // La proie suit sa gueule, et descend petit à petit (sous l'eau, le sol la cache)
  const angle = croc.model.rotation.y - HEADING_OFFSET;
  const v = croc.victim.model;
  v.position.x = pos.x + Math.sin(angle) * CROC_MOUTH;
  v.position.z = pos.z + Math.cos(angle) * CROC_MOUTH;
  v.position.y = pos.y - DROWN_DEPTH * Math.min(1, croc.drownTimer / DROWN_TIME);
  v.rotation.y = croc.model.rotation.y;

  if (croc.drownTimer < DROWN_TIME) return;
  v.removeFromParent();
  croc.victim.state = 'gone';
  croc.victim = null;
  croc.charging = false;
  croc.col = croc.lair.col;
  croc.row = croc.lair.row;
  croc.dir = null;
  chooseNext(croc);
}

// Projette le piéton : (dirX, dirZ) = direction du choc, power = sa force, up = vitesse vers le haut
export function launchPedestrian(ped, dirX, dirZ, power, up = LAUNCH_UP) {
  if (ped.state !== 'walking' || ped.victim) return; // un crocodile qui tient sa proie ne la lâche pas
  ped.state = 'flying';

  // Direction : celle de la voiture, déviée au hasard (jusqu'à ±35°)
  const angle = (Math.random() - 0.5) * 1.2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const force = power * LAUNCH_FACTOR * (0.6 + Math.random() * 0.8); // 60% à 140%
  ped.vx = (dirX * cos - dirZ * sin) * force;
  ped.vz = (dirX * sin + dirZ * cos) * force;
  ped.vy = up * (0.5 + Math.random()); // vole plus ou moins haut

  // Pirouettes : salto avant ou arrière, vrille et roulade, chacun au hasard
  ped.spinX = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8);
  ped.spinY = (Math.random() - 0.5) * 12;
  ped.spinZ = (Math.random() - 0.5) * 6;
  ped.landing = Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
}

export function updatePedestrians(delta) {
  for (const ped of pedestrians) {
    const pos = ped.model.position;
    splash(ped, delta);
    if (ped.state === 'grabbed' || ped.state === 'gone') continue; // c'est le crocodile qui le déplace

    if (ped.victim) {
      dragVictim(ped, delta);
    } else if (ped.state === 'flying') {
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      pos.y += ped.vy * delta;
      ped.vy -= GRAVITY * delta;
      ped.model.rotation.x += ped.spinX * delta;
      ped.model.rotation.y += ped.spinY * delta;
      ped.model.rotation.z += ped.spinZ * delta;

      // Atterrissage : il tombe au sol, couché
      const floor = floorY(ped);
      if (pos.y <= floor) {
        pos.y = floor;
        ped.model.rotation.x = ped.landing; // sur le ventre ou sur le dos
        ped.model.rotation.z = 0;           // à plat, pas penché dans le sol
        ped.state = 'down';
      }
    } else if (ped.state === 'down') {
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      const friction = Math.max(0, 1 - 6 * delta);
      ped.vx *= friction;
      ped.vz *= friction;
      // Poussé hors d'un pont : il tombe
      pos.y = Math.max(floorY(ped), pos.y - 6 * delta);
    } else {
      if (ped.fighter) {
        ped.punchCooldown -= delta;
        if (charge(ped, delta)) {
          ped.charging = true;
          pos.y = floorY(ped);
          continue;
        }
        // Fin de la charge : il reprend sa marche depuis la case où il est
        if (ped.charging) {
          ped.charging = false;
          ped.dir = null;
          chooseNext(ped);
        }
      }

      // Marche vers la case suivante
      const targetX = ped.targetX;
      const targetZ = ped.targetZ;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const distance = Math.hypot(dx, dz);
      // Le policier patrouille au pas, et court dès qu'il a un criminel en vue
      const walkSpeed = ped.police ? (findPrey(ped) ? POLICE_SPEED : PED_SPEED) : ped.fighter ? FIGHTER_SPEED : PED_SPEED;
      const step = speedOf(ped, walkSpeed) * delta;

      if (distance <= step) {
        pos.x = targetX;
        pos.z = targetZ;
        ped.col = ped.nextCol;
        ped.row = ped.nextRow;
        chooseNext(ped);
      } else {
        pos.x += (dx / distance) * step;
        pos.z += (dz / distance) * step;
      }
      pos.y = floorY(ped); // monte les rampes, marche sur les ponts
    }
  }

  // Les noyés sont retirés de la liste (après la boucle, pour ne pas la casser en cours de route)
  for (let i = pedestrians.length - 1; i >= 0; i--) {
    if (pedestrians[i].state === 'gone') pedestrians.splice(i, 1);
  }
}
