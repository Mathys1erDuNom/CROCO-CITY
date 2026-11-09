import { TILE_SIZE } from './config.js';
import { loadModel } from './loader.js';

// pack ajouté en 2e paramètre
export async function placeModel(scene, pack, name, col, row, rotation = 0) {
  const model = await loadModel(pack, name);
  model.position.set(col * TILE_SIZE, 0, row * TILE_SIZE);
  model.rotation.y = rotation * (Math.PI / 2);
  scene.add(model);
}