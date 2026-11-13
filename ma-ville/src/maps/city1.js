import { addBuilding } from '../buildings.js';
import { placeModel } from '../city.js';
import { addVehicle } from '../vehicles.js';
import { addPedestrian } from '../pedestrians.js';

// Tout ce qui est posé sur la carte 1 (maps/map1.js) : bâtiments, décor, voitures et personnages.
// Chaque chargement est ajouté à "jobs" : main.js attend qu'ils soient tous finis.
export default function city1(scene, jobs) {

  
  
  //Commercial

  // Côté OUEST
  jobs.push(addBuilding(scene, 'commercial', 'building-skyscraper-b', 1.5, -0.2, { rotation: 2 })); // rotation 180°  
  jobs.push(addBuilding(scene, 'commercial', 'building-skyscraper-a', 3.5, -0.2, { rotation: 2 })); // rotation 180°
  jobs.push(addBuilding(scene, 'commercial', 'building-skyscraper-d', 5.5, -0.2, { rotation: 2 })); // rotation 180°

  jobs.push(addBuilding(scene, 'commercial', 'building-i', -0.2, 2, { rotation: 3 })); 
  jobs.push(addBuilding(scene, 'commercial', 'building-c', -0.2, 4, { rotation: 3 })); 
  jobs.push(addBuilding(scene, 'commercial', 'building-skyscraper-e', -0.2, 6, { rotation: 3 })); 


  // MAISON 

  // FENCE = 0.4 distance
  // Ajout de barrière
  // n barrières côte à côte en partant de (col, row). pas = écart entre deux barrières.
  // Horizontale : la ligne avance vers la droite (col augmente, row ne bouge pas)
  const fenceLineHorizontale = (col, row, n, pas = 0.4) => {
    for (let i = 0; i < n; i++) {
      jobs.push(addBuilding(scene, 'suburban', 'fence', col + i * pas, row, { rotation: 2 }));
    }
  };
  // Verticale : la ligne avance vers le bas (row augmente, col ne bouge pas)
  const fenceLineVerticale = (col, row, n, pas = 0.4) => {
    for (let i = 0; i < n; i++) {
      jobs.push(addBuilding(scene, 'suburban', 'fence', col, row + i * pas, { rotation: 1 }));
    }
  };
  // Côté EST
  
  jobs.push(addBuilding(scene, 'suburban', 'building-type-d', 23.1, 1.5, { rotation: 1 }));
  //Fence
  fenceLineHorizontale(22.8, 0.2, 7); // Ligne à droite de la maison
  fenceLineHorizontale(22.8, 3, 7); // Ligne à gauche depuis la maison
  fenceLineVerticale(25.4, 0.42, 7); // Ligne qui relie les deux 
  jobs.push(addBuilding(scene, 'suburban', 'tree-large', 25.1, 2, { rotation: 1 }));
  jobs.push(addBuilding(scene, 'suburban', 'tree-large', 24.1, 2.5, { rotation: 1 }));
  
  
  jobs.push(addBuilding(scene, 'suburban', 'building-type-u', 23.1, 6.5, { rotation: 1 }));
  //Fence
  fenceLineHorizontale(22.8, 5.2, 7); // Ligne à droite de la maison
  fenceLineHorizontale(22.8, 8, 7); // Ligne à gauche depuis la maison
  fenceLineVerticale(25.4, 5.42, 7);// Ligne qui relie les deux 
  
  jobs.push(addBuilding(scene, 'suburban', 'tree-large', 25, 7.4, { rotation: 1 }));
  jobs.push(addBuilding(scene, 'suburban', 'tree-small', 24.2, 5.7, { rotation: 1 }));

  jobs.push(addBuilding(scene, 'suburban', 'building-type-s', 23.1, 10.5, { rotation: 1 }));
  //Fence
  fenceLineHorizontale(22.8, 9.2, 7); // Ligne à droite de la maison
  fenceLineHorizontale(22.8, 12, 7); // Ligne à gauche depuis la maison
  fenceLineVerticale(25.4, 9.42, 7); // Ligne qui relie les deux
  jobs.push(addBuilding(scene, 'suburban', 'tree-large', 24.9, 11.4, { rotation: 1 }));
  jobs.push(addBuilding(scene, 'suburban', 'tree-small', 24.3, 9.8, { rotation: 1 }));


  // CENTRE-VILLE : rangée de commerces au nord de la route du bas (row 13), façade vers la route
  [
    ['building-a', 10, 12], ['building-e', 11.5, 12], ['building-g', 13.1, 12], ['building-k', 14.9, 12],
    ['building-m', 16.9, 11.85], ['building-b', 18.3, 12], ['building-h', 19.5, 12], ['building-d', 20.6, 12],
  ].forEach(([name, col, row]) => jobs.push(addBuilding(scene, 'commercial', name, col, row, { rotation: 2 })));

  // ARBRES : liste de [col, row], un petit arbre sur trois
  const trees = (list) => list.forEach(([col, row], i) =>
    jobs.push(addBuilding(scene, 'suburban', i % 3 ? 'tree-large' : 'tree-small', col, row, { rotation: i % 4 })));
  // Parc (îlot ouest)
  trees([[2.4, 2.4], [4.2, 2.3], [6.6, 2.4], [2.4, 4.2], [6.6, 4], [4.4, 4.4], [2.4, 5.7], [4.3, 5.8], [6.2, 5.4]]);
  // Îlots du centre, de chaque côté du pont
  trees([[10.3, 2.4], [11.6, 5.2], [13.4, 3.1], [14.6, 5.6], [18.4, 2.6], [19.7, 4.8], [20.6, 2.2]]);
  // Derrière les commerces
  trees([[10.6, 8.6], [13.3, 9.4], [15.6, 8.8], [18.2, 9.6], [20.4, 8.7], [14.6, 10.6]]);

  // LAMPADAIRES : simple décor (placeModel, pas addBuilding : un poteau bloquerait la case de route voisine)
  // Le poteau est posé à 0.42 case du milieu de la route, rotation = sens du bras (0 nord, 1 ouest, 2 sud, 3 est)
  const lights = (list, rotation) => list.forEach(([col, row]) =>
    jobs.push(placeModel(scene, 'roads', 'light-square', col, row, { rotation })));

  lights([[2.5, 0.58], [4.5, 0.58], [6.5, 0.58]], 2);                      // route du haut (row 1)
  lights([[0.58, 3], [0.58, 5]], 3);                                       // route de gauche (col 1)
  lights([[2, 7.42], [4, 7.42], [6, 7.42], [10, 7.42]], 0);                // route du milieu (row 7)
  lights([[21.58, 2], [21.58, 4], [21.58, 6], [21.58, 9], [21.58, 11]], 3); // route des maisons (col 22)
  lights([[27.42, 6], [27.42, 8], [27.42, 10], [27.42, 12]], 1);           // route de droite (col 27)
  lights([10, 12, 14, 16, 18, 20, 24, 26].map((col) => [col, 13.42]), 0);  // route du bas (row 13)
  
  

  // Voitures 
  // style : 'calm', 'fast', 'drunk', 'ambulance' (va chercher les piétons morts puis revient à sa case de départ) ou 'tow' (pareil pour les voitures en feu)
  
  jobs.push(addVehicle(scene, 'cars', 'police', 0, 7, 'fast'));  
  jobs.push(addVehicle(scene, 'cars', 'suv', 8, 0, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'police', 1, 4, 'fast'));
  jobs.push(addVehicle(scene, 'cars', 'police', 11, 0, 'fast'));
  jobs.push(addVehicle(scene, 'cars', 'garbage-truck', 8, 8, 'calm'));
  //await addVehicle(scene, 'cars', 'race', 8, 13, 'drunk');
  jobs.push(addVehicle(scene, 'cars', 'taxi', 4, 1, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'truck', 22, 3, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'delivery', 24, 4, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'taxi', 27, 9, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'sedan', 22, 10, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'van', 15, 13, 'calm'));
  jobs.push(addVehicle(scene, 'cars', 'ambulance', 20, 13, 'ambulance'));
  jobs.push(addVehicle(scene, 'cars', 'tow-truck', 5, 7, 'tow')); // dépanneuse : enlève les voitures en feu puis revient ici

  // PNJ
  
  // style : 'crazy', 'calm', 'distracted', 'fighter' ou 'police'
  jobs.push(addPedestrian(scene, 'characters', 'character-alien', 3, 3, 'crazy'));      
  jobs.push(addPedestrian(scene, 'characters', 'character-female-a', 5, 6, 'distracted'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-b', 5, 5, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-zombie', 1, 5, 'fighter'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-a', 2, 12, 'distracted'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-a',3, 10, 'distracted'));

  jobs.push(addPedestrian(scene, 'characters', 'character-raider',12, 10, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-f',8, 10, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-worker',10, 10, 'calm'));

  // Parc
  jobs.push(addPedestrian(scene, 'characters', 'character-female-c', 3, 5, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-d', 6, 3, 'calm'));
  // Centre
  jobs.push(addPedestrian(scene, 'characters', 'character-male-a', 11, 3, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-d', 13, 5, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-e', 19, 3, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-e', 18, 5, 'distracted'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-b', 14, 9, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-c', 17, 10, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-robot', 20, 10, 'distracted'));
  // Quartier des maisons
  jobs.push(addPedestrian(scene, 'characters', 'character-male-c', 26, 6, 'police'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-c', 25, 3, 'police'));
  jobs.push(addPedestrian(scene, 'characters', 'character-male-g', 29, 2, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-f', 29, 3, 'calm'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-a', 28, 4, 'fighter'));
  jobs.push(addPedestrian(scene, 'characters', 'character-female-d', 30, 2, 'fighter'));


  // Animal
  jobs.push(addPedestrian(scene, 'animal', 'crocodile/crocodile', 1, 10, 'crocodile'));
  


  //await addPedestrian(scene, 'characters', 'aid_hearing.glb', 3, 3);
}
