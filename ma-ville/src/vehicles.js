import * as THREE from 'three';
import { placeModel } from './city.js';
import { emitSmoke, emitFlame } from './effects.js';
import {
  TILE_SIZE, SINK_SPEED, SINK_DEPTH,
  CAR_HEADING_OFFSET,
  SAFE_WIDTH,
  DRIVING_STYLES,
  CRASH_DURATION,
  CRASH_IMMUNITY,
  GRAVITY,
  BUMP_UP,
  BUMP_SWERVE,
  BUMP_SHOVE,
  BUMP_ROLL,
  CAR_LENGTH,
  DAMAGE_PER_IMPACT,
  FIRE_DAMAGE,
  FIRE_DELAY,
  SMOKE_RATE,
  FLAME_RATE,
  BRIDGE_HEIGHT,
  RING_RADIUS,
} from './config.js';
import { MAP, isRoad, isWaterAt, canMove, heightAt, DIRECTIONS, ROUNDABOUTS, inRoundabout } from './map.js';

// Branche de rond-point = case juste à côté d'un centre (seules cases du rond-point où l'on roule en ligne droite)
const isArm = (col, row) => ROUNDABOUTS.some((rb) => Math.abs(rb.col - col) + Math.abs(rb.row - row) === 1);
// Dans un rond-point, on ne va jamais en ligne droite vers le centre ou les coins : on prend l'anneau
const canDriveTo = (col, row) => isRoad(col, row) && (!inRoundabout(col, row) || isArm(col, row));

// Exportée pour que collisions.js puisse parcourir les voitures
export const vehicles = [];

// style : 'calm' (calme), 'fast' (rapide et nerveuse) ou 'drunk' (zigzague)
export async function addVehicle(scene, pack, name, col, row, style = 'calm') {
  const settings = DRIVING_STYLES[style];
  if (!settings) throw new Error(`Style de conduite inconnu : "${style}" (choix : ${Object.keys(DRIVING_STYLES)})`);

  const model = await placeModel(scene, pack, name, col, row);
  model.rotation.order = 'YXZ'; // tourne (y), puis penche avant/arrière (x) et sur le côté (z)

  const car = {
    model, col, row,
    nextCol: col, nextRow: row,
    dir: null, style: settings, speed: settings.speed, waitTime: 0,
    heading: 0,           // direction "normale", sans le zigzag
    time: Math.random() * 10, // décalage : deux voitures ne zigzaguent pas pareil
    offX: 0, offZ: 0,     // écart sur le côté (voie de droite + zigzag) appliqué en ce moment
    // --- état de collision ---
    state: 'driving', // 'driving' (roule) ou 'crashed' (accidentée)
    crashTimer: 0,    // temps restant d'immobilisation
    immunity: 0,      // temps restant sans collision possible
    vx: 0, vz: 0,     // vitesse réelle (en roulant comme en glissant après un choc)
    spin: 0,          // vitesse de rotation pendant l'accident
    // --- bosse (roule sur un corps) ---
    baseY: model.position.y, vy: 0, roll: 0, bumpCooldown: 0,
    // --- dégâts ---
    damage: 0,        // de 0 (neuve) à 100 (détruite)
    fireFuse: 0,      // temps écoulé depuis que les dégâts ont dépassé FIRE_DAMAGE
    onFire: false,    // en feu : arrêtée pour toujours
    smokeCount: 0, flameCount: 0, // bouffées "en attente" d'être émises
    fireLight: null,
  };
  chooseNext(car);
  vehicles.push(car);
}

// La voiture choisit sa prochaine case au hasard (sans demi-tour si possible)
function chooseNext(car) {
  // Route voisine ET raccordée à la même hauteur (on ne monte sur un pont que par sa rampe)
  let options = DIRECTIONS.filter((d) => canMove(car.col, car.row, d) && canDriveTo(car.col + d.dc, car.row + d.dr));

  if (car.dir) {
    const withoutUTurn = options.filter(
      (d) => !(d.dc === -car.dir.dc && d.dr === -car.dir.dr)
    );
    if (withoutUTurn.length > 0) options = withoutUTurn;
  }
  if (options.length === 0) return;

  const choice = options[Math.floor(Math.random() * options.length)];
  car.dir = choice;
  car.nextCol = car.col + choice.dc;
  car.nextRow = car.row + choice.dr;
  car.heading = Math.atan2(choice.dc, choice.dr) + CAR_HEADING_OFFSET;
}

