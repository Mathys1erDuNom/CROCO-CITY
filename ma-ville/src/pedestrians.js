import * as THREE from 'three';
import {
  TILE_SIZE, PED_RADIUS, PED_SPEED,
  LAUNCH_FACTOR, LAUNCH_UP, GRAVITY, PED_RESPAWN,
} from './config.js';
import { isRoad, DIRECTIONS, randomRoadCell } from './map.js';

export const pedestrians = [];

// Dimensions de la capsule provisoire
const BODY_LENGTH = TILE_SIZE * 0.2;
const STANDING_Y = BODY_LENGTH / 2 + PED_RADIUS; // hauteur du centre quand il est debout

// Ajoute un piéton qui marche au hasard sur les routes
export function addPedestrian(scene, col, row) {
  // Capsule jaune provisoire : à remplacer plus tard par un vrai modèle
  const model = new THREE.Mesh(
    new THREE.CapsuleGeometry(PED_RADIUS, BODY_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  );
  model.castShadow = true;
  model.position.set(col * TILE_SIZE, STANDING_Y, row * TILE_SIZE);
  scene.add(model);

  const ped = {
    model, col, row,
    nextCol: col, nextRow: row, dir: null,
    state: 'walking', // 'walking' (marche), 'flying' (projeté), 'down' (au sol)
    vx: 0, vy: 0, vz: 0, // vitesse pendant la projection
    spinX: 0,            // rotation pendant le vol
    timer: 0,            // temps restant au sol
  };
  chooseNext(ped);
  pedestrians.push(ped);
}

// Même logique que les voitures : choix aléatoire parmi les routes voisines
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
}

// Projette le piéton : (dirX, dirZ) = direction de la voiture, power = sa vitesse
export function launchPedestrian(ped, dirX, dirZ, power) {
  if (ped.state !== 'walking') return;
  ped.state = 'flying';
  ped.vx = dirX * power * LAUNCH_FACTOR;
  ped.vz = dirZ * power * LAUNCH_FACTOR;
  ped.vy = LAUNCH_UP;                      // vers le haut
  ped.spinX = 8 + Math.random() * 4;       // il tourne sur lui-même
}

// Fait réapparaître le piéton, debout, sur une route au hasard
function respawn(ped) {
  const cell = randomRoadCell();
  ped.col = cell.col;
  ped.row = cell.row;
  ped.model.position.set(cell.col * TILE_SIZE, STANDING_Y, cell.row * TILE_SIZE);
  ped.model.rotation.set(0, 0, 0);
  ped.state = 'walking';
  ped.dir = null;
  chooseNext(ped);
}

export function updatePedestrians(delta) {
  for (const ped of pedestrians) {
    const pos = ped.model.position;

    if (ped.state === 'flying') {
      // Déplacement + gravité
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      pos.y += ped.vy * delta;
      ped.vy -= GRAVITY * delta;
      ped.model.rotation.x += ped.spinX * delta;

      // Atterrissage : il tombe au sol, couché
      if (pos.y <= PED_RADIUS) {
        pos.y = PED_RADIUS;
        ped.model.rotation.x = Math.PI / 2;
        ped.state = 'down';
        ped.timer = PED_RESPAWN;
      }
    } else if (ped.state === 'down') {
      // Il glisse un peu, ralentit, puis réapparaît
      pos.x += ped.vx * delta;
      pos.z += ped.vz * delta;
      const friction = Math.max(0, 1 - 6 * delta);
      ped.vx *= friction;
      ped.vz *= friction;

      ped.timer -= delta;
      if (ped.timer <= 0) respawn(ped);
    } else {
      // Marche vers la case suivante (comme une voiture, en plus lent)
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