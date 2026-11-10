import { TILE_SIZE, BRIDGE_HEIGHT } from './config.js';

// La carte de la ville : 0 = herbe, 1 = route, 2 = pont (route en hauteur), 3 = eau, 4 = plage.
// Une route (1) collée au bout d'un pont, dans son axe, devient toute seule une rampe.
// Chaque ligne du tableau est une ligne de la grille (row),
// chaque chiffre est une colonne (col).
export const MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [4, 4, 4, 4, 4, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [3, 3, 3, 3, 3, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [3, 3, 3, 3, 3, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [3, 3, 3, 3, 3, 4, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [3, 3, 3, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const ROWS = MAP.length;
export const COLS = MAP[0].length;

// Cases occupées par un bâtiment on ne peut plus y passer
const blockedCells = new Set();
export function blockCell(col, row) {
  blockedCells.add(`${col},${row}`);
}

// Vrai si la case (col, row) est une route libre (pas de bâtiment dessus).
// Hors de la carte, la réponse est "non" : c'est ce qui garde les voitures dans la zone.
export function isRoad(col, row) {
  const v = MAP[row]?.[col];
  return (v === 1 || v === 2) && !blockedCells.has(`${col},${row}`);
}

// Les 4 directions possibles (dc = colonnes, dr = lignes).
// Déplacées ici pour être partagées entre voitures et piétons.
// side : le côté de la case vers lequel on va (N, E, S, W)
export const DIRECTIONS = [
  { dc: 0, dr: -1, side: 'N' }, // haut
  { dc: 1, dr: 0, side: 'E' },  // droite
  { dc: 0, dr: 1, side: 'S' },  // bas
  { dc: -1, dr: 0, side: 'W' }, // gauche
];
export const DIR = Object.fromEntries(DIRECTIONS.map((d) => [d.side, d])); // DIR.N, DIR.E...
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

// Vrai si la case est dans la carte et sans bâtiment (route ou herbe)
export function isFree(col, row) {
  return MAP[row]?.[col] !== undefined && !blockedCells.has(`${col},${row}`);
}

// Vrai si la case est de l'herbe libre
export function isGrass(col, row) {
  return MAP[row]?.[col] === 0 && isFree(col, row);
}

// Eau et plage
export const isWater = (col, row) => MAP[row]?.[col] === 3;
export const isBeach = (col, row) => MAP[row]?.[col] === 4 && isFree(col, row);
// Vrai si le point (x, z) est au-dessus d'une case d'eau
export const isWaterAt = (x, z) => isWater(Math.round(x / TILE_SIZE), Math.round(z / TILE_SIZE));

// --- Ponts et rampes ---

// Si la case est une rampe : le côté qui monte vers le pont (N, E, S ou W). Sinon null.
// Rampe = route (1) avec un seul pont voisin, et aucune route qui arrive sur ses côtés.
export function rampSide(col, row) {
  if (MAP[row]?.[col] !== 1) return null;
  const up = DIRECTIONS.filter((d) => MAP[row + d.dr]?.[col + d.dc] === 2);
  if (up.length !== 1) return null;
  const d = up[0];
  const roadOnSide = DIRECTIONS.some((o) =>
    o.dc * d.dc + o.dr * d.dr === 0 && // perpendiculaire
    [1, 2].includes(MAP[row + o.dr]?.[col + o.dc])
  );
  return roadOnSide ? null : d.side;
}

// Hauteur du sol au bord "side" de la case (null = on ne peut pas passer par là)
function edgeHeight(col, row, side) {
  const v = MAP[row]?.[col];
  if (v === undefined) return null;
  if (v === 2) return BRIDGE_HEIGHT;
  const ramp = rampSide(col, row);
  if (!ramp) return 0;
  if (side === ramp) return BRIDGE_HEIGHT;
  if (side === OPPOSITE[ramp]) return 0;
  return null; // les côtés d'une rampe sont des murs
}

// Vrai si on peut aller de (col, row) vers la case voisine dans la direction d :
// case libre, et les deux bords sont à la même hauteur (pas de saut sur le pont par le côté)
export function canMove(col, row, d) {
  const c = col + d.dc;
  const r = row + d.dr;
  if (!isFree(c, r)) return false;
  const a = edgeHeight(col, row, d.side);
  return a !== null && a === edgeHeight(c, r, OPPOSITE[d.side]);
}

// Hauteur du sol au point (x, z) : 0 par terre, BRIDGE_HEIGHT sur un pont, entre les deux sur une rampe
export function heightAt(x, z) {
  const col = Math.round(x / TILE_SIZE);
  const row = Math.round(z / TILE_SIZE);
  if (MAP[row]?.[col] === 2) return BRIDGE_HEIGHT;
  const ramp = rampSide(col, row);
  if (!ramp) return 0;
  const d = DIR[ramp];
  // 0 au bas de la rampe, 1 en haut (côté pont)
  const t = ((x - col * TILE_SIZE) * d.dc + (z - row * TILE_SIZE) * d.dr) / TILE_SIZE + 0.5;
  return BRIDGE_HEIGHT * Math.min(1, Math.max(0, t));
}

// --- Ronds-points ---
// Centre = route (1) avec une route (1) des 4 côtés. Le modèle fait 3x3 cases : il recouvre
// la case et ses 8 voisines (premier trouvé gagne, pas de chevauchement).
// Calculé une seule fois : la carte ne change pas.
export const ROUNDABOUTS = []; // { col, row } du centre
const roundaboutCells = new Set();
MAP.forEach((line, row) => {
  line.forEach((cell, col) => {
    const isCenter = cell === 1 && !rampSide(col, row) &&
      DIRECTIONS.every((d) => MAP[row + d.dr]?.[col + d.dc] === 1);
    const cells = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => `${col + dc},${row + dr}`));
    if (!isCenter || cells.some((k) => roundaboutCells.has(k))) return;
    cells.forEach((k) => roundaboutCells.add(k));
    ROUNDABOUTS.push({ col, row });
  });
});

// Vrai si la case est recouverte par un rond-point
export function inRoundabout(col, row) {
  return roundaboutCells.has(`${col},${row}`);
}
