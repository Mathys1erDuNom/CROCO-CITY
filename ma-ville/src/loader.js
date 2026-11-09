import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// pack : le dossier (ex : 'suburban', 'cars')
// name : le fichier sans .glb
export async function loadModel(pack, name) {
  const gltf = await loader.loadAsync(`/models/${pack}/${name}.glb`);
  return gltf.scene;
}