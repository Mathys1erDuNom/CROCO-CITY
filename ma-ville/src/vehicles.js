import { placeModel } from './city.js';
import { TILE_SIZE, CAR_HEADING_OFFSET } from './config.js';
import { isRoad } from './map.js';

// Les 4 directions possibles, en cases (dc = colonnes, dr = lignes)
const DIRECTIONS = [
  { dc: 0, dr: -1 }, // haut
  { dc: 1, dr: 0 },  // droite
  { dc: 0, dr: 1 },  // bas
  { dc: -1, dr: 0 }, // gauche
];

const vehicles = [];

// Ajoute une voiture qui roule toute seule, à partir de la case (col, row)
// qui doit être une route.
export async function addVehicle(scene, pack, name, col, row, speed = 3) {
  const model = await placeModel(scene, pack, name, col, row);

  const car = { model, col, row, nextCol: col, nextRow: row, dir: null, speed };
  chooseNext(car);
  vehicles.push(car);
}

// La voiture choisit sa prochaine case, au hasard.
function chooseNext(car) {
  // 1. Les directions où il y a une route
  let options = DIRECTIONS.filter((d) => isRoad(car.col + d.dc, car.row + d.dr));

  // 2. On retire le demi-tour (sauf si c'est la seule option)
  if (car.dir) {
    const withoutUTurn = options.filter(
      (d) => !(d.dc === -car.dir.dc && d.dr === -car.dir.dr)
    );
    if (withoutUTurn.length > 0) options = withoutUTurn; // sinon : cul-de-sac, demi-tour
  }

  // 3. Si la voiture est sur une case isolée, elle ne bouge pas
  if (options.length === 0) return;

  // 4. Choix au hasard
  const choice = options[Math.floor(Math.random() * options.length)];
  car.dir = choice;
  car.nextCol = car.col + choice.dc;
  car.nextRow = car.row + choice.dr;

  // 5. On tourne la voiture dans la direction choisie
  car.model.rotation.y = Math.atan2(choice.dc, choice.dr) + CAR_HEADING_OFFSET;
}

// Appelée à chaque image. delta = secondes écoulées depuis la dernière image.
export function updateVehicles(delta) {
  for (const car of vehicles) {
    const pos = car.model.position;

    // Centre de la case visée, en coordonnées 3D
    const targetX = car.nextCol * TILE_SIZE;
    const targetZ = car.nextRow * TILE_SIZE;

    const dx = targetX - pos.x;
    const dz = targetZ - pos.z;
    const distance = Math.hypot(dx, dz);
    const step = car.speed * delta; // distance à parcourir cette image

    if (distance <= step) {
      // Arrivée : on se cale sur la case, puis on choisit la suite
      pos.x = targetX;
      pos.z = targetZ;
      car.col = car.nextCol;
      car.row = car.nextRow;
      chooseNext(car);
    } else {
      // Sinon on avance vers la case visée
      pos.x += (dx / distance) * step;
      pos.z += (dz / distance) * step;
    }
  }
}