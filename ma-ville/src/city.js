import { TILE_SIZE, PACK_SETTINGS, DEFAULT_SETTINGS } from './config.js';
import { loadModel } from './loader.js';

// Place un modèle sur la grille.
// Les réglages du pack (scale, y) sont appliqués automatiquement.
// options (facultatif) permet de les remplacer pour UN objet :
//  - rotation : quarts de tour (0, 1, 2, 3)
//  - scale, y : remplacent ceux du pack
export async function placeModel(scene, pack, name, col, row, options = {}) {
  // 1. On prend les réglages du pack, puis "options" peut les remplacer
  const settings = {
    ...DEFAULT_SETTINGS,
    ...PACK_SETTINGS[pack],
    ...options,
  };
  const { rotation = 0, scale, y } = settings;

  // 2. On charge et on place le modèle
  const model = await loadModel(pack, name);
  model.scale.setScalar(scale);
  model.position.set(col * TILE_SIZE, y, row * TILE_SIZE);
  model.rotation.y = rotation * (Math.PI / 2);

  scene.add(model);
}