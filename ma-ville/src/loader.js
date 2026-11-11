import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map(); // url → promesse du modèle : chaque fichier n'est téléchargé et décodé qu'une fois

// pack : le dossier (ex : 'suburban', 'cars')
// name : le fichier sans .glb
export async function loadModel(pack, name) {
  const url = `/models/${pack}/${name}.glb`;
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  // Chaque appel reçoit sa propre copie (géométrie et matériaux restent partagés)
  return (await cache.get(url)).scene.clone();
}
