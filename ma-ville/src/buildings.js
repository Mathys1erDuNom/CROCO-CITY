import * as THREE from 'three';
import { TILE_SIZE } from './config.js';
import { placeModel } from './city.js';
import { blockCell } from './map.js';

// Chaque bâtiment = une boîte au sol (son emprise réelle, mesurée sur le modèle)
export const buildings = [];

// Comme placeModel, mais le bâtiment devient un obstacle :
// rien ne le traverse, et plus personne ne passe sur ses cases.
export async function addBuilding(scene, pack, name, col, row, options = {}) {
  const model = await placeModel(scene, pack, name, col, row, options);
  const box = new THREE.Box3().setFromObject(model);
  buildings.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, maxY: box.max.y });

  // Cases recouvertes (0.1 de marge : un bord qui dépasse à peine ne bloque pas la case voisine)
  const m = 0.1;
  for (let c = Math.round((box.min.x + m) / TILE_SIZE); c <= Math.round((box.max.x - m) / TILE_SIZE); c++) {
    for (let r = Math.round((box.min.z + m) / TILE_SIZE); r <= Math.round((box.max.z - m) / TILE_SIZE); r++) {
      blockCell(c, r);
    }
  }
  return model;
}

// Sort un cercle (pos, radius) des bâtiments qu'il touche.
// Renvoie la direction du mur touché { nx, nz } (vers l'extérieur), ou null.
export function hitBuildings(pos, radius) {
  let normal = null;
  for (const b of buildings) {
    if (pos.y > b.maxY) continue; // passe au-dessus du toit

    // Point du bâtiment le plus proche du cercle
    const cx = Math.min(Math.max(pos.x, b.minX), b.maxX);
    const cz = Math.min(Math.max(pos.z, b.minZ), b.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d = Math.hypot(dx, dz);
    if (d >= radius) continue;

    let nx, nz, push;
    if (d > 0) {
      nx = dx / d; nz = dz / d; push = radius - d;
    } else {
      // Centre à l'intérieur : on ressort par le mur le plus proche
      const exits = [
        [pos.x - b.minX, -1, 0], [b.maxX - pos.x, 1, 0],
        [pos.z - b.minZ, 0, -1], [b.maxZ - pos.z, 0, 1],
      ].sort((a, b) => a[0] - b[0]);
      [push, nx, nz] = exits[0];
      push += radius;
    }
    pos.x += nx * push;
    pos.z += nz * push;
    normal = { nx, nz };
  }
  return normal;
}

// Rebond de obj (vx, vz) sur un mur de direction n. Renvoie la vitesse d'impact (0 si il s'éloignait).
export function bounceOffWall(obj, n, bounce) {
  const vn = obj.vx * n.nx + obj.vz * n.nz;
  if (vn >= 0) return 0;
  obj.vx -= (1 + bounce) * vn * n.nx;
  obj.vz -= (1 + bounce) * vn * n.nz;
  return -vn;
}
