import { vehicles, crashCar, bumpCar } from './vehicles.js';
import { pedestrians, launchPedestrian } from './pedestrians.js';
import { hitBuildings, bounceOffWall } from './buildings.js';
import { CAR_WIDTH, CAR_LENGTH, CAR_HEADING_OFFSET, PED_RADIUS, PED_BOUNCE, BRIDGE_HEIGHT, BODY_RADIUS, BUMP_FULL_SPEED, BUMP_PUSH, CRASH_BOUNCE, CRASH_MIN_SPEED, CRASH_SPIN } from './config.js';

// Appelée à chaque image, après les déplacements
export function checkCollisions() {
  // --- Voiture contre voiture ---
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      hitCars(vehicles[i], vehicles[j]);
    }
  }

  // --- Voiture contre piéton ---
  for (const car of vehicles) {
    // Seule une voiture qui roule peut renverser quelqu'un
    if (car.state !== 'driving' || !car.dir) continue;

    for (const ped of pedestrians) {
      if (ped.state !== 'walking') continue;

      const pp = ped.model.position;
      const touched = sameLevel(car.model.position, pp) &&
        carCircles(car).some((c) => Math.hypot(c.x - pp.x, c.z - pp.z) < CAR_WIDTH / 2 + PED_RADIUS);

      if (touched) {
        // Projeté dans la direction où roule la voiture
        launchPedestrian(ped, car.dir.dc, car.dir.dr, car.speed);
      }
    }
  }

  // --- Voiture qui roule sur un piéton au sol : bosse ---
  for (const car of vehicles) {
    if (car.bumpCooldown > 0) continue; // une seule bosse par corps, pas à chaque image
    const speed = Math.hypot(car.vx, car.vz);
    if (speed < 0.5) continue;          // presque à l'arrêt : elle le pousse à peine

    for (const ped of pedestrians) {
      if (ped.state !== 'down') continue;
      const pp = ped.model.position;
      const touched = sameLevel(car.model.position, pp) &&
        carCircles(car).some((c) => Math.hypot(c.x - pp.x, c.z - pp.z) < CAR_WIDTH / 2 + BODY_RADIUS);
      if (!touched) continue;

      bumpCar(car, Math.min(1, speed / BUMP_FULL_SPEED));
      car.bumpCooldown = 0.4;

      // Le corps est poussé et tourne un peu sur le sol
      ped.vx += car.vx * BUMP_PUSH;
      ped.vz += car.vz * BUMP_PUSH;
      ped.model.rotation.y += (Math.random() - 0.5) * 2;
      break;
    }
  }

  // --- Contre les bâtiments : rien ne traverse ---
  for (const car of vehicles) hitWallCar(car);
  for (const ped of pedestrians) {
    const wall = hitBuildings(ped.model.position, PED_RADIUS);
    // Un piéton projeté rebondit contre le mur (en marchant, il est juste arrêté)
    if (wall && ped.state !== 'walking') bounceOffWall(ped, wall, PED_BOUNCE);
  }
}

// Une voiture contre les murs : elle est bloquée, et s'accidente si elle tape fort
function hitWallCar(car) {
  const pos = car.model.position;
  for (const c of carCircles(car)) {
    const circle = { x: c.x, y: c.y, z: c.z };
    const wall = hitBuildings(circle, CAR_WIDTH / 2);
    if (!wall) continue;

    // On déplace toute la voiture de ce dont le cercle a été repoussé
    pos.x += circle.x - c.x;
    pos.z += circle.z - c.z;

    const slide = car.vx * -wall.nz + car.vz * wall.nx; // glissement le long du mur
    // Choc fort = accident. Choc léger = elle frotte contre le mur, c'est tout.
    const impact = bounceOffWall(car, wall, CRASH_BOUNCE);
    if (impact >= CRASH_MIN_SPEED && car.immunity <= 0) crashCar(car, slide * CRASH_SPIN, impact);
  }
}

// Choc entre deux voitures de même poids, comme deux boules de billard un peu molles
export function hitCars(a, b) {
  const pa = a.model.position;
  const pb = b.model.position;
  if (!sameLevel(pa, pb)) return; // l'une sur le pont, l'autre en bas : elles ne se touchent pas

  // Les deux cercles les plus proches (un de chaque voiture) donnent le point de choc
  let distance = Infinity, dx = 0, dz = 0;
  for (const ca of carCircles(a)) {
    for (const cb of carCircles(b)) {
      const d = Math.hypot(cb.x - ca.x, cb.z - ca.z);
      if (d < distance) { distance = d; dx = cb.x - ca.x; dz = cb.z - ca.z; }
    }
  }
  if (distance >= CAR_WIDTH) return; // pas de contact

  // n = direction de a vers b (au hasard si elles sont pile au même endroit)
  const nx = distance > 0 ? dx / distance : 1;
  const nz = distance > 0 ? dz / distance : 0;

  // 1. On les écarte pour qu'elles ne restent pas l'une dans l'autre
  const push = (CAR_WIDTH - distance) / 2;
  pa.x -= nx * push; pa.z -= nz * push;
  pb.x += nx * push; pb.z += nz * push;

  // Une voiture qui vient de redémarrer est poussée, mais ne s'accidente pas
  if (a.immunity > 0 || b.immunity > 0) return;

  // 2. Vitesse d'impact : à quelle vitesse elles se rapprochent l'une de l'autre
  const rvx = b.vx - a.vx;
  const rvz = b.vz - a.vz;
  const impact = -(rvx * nx + rvz * nz);
  if (impact < CRASH_MIN_SPEED) return; // elles s'éloignent déjà, ou simple accrochage

  // 3. Échange de vitesse le long du choc : celle qui fonce pousse celle qui est à l'arrêt
  const kick = ((1 + CRASH_BOUNCE) * impact) / 2;
  a.vx -= kick * nx; a.vz -= kick * nz;
  b.vx += kick * nx; b.vz += kick * nz;

  // 4. Un choc de biais (glissement sur le côté) les fait tourner en sens opposés
  const slide = rvx * -nz + rvz * nx;
  crashCar(a, -slide * CRASH_SPIN, impact);
  crashCar(b, slide * CRASH_SPIN, impact);
}

// Centres des 2 cercles d'une voiture : un à l'avant, un à l'arrière
function carCircles(car) {
  const p = car.model.position;
  const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
  const half = (CAR_LENGTH - CAR_WIDTH) / 2;
  const fx = Math.sin(angle) * half;
  const fz = Math.cos(angle) * half;
  // Dans une montée, l'avant est plus haut : il passe au-dessus du bord du pont
  const fy = -Math.sin(car.model.rotation.x || 0) * half;
  return [{ x: p.x + fx, y: p.y + fy, z: p.z + fz }, { x: p.x - fx, y: p.y - fy, z: p.z - fz }];
}

// Vrai si deux objets sont au même niveau (pas l'un sur un pont et l'autre en bas)
function sameLevel(a, b) {
  return Math.abs(a.y - b.y) < BRIDGE_HEIGHT * 0.6;
}