// Arrivée sur une branche en allant vers le centre : la voiture prend l'anneau
// (sens inverse des aiguilles d'une montre vu du dessus) jusqu'à une autre branche au hasard.
function enterRoundabout(car) {
  const d = car.dir;
  const rb = d && ROUNDABOUTS.find((r) => r.col === car.col + d.dc && r.row === car.row + d.dr);
  if (!rb) return false;
  // Sorties possibles : branche dont la route continue vers l'extérieur
  let exits = DIRECTIONS.filter((e) =>
    !(e.dc === -d.dc && e.dr === -d.dr) &&
    canMove(rb.col + e.dc, rb.row + e.dr, e) && isRoad(rb.col + 2 * e.dc, rb.row + 2 * e.dr));
  if (exits.length === 0) exits = [DIRECTIONS.find((e) => e.dc === -d.dc && e.dr === -d.dr)]; // demi-tour
  const exit = exits[Math.floor(Math.random() * exits.length)];

  // Angles mesurés comme atan2(z, x) : vu du dessus, faire DIMINUER l'angle = sens inverse des aiguilles
  const from = Math.atan2(-d.dr, -d.dc);
  const to = Math.atan2(exit.dr, exit.dc);
  const TAU = Math.PI * 2;
  const left = (((from - to) % TAU) + TAU) % TAU || TAU; // demi-tour = tour complet
  car.ring = { rb, exit, angle: from, left };
  return true;
}

// Un pas sur l'anneau. Renvoie la direction avant (fx, fz) pour l'écart de voie.
function driveRing(car, pos, step) {
  const r = car.ring;
  const a = Math.min(step / RING_RADIUS, r.left);
  r.angle -= a;
  r.left -= a;
  pos.x = r.rb.col * TILE_SIZE + Math.cos(r.angle) * RING_RADIUS;
  pos.z = r.rb.row * TILE_SIZE + Math.sin(r.angle) * RING_RADIUS;
  const fx = Math.sin(r.angle);
  const fz = -Math.cos(r.angle);
  car.heading = Math.atan2(fx, fz) + CAR_HEADING_OFFSET;
  // Direction "en cases" la plus proche (sert aux distances de sécurité et aux chocs)
  car.dir = Math.abs(fx) > Math.abs(fz)
    ? DIRECTIONS.find((d) => d.dc === Math.sign(fx))
    : DIRECTIONS.find((d) => d.dr === Math.sign(fz));

  if (r.left <= 0) {
    // Sortie : on reprend la route normale sur la branche choisie
    const e = r.exit;
    car.ring = null;
    car.col = r.rb.col + e.dc;
    car.row = r.rb.row + e.dr;
    car.dir = e;
    car.nextCol = car.col + e.dc;
    car.nextRow = car.row + e.dr;
    car.heading = Math.atan2(e.dc, e.dr) + CAR_HEADING_OFFSET;
  }
  return [fx, fz];
}

// Vrai si une voiture roulant dans le même sens gêne devant "car"
function isBlocked(car) {
  if (!car.dir) return false;
  const pos = car.model.position;

  for (const other of vehicles) {
    if (other === car) continue;
    // Les voitures en sens inverse ne sont PAS évitées : elles vont se percuter
    if (other.dir && other.dir.dc === -car.dir.dc && other.dir.dr === -car.dir.dr) continue;

    const dx = other.model.position.x - pos.x;
    const dz = other.model.position.z - pos.z;
    const forward = dx * car.dir.dc + dz * car.dir.dr;
    const side = Math.abs(dx * car.dir.dr - dz * car.dir.dc);

    if (forward > 0 && forward < car.style.safeDistance && side < SAFE_WIDTH) return true;
  }
  return false;
}

// Déclenche (ou prolonge) l'accident d'une voiture.
// Sa nouvelle vitesse (vx, vz) a déjà été calculée par collisions.js.
// impact : vitesse du choc, qui donne les dégâts
export function crashCar(car, spin, impact) {
  car.damage = Math.min(100, car.damage + impact * DAMAGE_PER_IMPACT);
  car.smokeCount = Math.max(car.smokeCount, 1); // bouffée immédiate, sinon la 1re fumée tarde de plusieurs secondes
  car.state = 'crashed';
  car.crashTimer = CRASH_DURATION;
  car.spin += spin;
  car.offX = car.offZ = 0; // l'écart sur le côté reste où il est, on ne le retire plus
}

// Pendant l'accident : la voiture glisse, tourne, ralentit, puis redémarre
function updateCrash(car, delta) {
  const pos = car.model.position;
  pos.x += car.vx * delta;
  pos.z += car.vz * delta;
  car.model.rotation.y += car.spin * delta;

  // Frottement : tout ralentit progressivement
  const friction = Math.max(0, 1 - 4 * delta);
  car.vx *= friction;
  car.vz *= friction;
  car.spin *= friction;

  car.crashTimer -= delta;
  if (car.crashTimer <= 0 && !car.onFire) recoverCar(car); // en feu : elle ne repart jamais
}

