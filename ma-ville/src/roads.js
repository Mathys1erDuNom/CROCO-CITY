import { placeModel } from './city.js';
import { buildings } from './buildings.js';
import { TILE_SIZE, BRIDGE_HEIGHT } from './config.js';
import { MAP, DIR, isRoad, canMove, rampSide, ROUNDABOUTS, inRoundabout } from './map.js';

// Côtés, dans l'ordre d'un quart de tour (rotation.y + 90° envoie E→N→W→S)
const SIDES = ['E', 'N', 'W', 'S'];

// Côtés ouverts de chaque modèle SANS rotation (mesurés dans les .glb)
const TILES = {
  'road-crossroad': ['E', 'N', 'W', 'S'],
  'road-intersection': ['E', 'W', 'S'],
  'road-straight': ['E', 'W'],
  'road-bend': ['W', 'S'],
  'road-end': ['E'],
};
const RAMP_HIGH_SIDE = 'E'; // road-slant-high monte vers l'est

// Trouve le modèle + la rotation (quarts de tour) qui ouvre exactement les côtés demandés
export function pickTile(open) {
  const key = SIDES.filter((s) => open.includes(s)).join();
  for (const [name, sides] of Object.entries(TILES)) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const turned = sides.map((s) => SIDES[(SIDES.indexOf(s) + rotation) % 4]);
      if (SIDES.filter((s) => turned.includes(s)).join() === key) return { name, rotation };
    }
  }
  return { name: 'road-square', rotation: 0 }; // case de route isolée
}

// Pose un vrai modèle de route sur chaque case de route, orienté selon ses voisins.
export async function drawRoads(scene) {
  const jobs = [];
  const place = (name, col, row, options) => jobs.push(placeModel(scene, 'roads', name, col, row, options));

  ROUNDABOUTS.forEach(({ col, row }) => place('road-roundabout', col, row));

  MAP.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (!isRoad(col, row) || inRoundabout(col, row)) return;
      // Côtés ouverts = ceux par où on peut vraiment passer (même hauteur des deux côtés)
      const open = SIDES.filter((s) => canMove(col, row, DIR[s]) && isRoad(col + DIR[s].dc, row + DIR[s].dr));

      const ramp = rampSide(col, row);
      if (ramp) {
        place('road-slant-high', col, row, { rotation: SIDES.indexOf(ramp) - SIDES.indexOf(RAMP_HIGH_SIDE) });
        return;
      }
      if (cell !== 2) {
        const tile = pickTile(open);
        place(tile.name, col, row, tile);
        return;
      }

      // Pont : une route posée en hauteur sur un pilier, l'herbe reste visible dessous.
      // (road-bridge de Kenney n'est pas utilisé : il contient une route au sol sous le pont)
      const tile = pickTile(open);
      place(tile.name, col, row, { ...tile, y: BRIDGE_HEIGHT });
      place('bridge-pillar-wide', col, row);
      // Vu d'en bas, le pont est un mur (ce qui roule dessus passe au-dessus : y > maxY)
      buildings.push({
        minX: (col - 0.5) * TILE_SIZE, maxX: (col + 0.5) * TILE_SIZE,
        minZ: (row - 0.5) * TILE_SIZE, maxZ: (row + 0.5) * TILE_SIZE,
        maxY: BRIDGE_HEIGHT * 0.8,
      });
    });
  });
  await Promise.all(jobs);
}
