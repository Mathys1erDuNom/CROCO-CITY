import { addBuilding } from '../buildings.js';
import { placeModel } from '../city.js';
import { addVehicle } from '../vehicles.js';
import { addPedestrian } from '../pedestrians.js';

// Tout ce qui est posé sur la carte 2 (maps/map2.js) : un quartier de maisons, ses voitures et ses habitants.
// Chaque chargement est ajouté à "jobs" : main.js attend qu'ils soient tous finis.
export default function city2(scene, jobs) {
  // MAISONS : [lettre du modèle (building-type-?), col, row, rotation]
  // rotation = côté de la façade : 0 nord, 1 ouest, 2 sud, 3 est (elle regarde sa rue).
  // Une maison bloque les cases qu'elle recouvre : posées sur des demi-colonnes (x.75, x.25) et des lignes entières,
  // elles ne mordent pas sur les routes et laissent une allée d'herbe libre derrière elles (lignes 3, 7 et 11).
  [
    ['a', 2.75, 2, 0], ['e', 4.25, 2, 0], ['h', 2.75, 4, 2], ['c', 4.25, 4, 2],
    ['o', 7.75, 2, 0], ['j', 9.25, 2, 0], ['i', 7.75, 4, 2], ['p', 9.25, 4, 2],
    ['q', 12.75, 2, 0], ['a', 14.25, 2, 0], ['e', 12.75, 4, 2], ['h', 14.25, 4, 2],
    ['c', 2.75, 6, 0], ['i', 4.5, 6, 0], ['p', 6.25, 6, 0], ['o', 2.75, 8, 2],
    ['j', 4.5, 8, 2], ['q', 6.25, 8, 2], ['h', 9.75, 6, 0], ['a', 11.25, 6, 0],
    ['e', 9.75, 8, 2], ['c', 11.25, 8, 2], ['f', 14.5, 7, 1], ['p', 2.75, 10, 0],
    ['e', 4.25, 10, 0], ['a', 2.75, 12, 2], ['o', 4.25, 12, 2], ['c', 7.75, 10, 0],
    ['h', 9.25, 10, 0], ['q', 7.75, 12, 2], ['i', 9.25, 12, 2], ['j', 12.75, 10, 0],
    ['o', 14.25, 10, 0], ['p', 12.75, 12, 2], ['a', 14.25, 12, 2], ['l', 17.5, 3, 1],
    ['k', 17.5, 5.5, 1], ['r', 17.5, 8, 1], ['l', 17.5, 10.5, 1],
  ].forEach(([type, col, row, rotation]) =>
    jobs.push(addBuilding(scene, 'suburban', `building-type-${type}`, col, row, { rotation })));

  // ARBRES : [col, row], un petit arbre sur trois
  [
    [4, 3], [9, 3], [14, 3], [5, 7], [11, 7], [4, 11], [8.6, 11],
    [13.4, 11], [19.4, 2.4], [20, 4.6], [19.5, 7.2], [20.1, 9.4], [19.4, 11.6],
  ].forEach(([col, row], i) =>
    jobs.push(addBuilding(scene, 'suburban', i % 3 ? 'tree-large' : 'tree-small', col, row, { rotation: i % 4 })));

  // BARRIÈRES entre les jardins du côté est : [col, row, nombre], posées côte à côte vers la droite
  [[17.2, 4.25, 6], [17.2, 6.75, 6], [17.2, 9.25, 6]].forEach(([col, row, n]) => {
    for (let i = 0; i < n; i++) jobs.push(addBuilding(scene, 'suburban', 'fence', col + i * 0.4, row, { rotation: 2 }));
  });

  // DÉCOR (placeModel : rien ne s'y cogne et aucune case n'est bloquée)
  // Lampadaires : poteau à 0.42 case du milieu de la route, rotation = sens du bras (0 nord, 1 ouest, 2 sud, 3 est)
  const lights = (list, rotation) => list.forEach(([col, row]) =>
    jobs.push(placeModel(scene, 'roads', 'light-square', col, row, { rotation })));
  lights([3, 8, 13, 18].map((col) => [col, 0.58]), 2);   // rue du haut (row 1)
  lights([3, 8, 13, 18].map((col) => [col, 13.42]), 0);  // rue du bas (row 13)
  lights([3, 7, 11].map((row) => [0.58, row]), 3);       // rue de gauche (col 1)
  lights([4, 10].map((col) => [col, 5.42]), 0);          // rues du milieu (rows 5 et 9)
  lights([5, 11].map((col) => [col, 8.58]), 2);
  // Panneau d'autoroute au-dessus de la rue du haut, avant la rampe
  jobs.push(placeModel(scene, 'roads', 'sign-highway-wide', 19, 1));
  // Cônes de chantier au bord de la rue du bas
  [[8.2, 13.46], [8.5, 13.46], [8.8, 13.46]].forEach(([col, row]) =>
    jobs.push(placeModel(scene, 'roads', 'construction-cone', col, row)));

  // VOITURES : [modèle, col, row, style]
  // style : 'calm', 'fast', 'drunk', 'ambulance' (va chercher les piétons morts puis revient à sa case de départ) ou 'tow' (pareil pour les voitures en feu)
  [
    ['taxi', 3, 1, 'calm'], ['sedan', 9, 5, 'calm'], ['suv', 1, 7, 'calm'],
    ['van', 13, 8, 'calm'], ['delivery', 16, 11, 'calm'], ['truck', 10, 13, 'calm'],
    ['garbage-truck', 4, 9, 'calm'], ['sedan-sports', 19, 1, 'calm'], ['suv-luxury', 11, 3, 'calm'],
    ['police', 6, 3, 'fast'], ['police', 16, 7, 'fast'], ['ambulance', 12, 13, 'ambulance'],
    ['tow-truck', 3, 13, 'tow'],
  ].forEach(([name, col, row, style]) => jobs.push(addVehicle(scene, 'cars', name, col, row, style)));

  // PNJ : [modèle (character-?), col, row, style]
  // style : 'crazy', 'calm' (reste dans l'herbe), 'distracted', 'fighter' ou 'police'
  [
    ['male-b', 3, 3, 'calm'], ['female-c', 8, 3, 'calm'], ['male-d', 13, 3, 'calm'],
    ['female-d', 3, 7, 'calm'], ['male-a', 10, 7, 'calm'], ['female-b', 3, 11, 'calm'],
    ['male-e', 14, 11, 'calm'], ['female-f', 20, 6, 'calm'], ['worker', 10, 0, 'calm'],
    ['male-g', 0, 10, 'calm'], ['female-a', 2, 7, 'distracted'], ['female-e', 10, 11, 'distracted'],
    ['robot', 15, 3, 'distracted'], ['alien', 7, 7, 'crazy'], ['zombie', 15, 11, 'fighter'],
    ['raider', 19, 10, 'fighter'], ['male-c', 0, 3, 'police'], ['male-c', 12, 7, 'police'],
  ].forEach(([name, col, row, style]) => jobs.push(addPedestrian(scene, 'characters', `character-${name}`, col, row, style)));
}
