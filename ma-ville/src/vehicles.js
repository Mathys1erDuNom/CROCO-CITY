import { placeModel } from './city.js';
import {
  TILE_SIZE,
  CAR_HEADING_OFFSET,
  SAFE_DISTANCE,
  SAFE_WIDTH,
  MAX_WAIT,
  CRASH_DURATION,
  CRASH_KNOCKBACK,
  CRASH_IMMUNITY,
} from './config.js';
import { isRoad, DIRECTIONS } from './map.js';

// Exportée pour que collisions.js puisse parcourir les voitures
export const vehicles = [];

export async function addVehicle(scene, pack, name, col, row, speed = 3) {
  const model = await placeModel(scene, pack, name, col, row);

  const car = {
    model, col, row,
    nextCol: col, nextRow: row,
    dir: null, speed, waitTime: 0,
    // --- état de collision ---
    state: 'driving', // 'driving' (roule) ou 'crashed' (accidentée)
    crashTimer: 0,    // temps restant d'immobilisation
    immunity: 0,      // temps restant sans collision possible
    vx: 0, vz: 0,     // vitesse de rebond
    spin: 0,          // vitesse de rotation pendant l'accident
  };
  chooseNext(car);
  vehicles.push(car);
}

// La voiture choisit sa prochaine case au hasard (sans demi-tour si possible)
function chooseNext(car) {
  let options = DIRECTIONS.filter((d) => isRoad(car.col + d.dc, car.row + d.dr));

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
  car.model.rotation.y = Math.atan2(choice.dc, choice.dr) + CAR_HEADING_OFFSET;
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

    if (forward > 0 && forward < SAFE_DISTANCE && side < SAFE_WIDTH) return true;
  }
  return false;
}

// Déclenche l'accident d'une voiture.
// (otherX, otherZ) = position de ce qu'elle a percuté : elle rebondit à l'opposé.
export function crashCar(car, otherX, otherZ) {
  if (car.state !== 'driving' || car.immunity > 0) return;

  car.state = 'crashed';
  car.crashTimer = CRASH_DURATION;

  // Direction du rebond : de l'autre objet vers nous
  const pos = car.model.position;
  const dx = pos.x - otherX;
  const dz = pos.z - otherZ;
  const length = Math.hypot(dx, dz) || 1; // "|| 1" évite une division par zéro
  car.vx = (dx / length) * CRASH_KNOCKBACK;
  car.vz = (dz / length) * CRASH_KNOCKBACK;

  car.spin = (Math.random() - 0.5) * 6; // tourne un peu, dans un sens aléatoire
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
  if (car.crashTimer <= 0) recoverCar(car);
}

// Remet la voiture sur la dernière case de route atteinte, et la fait repartir
function recoverCar(car) {
  car.model.position.x = car.col * TILE_SIZE;
  car.model.position.z = car.row * TILE_SIZE;
  car.state = 'driving';
  car.immunity = CRASH_IMMUNITY; // sinon elle repercute aussitôt l'autre voiture
  car.waitTime = 0;
  car.dir = null;                // demi-tour autorisé pour repartir
  chooseNext(car);
}

export function updateVehicles(delta) {
  for (const car of vehicles) {
    if (car.immunity > 0) car.immunity -= delta;

    // Voiture accidentée : on gère l'accident et on passe à la suivante
    if (car.state === 'crashed') {
      updateCrash(car, delta);
      continue;
    }

    // Une voiture devant gêne : on attend (temps limité)
    if (isBlocked(car)) {
      car.waitTime += delta;
      if (car.waitTime < MAX_WAIT) continue;
    } else {
      car.waitTime = 0;
    }

    const pos = car.model.position;
    const targetX = car.nextCol * TILE_SIZE;
    const targetZ = car.nextRow * TILE_SIZE;
    const dx = targetX - pos.x;
    const dz = targetZ - pos.z;
    const distance = Math.hypot(dx, dz);
    const step = car.speed * delta;

    if (distance <= step) {
      pos.x = targetX;
      pos.z = targetZ;
      car.col = car.nextCol;
      car.row = car.nextRow;
      chooseNext(car);
    } else {
      pos.x += (dx / distance) * step;
      pos.z += (dz / distance) * step;
    }
  }
}