// La voiture repart d'où le choc l'a laissée : elle roule jusqu'à la case de route
// la plus proche, puis reprend son trajet normalement (pas de téléportation)
function recoverCar(car) {
  const pos = car.model.position;
  // Case de route la plus proche, au même niveau qu'elle (pas le pont si elle est tombée en bas)
  let best = { col: car.col, row: car.row };
  let bestDistance = Infinity;
  MAP.forEach((line, row) => line.forEach((_, col) => {
    if (!canDriveTo(col, row)) return;
    const x = col * TILE_SIZE;
    const z = row * TILE_SIZE;
    if (Math.abs(car.baseY + heightAt(x, z) - pos.y) > BRIDGE_HEIGHT / 2) return;
    const distance = Math.hypot(x - pos.x, z - pos.z);
    if (distance < bestDistance) { bestDistance = distance; best = { col, row }; }
  }));
  car.col = car.nextCol = best.col;
  car.row = car.nextRow = best.row;

  car.state = 'driving';
  car.ring = null;
  car.spin = 0;
  car.immunity = CRASH_IMMUNITY; // sinon elle repercute aussitôt l'autre voiture
  car.waitTime = 0;
  car.dir = null; // pas de direction tant qu'elle rejoint la route (demi-tour permis ensuite)
  car.heading = Math.atan2(car.nextCol * TILE_SIZE - pos.x, car.nextRow * TILE_SIZE - pos.z) + CAR_HEADING_OFFSET;
}

// Roule sur un obstacle (ex : un corps) : elle saute un peu, penche et dévie.
// strength : de 0 à 1, selon la vitesse. Le côté (gauche ou droite) est au hasard.
export function bumpCar(car, strength) {
  const side = Math.random() < 0.5 ? -1 : 1;
  car.vy = Math.max(car.vy, BUMP_UP * strength);
  car.roll = BUMP_ROLL * strength * side;
  car.model.rotation.y += BUMP_SWERVE * strength * side * Math.random();

  // Écart sur le côté : (-cos, sin) = la droite de la voiture
  const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
  const shove = BUMP_SHOVE * strength * side;
  car.model.position.x -= Math.cos(angle) * shove;
  car.model.position.z += Math.sin(angle) * shove;
}

// Saut : la gravité la ramène au sol, et elle se remet à plat
// Hauteur : elle suit la route (rampes, ponts), et la gravité la fait retomber (bosse, chute d'un pont)
function updateHeight(car, delta) {
  const pos = car.model.position;
  const floor = car.baseY + heightAt(pos.x, pos.z);

  if (car.vy <= 0 && pos.y - floor < 0.08) {
    // Au sol : collée à la route, et penchée selon la pente (avant plus haut que l'arrière = nez levé)
    pos.y = floor;
    car.vy = 0;
    car.model.rotation.z = 0;
    const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
    const half = CAR_LENGTH / 2;
    const front = heightAt(pos.x + Math.sin(angle) * half, pos.z + Math.cos(angle) * half);
    const back = heightAt(pos.x - Math.sin(angle) * half, pos.z - Math.cos(angle) * half);
    car.model.rotation.x = -Math.atan2(front - back, CAR_LENGTH);
    return;
  }

  // En l'air
  pos.y += car.vy * delta;
  car.vy -= GRAVITY * delta;
  car.model.rotation.z = car.roll * (pos.y - floor);
  if (pos.y <= floor) {
    pos.y = floor;
    car.vy = 0;
    car.model.rotation.z = 0;
  }
}

// Fumée selon les dégâts, puis feu si elle est trop abîmée
function updateDamage(car, delta) {
  if (car.damage <= 0) return;
  const scene = car.model.parent;
  const pos = car.model.position;

  // La fumée sort du capot (l'avant de la voiture)
  const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
  const hood = {
    x: pos.x + Math.sin(angle) * CAR_LENGTH * 0.3,
    y: pos.y + 0.3,
    z: pos.z + Math.cos(angle) * CAR_LENGTH * 0.3,
  };

  const level = car.damage / 100;
  car.smokeCount += SMOKE_RATE * level * delta;
  for (; car.smokeCount >= 1; car.smokeCount--) emitSmoke(scene, hood, car.onFire ? 1 : level);

  if (car.onFire) {
    car.flameCount += FLAME_RATE * delta;
    for (; car.flameCount >= 1; car.flameCount--) emitFlame(scene, hood);
    car.fireLight.intensity = 3 + Math.random() * 3; // les flammes vacillent
    return;
  }

  // Trop abîmée : elle fume noir quelques secondes, puis s'embrase
  if (car.damage >= FIRE_DAMAGE) {
    car.fireFuse += delta;
    if (car.fireFuse >= FIRE_DELAY) igniteCar(car);
  }
}

