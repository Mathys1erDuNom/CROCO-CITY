// La carte de la ville : 0 = herbe, 1 = route.
// Chaque ligne du tableau est une ligne de la grille (row),
// chaque chiffre est une colonne (col).
export const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

export const ROWS = MAP.length;
export const COLS = MAP[0].length;

// Vrai si la case (col, row) est une route.
// Hors de la carte, la réponse est "non" : c'est ce qui garde les voitures dans la zone.
export function isRoad(col, row) {
  return MAP[row]?.[col] === 1;
}

// Les 4 directions possibles (dc = colonnes, dr = lignes).
// Déplacées ici pour être partagées entre voitures et piétons.
export const DIRECTIONS = [
  { dc: 0, dr: -1 }, // haut
  { dc: 1, dr: 0 },  // droite
  { dc: 0, dr: 1 },  // bas
  { dc: -1, dr: 0 }, // gauche
];

// Renvoie une case de route au hasard, par exemple { col: 3, row: 0 }
export function randomRoadCell() {
  const cells = [];
  MAP.forEach((line, row) =>
    line.forEach((cell, col) => {
      if (cell === 1) cells.push({ col, row });
    })
  );
  return cells[Math.floor(Math.random() * cells.length)];
}