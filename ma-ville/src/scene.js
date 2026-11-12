import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Sans lumière, on ne voit rien
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(10, 20, 5);
  scene.add(sun);

  // Souris : clic gauche = tourner, molette = zoomer, clic droit = se déplacer
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;      // mouvements adoucis
  controls.screenSpacePanning = false; // le clic droit glisse sur le sol (au lieu de monter/descendre)
  controls.minDistance = 2;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // ne passe pas sous le sol

  // La fenêtre change de taille : l'image suit
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}

// --- Déplacement au clavier ---
// event.code = position de la touche : ZQSD sur un clavier AZERTY, WASD en QWERTY. Flèches aussi.
const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear()); // la fenêtre perd le focus : on lâche tout

const MOVE = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

// --- Caméra fixée sur un personnage ou une voiture ---
const FOLLOW_DISTANCE = 6; // distance de la caméra au moment où on choisit une cible (la molette zoome ensuite)
const EYE_LEVEL = 0.95;    // vue embarquée : hauteur des yeux (1 = tout en haut du modèle)
const EYE_TURN = 6;        // vue embarquée : vitesse à laquelle le regard suit les virages (plus grand = plus sec)
let followed = null;       // le modèle suivi, ou null = caméra libre
let headingOffset = 0;     // écart entre rotation.y du modèle et la direction où il regarde
let eyeHeight = 0;         // hauteur des yeux du modèle suivi
let firstPerson = false;   // true = on voit ce qu'il voit, false = on tourne autour de lui
let eyeAngle = null;       // direction du regard, adoucie (null = à recaler sur le modèle)
const orbitOffset = new THREE.Vector3(0, 4, 4.5); // place de la caméra autour de la cible, gardée pendant la vue embarquée

// Fixe la caméra sur un modèle (null = retour à la caméra libre, là où elle se trouve).
// heading : écart entre rotation.y du modèle et la direction où il regarde (CAR_HEADING_OFFSET pour une voiture)
export function follow(model, camera, controls, heading = 0) {
  const previous = followed;
  const wasInside = previous && firstPerson;
  if (!wasInside) orbitOffset.copy(camera.position).sub(controls.target);
  followed = model;
  headingOffset = heading;
  eyeAngle = null;
  if (model) {
    const top = new THREE.Box3().setFromObject(model).max.y;
    eyeHeight = (top - model.position.y) * EYE_LEVEL;
  } else {
    firstPerson = false;
  }
  placeAround(wasInside ? previous : null, camera, controls);
}

// Passe de la vue autour de la cible à la vue embarquée (ce que voit le personnage ou la voiture), et inversement.
// Renvoie true si la vue embarquée est active (impossible en caméra libre).
export function setFirstPerson(on, camera, controls) {
  if (!followed || on === firstPerson) return firstPerson;
  if (on) orbitOffset.copy(camera.position).sub(controls.target);
  firstPerson = on;
  eyeAngle = null;
  placeAround(null, camera, controls);
  return firstPerson;
}

// Remet la caméra autour de la cible (ou de "left", celle qu'on vient de quitter en vue embarquée)
function placeAround(left, camera, controls) {
  controls.enabled = !firstPerson; // en vue embarquée, la souris ne bouge plus la caméra
  controls.enablePan = !followed;  // en suivi, on tourne et on zoome, mais on ne se déplace plus
  const center = firstPerson ? null : followed ?? left;
  if (!center) return;
  // Elle se rapproche en gardant l'angle de vue d'avant
  controls.target.copy(center.position);
  camera.position.copy(center.position).add(orbitOffset.clone().setLength(FOLLOW_DISTANCE));
}

// À appeler à chaque image : déplace la caméra ET le point qu'elle regarde, à plat sur le sol.
// Renvoie le modèle suivi (null en caméra libre).
export function updateCamera(camera, controls, delta) {
  // La cible a disparu (piéton emporté, voiture coulée) : retour à la caméra libre
  if (followed && (!followed.parent || !followed.visible)) follow(null, camera, controls);
  if (followed && firstPerson) {
    // Vue embarquée : la caméra est à la place des yeux et regarde là où le modèle regarde
    const p = followed.position;
    const angle = followed.rotation.y - headingOffset;
    if (eyeAngle === null) eyeAngle = angle;
    let turn = (angle - eyeAngle) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2; // toujours par le chemin le plus court
    if (turn < -Math.PI) turn += Math.PI * 2;
    eyeAngle += turn * Math.min(1, delta * EYE_TURN);
    camera.position.set(p.x, p.y + eyeHeight, p.z);
    camera.lookAt(p.x + Math.sin(eyeAngle) * 10, p.y + eyeHeight - 1, p.z + Math.cos(eyeAngle) * 10); // regard un peu vers le bas
    return followed;
  }
  if (followed) {
    // La caméra et le point regardé se décalent d'autant que la cible : l'angle et le zoom choisis sont gardés
    const shift = followed.position.clone().sub(controls.target);
    camera.position.add(shift);
    controls.target.add(shift);
    controls.update();
    return followed;
  }

  let forward = 0, right = 0;
  for (const code of keys) {
    if (MOVE[code]) { right += MOVE[code][0]; forward += MOVE[code][1]; }
  }
  if (forward || right) {
    // Direction du regard, aplatie sur le sol
    const look = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
    const side = new THREE.Vector3(-look.z, 0, look.x); // la droite de la caméra
    // Plus on est loin (dézoomé), plus on va vite. Shift = encore plus vite.
    const speed = camera.position.distanceTo(controls.target) * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1.2);
    const move = look.multiplyScalar(forward).add(side.multiplyScalar(right)).normalize().multiplyScalar(speed * delta);
    camera.position.add(move);
    controls.target.add(move);
  }
  controls.update();
  return null;
}
