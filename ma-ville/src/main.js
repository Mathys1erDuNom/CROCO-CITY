import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadModel } from './loader.js';
import { placeModel } from './city.js';

const { scene, camera, renderer, controls } = createScene();

// --- Le sol vert ---
// PlaneGeometry(largeur, profondeur) crée un plan plat
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x6aa84f })
);

// Un plan est vertical par défaut : on le couche à plat
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// --- Les bâtiments ---
async function buildCity() {
  await placeModel(scene, 'suburban', 'building-type-a', 0, 0);
  await placeModel(scene, 'suburban', 'building-type-b', 1, 0);
  // plus tard :
  await placeModel(scene, 'cars', 'ambulance', 3, 1);
}
buildCity();


function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();