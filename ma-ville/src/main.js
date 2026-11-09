import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadModel } from './loader.js';
import { placeModel } from './city.js';
import { addVehicle, updateVehicles } from './vehicles.js';
import { drawRoads } from './roads.js';
import { COLS, ROWS } from './map.js';
import { TILE_SIZE } from './config.js';

const { scene, camera, renderer, controls } = createScene();

// Le sol couvre exactement la carte, centré sur elle
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(COLS * TILE_SIZE, ROWS * TILE_SIZE),
  new THREE.MeshStandardMaterial({ color: 0x6aa84f })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(((COLS - 1) / 2) * TILE_SIZE, 0, ((ROWS - 1) / 2) * TILE_SIZE);
scene.add(ground);

// Un plan est vertical par défaut : on le couche à plat
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

async function buildCity() {
  drawRoads(scene);

  // Bâtiments sur des cases d'herbe (0 dans la carte)
  //await placeModel(scene, 'suburban', 'building-type-a', 2, 3);
  await placeModel(scene, 'suburban', 'building-type-b', 1, 0);

  // Voitures : elles démarrent sur une case de route (1 dans la carte)
  await addVehicle(scene, 'cars', 'ambulance', 0, 0, 3);
  await addVehicle(scene, 'cars', 'taxi', 4, 3, 2); // un autre modèle, à adapter
}
buildCity();


// L'horloge mesure le temps entre deux images
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // secondes depuis la dernière image
  updateVehicles(delta);          // ← fait avancer les véhicules

  controls.update();
  renderer.render(scene, camera);
}
animate();