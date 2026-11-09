import {
  TILE_SIZE, PED_RADIUS, PED_SPEED,
  LAUNCH_FACTOR, LAUNCH_UP, GRAVITY, PED_RESPAWN,
} from './config.js';
import { placeModel } from './city.js';
import { isRoad, DIRECTIONS, randomRoadCell } from './map.js';

export const pedestrians = [];

// Si le personnage marche de travers ou à reculons : 0, Math.PI / 2, Math.PI, -Math.PI / 2
const HEADING_OFFSET = 0;

// Ajoute un personnage qui marche au hasard sur les routes.
//  - pack : dossier du pack (ex : 'characters')
//  - name : fichier sans .glb (ex : 'character-a')
export async function addPedestrian(scene, pack, name, col, row) {
  // placeModel charge le modèle et applique l'échelle du pack
  const model = await placeModel(scene, pack, name, col, row);

  // Ordre 'YXZ' : quand il tombe, il bascule dans le sens où il regarde
  model.rotation.order = 'YXZ';

  const ped = {
    model, pack, name, col, row,
    baseY: model.position.y, // hauteur de pose (vient de config.js)
    nextCol: col, nextRow: row, dir: null,
    state: 'walking', // 'walking', 'flying' (projeté), 'down' (au sol)
    vx: 0, vy: 0, vz: 0,
    spinX: 0,
    timer: 0,
  };
  chooseNext(ped);
  pedestrians.push(ped);
}

// Choix aléatoire parmi les routes voisines (sans demi-tour si possible)
function chooseNext(ped) {
  let options = DIRECTIONS.filter((d) => isRoad(ped.col + d.dc, ped.row + d.dr));

  if (ped.dir) {
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

  // Le personnage se tourne vers là où il va
  ped.model.rotation.y = Math.atan2(choice.dc, choice.dr) + HEADING_OFFSET;
}

// Projette le piéton : (dirX, dirZ) = direction de la voiture, power = sa vitesse
export function launchPedestrian(ped, dirX, dirZ, power) {
  if (ped.state !== 'walking') return;
  ped.state = 'flying';
  ped.vx = dirX * power * LAUNCH_FACTOR;
  ped.vz = dirZ * power * LAUNCH_FACTOR;
  ped.vy = LAUNCH_UP;
  ped.spinX = 8 + Math.random() * 4;
}

// Le piéton réapparaît debout sur une route au hasard
function respawn(ped) {
  const cell = randomRoadCell();
  ped.col = cell.col;
  ped.row = cell.row;
  ped.model.position.set(cell.col * TILE_SIZE, ped.baseY, cell.row * TILE_SIZE);
  ped.model.rotation.set(0, 0, 0);
  ped.state = 'walking';
  ped.dir = null;
  chooseNext(ped);
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

      // Atterrissage : il tombe au sol, couché
      if (pos.y <= ped.baseY) {
        pos.y = ped.baseY;
        ped.model.rotation.x = -Math.PI / 2; // si il tombe sur le dos, mets Math.PI / 2
        ped.state = 'down';
        ped.timer = PED_RESPAWN;
      }
    } else if (ped.state === 'down') {
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      const friction = Math.max(0, 1 - 6 * delta);
      ped.vx *= friction;
      ped.vz *= friction;

      ped.timer -= delta;
      if (ped.timer <= 0) respawn(ped);
    } else {
      // Marche vers la case suivante
      const targetX = ped.nextCol * TILE_SIZE;
      const targetZ = ped.nextRow * TILE_SIZE;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const distance = Math.hypot(dx, dz);
      const step = PED_SPEED * delta;

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
    }
  }
}