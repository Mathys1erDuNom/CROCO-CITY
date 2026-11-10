import * as THREE from 'three';
import { createScene, updateCamera } from './scene.js';
import { loadModel } from './loader.js';
import { addBuilding } from './buildings.js';
import { addVehicle, updateVehicles } from './vehicles.js';
import { drawRoads } from './roads.js';
import { COLS, ROWS } from './map.js';
import { TILE_SIZE } from './config.js';
import { addPedestrian, updatePedestrians } from './pedestrians.js';
import { checkCollisions } from './collisions.js';
import { updateEffects } from './effects.js';

const { scene, camera, renderer, controls } = createScene();

// La caméra regarde le centre de la ville au démarrage
const center = new THREE.Vector3(((COLS - 1) / 2) * TILE_SIZE, 0, ((ROWS - 1) / 2) * TILE_SIZE);
controls.target.copy(center);
camera.position.set(center.x, 12, center.z + 12);

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
  await drawRoads(scene);

  // Bâtiments sur des cases d'herbe (0 dans la carte)
  // addBuilding = placeModel + collisions (rien ne traverse)
  
  await addBuilding(scene, 'suburban', 'building-type-b', 1, 0, { rotation: 2 });  // rotation 90°
  await addBuilding(scene, 'commercial', 'building-skyscraper-a', 3, 0, { rotation: 2 }); // rotation 180°

  // Voitures : elles démarrent sur une case de route (1 dans la carte)
  await addVehicle(scene, 'cars', 'ambulance', 3, 3, 'fast');  // style : 'calm', 'fast' ou 'drunk'
  await addVehicle(scene, 'cars', 'taxi', 13, 8, 'drunk');
  await addVehicle(scene, 'cars', 'taxi', 8, 8, 'calm');

  // Quelques piéton sur des cases de route
    // Personnages : pack, nom du fichier SANS .glb, colonne, ligne
  await addPedestrian(scene, 'characters', 'character-alien', 3, 3, 'crazy');      // style : 'crazy', 'calm', 'distracted' ou 'fighter'
  await addPedestrian(scene, 'characters', 'character-female-a', 5, 6, 'distracted');
  await addPedestrian(scene, 'characters', 'character-male-b', 1, 0, 'calm');
  await addPedestrian(scene, 'characters', 'character-zombie', 1, 5, 'fighter');


  //await addPedestrian(scene, 'characters', 'aid_hearing.glb', 3, 3);
  
}
buildCity();


// L'horloge mesure le temps entre deux images
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // secondes depuis la dernière image
  updateVehicles(delta);          // fait avancer les voitures
  updatePedestrians(delta);       // ← fait marcher les piétons
  updateEffects(delta);           // fumée et flammes
  checkCollisions();              // ← détecte les chocs (toujours APRÈS les déplacements)

  updateCamera(camera, controls, delta); // clavier + souris
  renderer.render(scene, camera);
}
animate();