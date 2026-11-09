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