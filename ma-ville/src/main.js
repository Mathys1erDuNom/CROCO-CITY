import * as THREE from 'three';
import { createScene, updateCamera, follow, setFirstPerson } from './scene.js';
import { loadModel } from './loader.js';
import { updateVehicles, vehicles } from './vehicles.js';
import { drawRoads } from './roads.js';
import { COLS, ROWS, MAP, MAP_INDEX, MAP_COUNT } from './map.js';
import city1 from './maps/city1.js';
import city2 from './maps/city2.js';
import { TILE_SIZE, CAR_HEADING_OFFSET } from './config.js';
import { updatePedestrians, pedestrians } from './pedestrians.js';
import { checkCollisions } from './collisions.js';
import { updateEffects } from './effects.js';

const { scene, camera, renderer, controls } = createScene();

// Le contenu de chaque carte, dans le même ordre que GRIDS (map.js)
const CITIES = [city1, city2];

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
  // Tout est lancé en même temps : les téléchargements se font en parallèle au lieu de l'un après l'autre
  const jobs = [drawRoads(scene)];
  CITIES[MAP_INDEX](scene, jobs); // bâtiments, voitures et personnages de la carte choisie
  await Promise.all(jobs);
}


// --- Choix de la caméra ---
// Un bouton "Caméra libre" et deux menus déroulants : un pour fixer la caméra sur un personnage, un pour une voiture.
// Une fois sur une cible, "Vue embarquée" montre ce qu'elle voit (recliquer pour revenir autour d'elle).
const freeButton = document.getElementById('camera-free');
const eyesButton = document.getElementById('camera-eyes');
const cameraLabel = document.getElementById('camera-target');
const cameraMenus = [
  { select: document.getElementById('camera-ped'), list: pedestrians, title: 'Personnage…', targets: [] },
  { select: document.getElementById('camera-car'), list: vehicles, title: 'Voiture…', targets: [] },
];
let cameraTarget = null; // le piéton ou la voiture suivi (null = caméra libre)

// Remplit un menu avec ceux qui sont encore visibles dans la ville (les doublons sont numérotés : "police 2")
function fillMenu(menu) {
  menu.targets = menu.list.filter((t) => t.model.parent && t.model.visible);
  const seen = {};
  const options = menu.targets.map((t, i) => {
    const name = t.name.replace('character-', '').replace('crocodile/', '');
    seen[name] = (seen[name] || 0) + 1;
    return new Option(seen[name] > 1 ? `${name} ${seen[name]}` : name, i, false, t === cameraTarget);
  });
  // Rien de suivi dans ce menu : il affiche son titre
  menu.select.replaceChildren(new Option(menu.title, '', false, !menu.targets.includes(cameraTarget)), ...options);
  menu.select.classList.toggle('active', menu.targets.includes(cameraTarget));
}

function setCamera(target) {
  cameraTarget = target;
  follow(target ? target.model : null, camera, controls, vehicles.includes(target) ? CAR_HEADING_OFFSET : 0);
  freeButton.setAttribute('aria-pressed', String(!target));
  eyesButton.disabled = !target; // pas de vue embarquée sans cible
  if (!target) eyesButton.setAttribute('aria-pressed', 'false');
  cameraMenus.forEach(fillMenu);
  const chosen = cameraMenus.map((m) => m.select.selectedOptions[0]).find((o) => o && o.value !== '');
  cameraLabel.textContent = chosen ? `Suivi : ${chosen.text}` : 'Vue libre';
}

freeButton.addEventListener('click', () => setCamera(null));
eyesButton.addEventListener('click', () => {
  const on = setFirstPerson(eyesButton.getAttribute('aria-pressed') !== 'true', camera, controls);
  eyesButton.setAttribute('aria-pressed', String(on));
});
for (const menu of cameraMenus) {
  // La liste est refaite juste avant que le menu s'ouvre : les disparus n'y sont plus
  menu.select.addEventListener('pointerdown', () => fillMenu(menu));
  menu.select.addEventListener('focus', () => fillMenu(menu));
  menu.select.addEventListener('change', () => setCamera(menu.targets[menu.select.value] ?? null));
  fillMenu(menu);
}

// --- Changement de carte ---
// shortcut: la page est rechargée avec ?map=N (la simulation repart de zéro) ;
// vider la scène et les listes à la main si le changement doit se faire sans rechargement
const mapButton = document.getElementById('map-next');
mapButton.textContent = `Carte ${MAP_INDEX + 1}/${MAP_COUNT} · changer`;
mapButton.addEventListener('click', () => { location.search = `?map=${((MAP_INDEX + 1) % MAP_COUNT) + 1}`; });

// L'horloge mesure le temps entre deux images
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // secondes depuis la dernière image
  updateVehicles(delta);          // fait avancer les voitures
  updatePedestrians(delta);       // ← fait marcher les piétons
  updateEffects(delta);           // fumée et flammes
  checkCollisions();              // ← détecte les chocs (toujours APRÈS les déplacements)

  // clavier + souris, ou suivi d'une cible. Si la cible suivie a disparu, on repasse en caméra libre
  if (!updateCamera(camera, controls, delta) && cameraTarget) setCamera(null);
  renderer.render(scene, camera);
}

// On attend que tous les modèles soient chargés avant d'afficher et d'animer la ville.
// En cas d'erreur de chargement, on démarre quand même avec ce qui a pu être chargé.
buildCity().catch(console.error).then(() => {
  renderer.compile(scene, camera); // prépare les shaders pour éviter la saccade de la 1re image
  document.getElementById('loading').remove();
  animate();
});