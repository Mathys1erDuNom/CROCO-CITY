import * as THREE from 'three';
import { createScene, updateCamera } from './scene.js';
import { loadModel } from './loader.js';
import { addBuilding } from './buildings.js';
import { addVehicle, updateVehicles } from './vehicles.js';
import { drawRoads } from './roads.js';
import { COLS, ROWS, MAP } from './map.js';
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

// Eau (3) et plage (4) : une dalle de couleur posée juste au-dessus de l'herbe
const TERRAIN = {
  3: new THREE.MeshStandardMaterial({ color: 0x3a8fd9 }),
  4: new THREE.MeshStandardMaterial({ color: 0xe8d39a }),
};
const tileGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
MAP.forEach((line, row) => line.forEach((cell, col) => {
  if (!TERRAIN[cell]) return;
  const tile = new THREE.Mesh(tileGeometry, TERRAIN[cell]);
  tile.rotation.x = -Math.PI / 2;
  tile.position.set(col * TILE_SIZE, 0.01, row * TILE_SIZE);
  scene.add(tile);
}));

async function buildCity() {
  await drawRoads(scene);

  
  
  //Commercial

  // Côté OUEST
  await addBuilding(scene, 'commercial', 'building-skyscraper-b', 1.5, -0.2, { rotation: 2 }); // rotation 180°  
  await addBuilding(scene, 'commercial', 'building-skyscraper-a', 3.5, -0.2, { rotation: 2 }); // rotation 180°
  await addBuilding(scene, 'commercial', 'building-skyscraper-d', 5.5, -0.2, { rotation: 2 }); // rotation 180°

  await addBuilding(scene, 'commercial', 'building-i', -0.2, 2, { rotation: 3 }); 
  await addBuilding(scene, 'commercial', 'building-c', -0.2, 4, { rotation: 3 }); 
  await addBuilding(scene, 'commercial', 'building-skyscraper-e', -0.2, 6, { rotation: 3 }); 


  // MAISON 

  // Côté EST
  await addBuilding(scene, 'suburban', 'building-type-b', 23.1, 0.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-d', 23.1, 2.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-a', 23.1, 4.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-u', 23.1, 6.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-o', 23.1, 8.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-s', 23.1, 10.5, { rotation: 1 });
  await addBuilding(scene, 'suburban', 'building-type-e', 23.1, 12.5, { rotation: 1 });
  

  // Voitures 
  // style : 'calm', 'fast' ou 'drunk'
  
  await addVehicle(scene, 'cars', 'police', 0, 7, 'fast');  
  await addVehicle(scene, 'cars', 'suv', 8, 0, 'calm');
  await addVehicle(scene, 'cars', 'police', 1, 4, 'fast');
  await addVehicle(scene, 'cars', 'police', 11, 0, 'fast');
  await addVehicle(scene, 'cars', 'garbage-truck', 8, 8, 'calm');
  //await addVehicle(scene, 'cars', 'race', 8, 13, 'drunk');

  // PNJ
  // style : 'crazy', 'calm', 'distracted' ou 'fighter'
  await addPedestrian(scene, 'characters', 'character-alien', 3, 3, 'crazy');      
  await addPedestrian(scene, 'characters', 'character-female-a', 5, 6, 'distracted');
  await addPedestrian(scene, 'characters', 'character-male-b', 5, 5, 'calm');
  await addPedestrian(scene, 'characters', 'character-zombie', 1, 5, 'fighter');
  await addPedestrian(scene, 'characters', 'character-female-a', 2, 12, 'distracted');
  await addPedestrian(scene, 'characters', 'character-female-a',3, 10, 'distracted');

  await addPedestrian(scene, 'characters', 'character-raider',12, 10, 'calm');
  await addPedestrian(scene, 'characters', 'character-male-f',8, 10, 'calm');
  await addPedestrian(scene, 'characters', 'character-worker',10, 10, 'calm');


  // Animal
  await addPedestrian(scene, 'animal', 'crocodile/crocodile', 1, 10, 'crocodile');
  


  //await addPedestrian(scene, 'characters', 'aid_hearing.glb', 3, 3);
  
}


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

// On attend que tous les modèles soient chargés avant d'afficher et d'animer la ville.
// En cas d'erreur de chargement, on démarre quand même avec ce qui a pu être chargé.
buildCity().catch(console.error).then(() => {
  renderer.compile(scene, camera); // prépare les shaders pour éviter la saccade de la 1re image
  document.getElementById('loading').remove();
  animate();
});