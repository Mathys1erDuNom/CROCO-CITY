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