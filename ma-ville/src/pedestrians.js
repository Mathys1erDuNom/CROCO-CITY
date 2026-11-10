import {
  TILE_SIZE, PED_RADIUS, PED_SPEED,
  LAUNCH_FACTOR, LAUNCH_UP, GRAVITY, BRIDGE_HEIGHT,
  FIGHTER_SPEED, FIGHTER_SIGHT, FIGHTER_CHARGE, PUNCH_RANGE, PUNCH_POWER, PUNCH_UP, PUNCH_COOLDOWN,
} from './config.js';
import { placeModel } from './city.js';
import { isRoad, isGrass, isFree, canMove, heightAt, DIRECTIONS } from './map.js';

// Comportements : où le piéton a le droit de marcher
const PED_STYLES = {
  crazy: isRoad,      // le fou : marche sur la route
  calm: isGrass,      // le calme : évite les routes, reste dans l'herbe
  distracted: isFree, // pas attentif : marche partout
  fighter: isFree,    // le combattant : marche partout et va taper les autres
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
//            ou 'fighter' (cherche les autres piétons pour les taper)
export async function addPedestrian(scene, pack, name, col, row, style = 'crazy') {
  const canWalk = PED_STYLES[style];
  if (!canWalk) throw new Error(`Comportement de piéton inconnu : "${style}" (choix : ${Object.keys(PED_STYLES)})`);

  // placeModel charge le modèle et applique l'échelle du pack
  const model = await placeModel(scene, pack, name, col, row);

  // Ordre 'YXZ' : quand il tombe, il bascule dans le sens où il regarde
  model.rotation.order = 'YXZ';

  const ped = {
    model, pack, name, col, row, canWalk,
    fighter: style === 'fighter', punchCooldown: 0, charging: false,
    baseY: model.position.y, // hauteur de pose (vient de config.js)
    nextCol: col, nextRow: row, dir: null,
    targetX: model.position.x, targetZ: model.position.z, // point exact visé dans la case suivante
    state: 'walking', // 'walking', 'flying' (projeté), 'down' (au sol, pour toujours)
    vx: 0, vy: 0, vz: 0,
    spinX: 0, spinY: 0, spinZ: 0, // vitesses de rotation en vol
    landing: 0,                   // tombe sur le ventre ou sur le dos
  };
  chooseNext(ped);
  pedestrians.push(ped);
}

// Choix aléatoire parmi les cases voisines permises (sans demi-tour si possible)
function chooseNext(ped) {
  // Case permise ET raccordée à la même hauteur (on monte sur un pont par la rampe)
  let options = DIRECTIONS.filter((d) => canMove(ped.col, ped.row, d) && ped.canWalk(ped.col + d.dc, ped.row + d.dr));
  // Coincé (ex : un calme posé au milieu d'une route) : il passe par n'importe quelle case libre
  if (options.length === 0) options = DIRECTIONS.filter((d) => canMove(ped.col, ped.row, d));

  // Combattant qui a une cible : il prend la case qui le rapproche le plus d'elle
  const prey = ped.fighter && findPrey(ped);
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

// Le piéton debout le plus proche que le combattant peut voir (même niveau), ou null
function findPrey(fighter) {
  const p = fighter.model.position;
  let prey = null;
  let best = FIGHTER_SIGHT;
  for (const other of pedestrians) {
    if (other === fighter || other.state !== 'walking') continue;
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
  if (distance > FIGHTER_CHARGE) return false;

  ped.model.rotation.y = Math.atan2(dx, dz) + HEADING_OFFSET;
  if (distance < PED_RADIUS * 2 + PUNCH_RANGE) {
    // Coup de poing : la cible est projetée dans la direction du coup
    if (ped.punchCooldown <= 0 && distance > 0) {
      launchPedestrian(prey, dx / distance, dz / distance, PUNCH_POWER, PUNCH_UP);
      ped.punchCooldown = PUNCH_COOLDOWN;
    }
  } else {
    const step = Math.min(distance, FIGHTER_SPEED * delta);
    pos.x += (dx / distance) * step;
    pos.z += (dz / distance) * step;
  }
  // Il quitte la grille : on note la case où il se trouve maintenant
  ped.col = Math.round(pos.x / TILE_SIZE);
  ped.row = Math.round(pos.z / TILE_SIZE);
  return true;
}

// Projette le piéton : (dirX, dirZ) = direction du choc, power = sa force, up = vitesse vers le haut
export function launchPedestrian(ped, dirX, dirZ, power, up = LAUNCH_UP) {
  if (ped.state !== 'walking') return;
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

    if (ped.state === 'flying') {
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      pos.y += ped.vy * delta;
      ped.vy -= GRAVITY * delta;
      ped.model.rotation.x += ped.spinX * delta;
      ped.model.rotation.y += ped.spinY * delta;
      ped.model.rotation.z += ped.spinZ * delta;

      // Atterrissage : il tombe au sol, couché
      const floor = ped.baseY + heightAt(pos.x, pos.z);
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
      pos.y = Math.max(ped.baseY + heightAt(pos.x, pos.z), pos.y - 6 * delta);
    } else {
      if (ped.fighter) {
        ped.punchCooldown -= delta;
        if (charge(ped, delta)) {
          ped.charging = true;
          pos.y = ped.baseY + heightAt(pos.x, pos.z);
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
      const step = (ped.fighter ? FIGHTER_SPEED : PED_SPEED) * delta;

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
      pos.y = ped.baseY + heightAt(pos.x, pos.z); // monte les rampes, marche sur les ponts
    }
  }
}