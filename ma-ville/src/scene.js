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

// À appeler à chaque image : déplace la caméra ET le point qu'elle regarde, à plat sur le sol
export function updateCamera(camera, controls, delta) {
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
}