function igniteCar(car) {
  car.onFire = true;
  car.damage = 100;
  car.state = 'crashed'; // elle glisse jusqu'à l'arrêt, puis ne bouge plus (sauf si on la percute)
  car.crashTimer = 0;

  // Carrosserie noircie (copie des matériaux pour ne pas noircir les autres voitures)
  car.model.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.color.multiplyScalar(0.25);
    }
  });

  // Lueur orange autour de la voiture
  car.fireLight = new THREE.PointLight(0xff6a00, 4, 5);
  car.fireLight.position.y = 0.8;
  car.model.add(car.fireLight);
}

// Tombée dans l'eau : elle glisse encore un peu, pique du nez et coule. Elle ne repart jamais.
function sinkCar(car, delta) {
  const pos = car.model.position;
  if (!car.sinking) {
    car.sinking = true;
    car.state = 'crashed'; // plus de piétons renversés
    car.onFire = false;    // l'eau éteint le feu
    if (car.fireLight) car.fireLight.intensity = 0;
  }
  if (!car.model.visible) return;
  pos.x += car.vx * delta;
  pos.z += car.vz * delta;
  const drag = Math.max(0, 1 - 3 * delta); // l'eau freine fort
  car.vx *= drag;
  car.vz *= drag;
  pos.y -= SINK_SPEED * delta;
  car.model.rotation.x += (0.4 - car.model.rotation.x) * Math.min(1, delta * 2);
  if (pos.y < car.baseY - SINK_DEPTH) car.model.visible = false; // au fond
}

export function updateVehicles(delta) {
  for (const car of vehicles) {
    const p = car.model.position;
    if (car.sinking || (isWaterAt(p.x, p.z) && p.y < car.baseY + 0.1)) {
      sinkCar(car, delta);
      continue;
    }
    if (car.immunity > 0) car.immunity -= delta;
    if (car.bumpCooldown > 0) car.bumpCooldown -= delta;
    updateHeight(car, delta);
    updateDamage(car, delta);

    // Voiture accidentée : on gère l'accident et on passe à la suivante
    if (car.state === 'crashed') {
      updateCrash(car, delta);
      continue;
    }

    // Une voiture devant gêne : on attend (temps limité)
    if (isBlocked(car)) {
      car.waitTime += delta;
      if (car.waitTime < car.style.maxWait) {
        car.vx = car.vz = 0; // à l'arrêt
        continue;
      }
    } else {
      car.waitTime = 0;
    }

    const pos = car.model.position;
    const { lane, speed, sway, swayAngle, speedSway } = car.style;
    car.time += delta;
    const startX = pos.x;
    const startZ = pos.z;

    // On retire l'écart de l'image d'avant : on avance depuis le centre de la route
    pos.x -= car.offX;
    pos.z -= car.offZ;

    // Vitesse qui varie (sinus mélangés = irrégulier)
    car.speed = speed * (1 + speedSway * Math.sin(car.time * 1.3) * Math.sin(car.time * 0.7));

    const step = car.speed * delta;
    let forward;

    if (car.ring) {
      forward = driveRing(car, pos, step);
    } else {
      const targetX = car.nextCol * TILE_SIZE;
      const targetZ = car.nextRow * TILE_SIZE;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const distance = Math.hypot(dx, dz);

      if (distance <= step) {
        pos.x = targetX;
        pos.z = targetZ;
        car.col = car.nextCol;
        car.row = car.nextRow;
        if (!enterRoundabout(car)) chooseNext(car);
      } else {
        pos.x += (dx / distance) * step;
        pos.z += (dz / distance) * step;
      }
      forward = car.dir && [car.dir.dc, car.dir.dr];
    }

    // Écart sur le côté : voie de droite + zigzag. (-dr, dc) = la droite de la voiture.
    if (forward) {
      const [fx, fz] = forward;
      const wave = sway > 0 ? Math.sin(car.time * 2.5) + 0.5 * Math.sin(car.time * 4.1) : 0;
      const side = lane + wave * sway;
      // On glisse vers l'écart voulu au lieu de sauter : changement de voie en douceur dans les virages
      const smooth = Math.min(1, delta * 8);
      car.offX += (-fz * side - car.offX) * smooth;
      car.offZ += (fx * side - car.offZ) * smooth;
      pos.x += car.offX;
      pos.z += car.offZ;
    }

    // Le nez tourne en douceur vers sa direction (+ oscillation du bourré)
    const wantedAngle = car.heading + Math.cos(car.time * 2.5) * swayAngle;
    let turn = (wantedAngle - car.model.rotation.y) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2;  // toujours par le chemin le plus court
    if (turn < -Math.PI) turn += Math.PI * 2;
    car.model.rotation.y += turn * Math.min(1, delta * 8);

    // Vitesse réelle de cette image : sert à calculer la force des chocs
    if (delta > 0) {
      car.vx = (pos.x - startX) / delta;
      car.vz = (pos.z - startZ) / delta;
    }
  }
}
