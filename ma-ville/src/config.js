// =========================================
// Réglages globaux de la ville
// =========================================

// Taille d'une case de la grille (en unités three.js)
export const TILE_SIZE = 2;

// --- Réglages par pack Kenney ---
//  - scale : échelle (1 = taille d'origine)
//  - y     : hauteur de pose
export const PACK_SETTINGS = {
  suburban: { scale: 1, y: 0 },
  cars: { scale: 0.5, y: 0.1 },
  characters: { scale: 1, y: 0 }
};

// Utilisé si un pack n'est pas listé ci-dessus
export const DEFAULT_SETTINGS = { scale: 1, y: 0 };

// --- Voitures ---
// Si la voiture roule de travers ou en marche arrière :
// 0, Math.PI / 2, Math.PI ou -Math.PI / 2
export const CAR_HEADING_OFFSET = 0;

// Distance devant la voiture à partir de laquelle elle freine
export const SAFE_DISTANCE = TILE_SIZE * 0.6;
// Demi-largeur de la zone surveillée (gauche et droite)
export const SAFE_WIDTH = TILE_SIZE * 0.3;
// Après ce temps d'attente (secondes), la voiture repart quand même
export const MAX_WAIT = 3;

// --- Collisions ---
export const CAR_RADIUS = TILE_SIZE * 0.25;    // "taille" d'une voiture pour les chocs
export const PED_RADIUS = TILE_SIZE * 0.06;    // "taille" d'un piéton
export const CRASH_DURATION = 2.5;             // secondes d'immobilisation après un choc
export const CRASH_KNOCKBACK = TILE_SIZE * 2;  // force du rebond entre deux voitures
export const CRASH_IMMUNITY = 1.5;             // secondes sans collision après être reparti

// --- Piéton ---
export const PED_SPEED = TILE_SIZE * 0.4;      // vitesse de marche
export const LAUNCH_FACTOR = 2.5;              // vitesse de projection = vitesse voiture x ce facteur
export const LAUNCH_UP = 6;                    // vitesse initiale vers le haut
export const GRAVITY = 20;
export const PED_RESPAWN = 3;                  // secondes au sol avant de réapparaître