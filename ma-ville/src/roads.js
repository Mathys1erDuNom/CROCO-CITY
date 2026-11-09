import * as THREE from 'three';
import { TILE_SIZE } from './config.js';
import { MAP } from './map.js';

// Dessine un carré gris sur chaque case de route.
export function drawRoads(scene) {
  const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
  const material = new THREE.MeshStandardMaterial({ color: 0x444444 });

  MAP.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (cell !== 1) return; // pas une route : on passe

      const road = new THREE.Mesh(geometry, material);
      road.rotation.x = -Math.PI / 2;                 // à plat
      road.position.set(col * TILE_SIZE, 0.01, row * TILE_SIZE); // 0.01 : juste au-dessus du sol
      scene.add(road);
    });
  });
}