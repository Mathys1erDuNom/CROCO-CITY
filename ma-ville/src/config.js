// =========================================
// Réglages globaux de la ville
// =========================================

// Taille d'une case de la grille (en unités three.js)
export const TILE_SIZE = 2;

// Hauteur d'un pont (2 dans la carte) : celle des modèles Kenney road-bridge / road-slant-high
export const BRIDGE_HEIGHT = TILE_SIZE * 0.5;

// --- Réglages par pack Kenney ---
//  - scale : échelle (1 = taille d'origine)
//  - y     : hauteur de pose
export const PACK_SETTINGS = {
  suburban: { scale: 2, y: 0 },
  commercial: { scale: 2, y: 0 },
  cars: { scale: 0.3, y: 0.1 },
  characters: { scale: 0.5, y: 0 },
  roads: { scale: TILE_SIZE, y: 0 }, // tuiles Kenney de 1x1 → 1 case
  animal: { scale: 0.4, y: 0 },      // crocodile : 4.5 de long à l'origine → 1.8 (~1 case)
};

// Utilisé si un pack n'est pas listé ci-dessus
export const DEFAULT_SETTINGS = { scale: 1, y: 0 };

// --- Voitures ---
// Si la voiture roule de travers ou en marche arrière :
// 0, Math.PI / 2, Math.PI ou -Math.PI / 2
export const CAR_HEADING_OFFSET = 0;

// Demi-largeur de la zone surveillée devant la voiture (gauche et droite)
export const SAFE_WIDTH = TILE_SIZE * 0.3;

// --- Styles de conduite (choisis dans addVehicle) ---
//  - speed        : vitesse normale
//  - safeDistance : distance devant à partir de laquelle elle freine
//  - maxWait      : après ce temps bloquée (secondes), elle repart quand même
//  - lane         : décalage vers la droite de la route (0 = roule au milieu)
//  - sway         : écart à gauche/droite quand elle zigzague (0 = roule droit)
//  - swayAngle    : combien elle tourne le nez en zigzaguant (radians)
//  - speedSway    : variation de vitesse (0.5 = entre 50% et 150%)
//  - overtake     : double par la gauche une voiture plus lente (sinon elle reste derrière)
//  - yield        : attend à l'entrée d'un virage ou carrefour occupé (false = fonce, les autres l'attendent quand même)
export const DRIVING_STYLES = {
  calm:  { lane: TILE_SIZE * 0.15, speed: 2,   safeDistance: TILE_SIZE * 2,  maxWait: 5,   sway: 0,                swayAngle: 0,   speedSway: 0,   overtake: true,  yield: true },
  fast:  { lane: TILE_SIZE * 0.15, speed: 5,   safeDistance: TILE_SIZE * 0.9, maxWait: 2, sway: 0,                swayAngle: 0,   speedSway: 0.2, overtake: true,  yield: true },
  drunk: { lane: 0,                speed: 2.5, safeDistance: TILE_SIZE * 0.3,  maxWait: 1,   sway: TILE_SIZE * 0.18, swayAngle: 0.4, speedSway: 0.5, overtake: false, yield: false },
};

// --- Priorité dans les virages et carrefours ---
export const YIELD_MAX_WAIT = 4;                // après ce temps à attendre l'entrée (secondes), elle y va quand même

// --- Dépassement ---
export const OVERTAKE_LANE = TILE_SIZE * 0.15;  // écart vers la gauche pendant un dépassement (voie d'en face)
export const OVERTAKE_BOOST = 1.5;              // elle accélère pour doubler (x sa vitesse normale)
export const OVERTAKE_CELLS = 2;                // cases de route droite nécessaires devant elle
export const OVERTAKE_CLEAR = TILE_SIZE * 4;    // distance devant qui doit être vide (personne en face)
export const OVERTAKE_SLOWER = 0.75;            // ne double que si la vitesse normale (style) de celle de devant est < 75% de la sienne, ou une épave
export const OVERTAKE_MARGIN = TILE_SIZE * 0.25; // espace laissé devant la voiture doublée avant de se rabattre

// --- Collisions ---
// Une voiture = 2 cercles (avant + arrière) : elle est plus longue que large.
// Sa largeur et sa longueur sont mesurées sur son modèle (addVehicle), rien à régler ici.
export const PED_RADIUS = TILE_SIZE * 0.06;    // "taille" d'un piéton
export const CRASH_DURATION = 2.5;             // secondes d'immobilisation après un choc
export const CRASH_BOUNCE = 0.3;               // rebond : 0 = les voitures restent collées, 1 = rebond parfait
export const CRASH_MIN_SPEED = TILE_SIZE * 0.5; // en dessous de cette vitesse d'impact : simple accrochage, pas d'accident
export const CRASH_SPIN = 1.2;                 // un choc de biais fait tourner la voiture (x vitesse de glissement)
// --- Dégâts ---
// Chaque choc ajoute (vitesse d'impact x DAMAGE_PER_IMPACT) de dégâts, jusqu'à 100.
// Elle fume de plus en plus. A partir de FIRE_DAMAGE, elle prend feu au bout de FIRE_DELAY secondes, et ne repart plus.
export const DAMAGE_PER_IMPACT = 8;            // ex : choc frontal entre deux "fast" (impact 10) = 80
export const FIRE_DAMAGE = 70;
export const FIRE_DELAY = 4;
export const SMOKE_RATE = 2;                  // bouffées de fumée par seconde à 100 de dégâts
export const FLAME_RATE = 15;                  // flammes par seconde quand elle brûle
export const CRASH_IMMUNITY = 1.5;             // secondes sans collision après être reparti

// --- Piéton ---
export const PED_SPEED = TILE_SIZE * 0.4;      // vitesse de marche
export const LAUNCH_FACTOR = 2.5;              // vitesse de projection = vitesse voiture x ce facteur
export const LAUNCH_UP = 6;                    // vitesse initiale vers le haut
export const GRAVITY = 20;
// --- Combattant (piéton 'fighter') ---
export const FIGHTER_SPEED = PED_SPEED * 1.6;  // il marche vite
export const FIGHTER_SIGHT = TILE_SIZE * 6;    // voit ses cibles jusqu'à cette distance
export const FIGHTER_CHARGE = TILE_SIZE * 1.2; // à cette distance, il fonce droit sur sa cible
export const PUNCH_RANGE = TILE_SIZE * 0.2;    // portée du coup (en plus de la taille des deux)
export const PUNCH_POWER = 1.5;                // force du coup (une voiture "fast" = 5)
export const PUNCH_UP = 1;                     // un coup soulève moins qu'une voiture
export const PUNCH_COOLDOWN = 1;               // secondes entre deux coups
export const PED_BOUNCE = 0.5;                 // rebond d'un piéton projeté contre un mur (0 à 1)

// --- Eau (3 dans la carte) ---
export const FLOAT_SINK = 0.1;                 // un piéton dans l'eau s'enfonce de ça (plus grand = seule la tête dépasse)
export const CROC_SWIM_DEPTH = 0.12;           // le crocodile nage plus bas : seuls les yeux et le dos dépassent
export const FLOAT_BOB = 0.05;                 // hauteur des vagues (monte et descend)
export const SINK_SPEED = 0.4;                 // une voiture dans l'eau coule à cette vitesse
export const SINK_DEPTH = 1;                   // à cette profondeur, elle disparaît
// --- Crocodile (piéton 'crocodile') ---
export const CROC_DRAG_SPEED = PED_SPEED;      // vitesse quand il ramène sa proie dans l'eau
export const CROC_SWIM_BOOST = 2;              // dans l'eau, il va 2x plus vite (1 = pareil que sur la plage)
export const CROC_MOUTH = 0.8;                 // distance entre son centre et sa gueule (où pend la proie)
export const DROWN_TIME = 3;                   // secondes pour emmener la proie au fond, puis elle disparaît
export const SPLASH_RATE = 12;                // éclaboussures par seconde quand un piéton bouge dans l'eau
export const DROWN_DEPTH = 1;                  // profondeur où il l'emmène

// --- Voiture qui roule sur un piéton au sol (comme sur une bosse) ---
// Les effets sont à 100% à la vitesse BUMP_FULL_SPEED, plus faibles en dessous
export const BODY_RADIUS = TILE_SIZE * 0.15;   // "taille" d'un corps couché
export const BUMP_FULL_SPEED = 5;
export const BUMP_UP = 3;                      // saut de la voiture (vitesse vers le haut)
export const BUMP_SWERVE = 0.5;                // déviation du nez (radians, au hasard à gauche ou à droite)
export const BUMP_SHOVE = TILE_SIZE * 0.15;    // écart sur le côté
export const BUMP_ROLL = 1.5;                  // la voiture penche en l'air
export const BUMP_PUSH = 0.4;                  // le corps est poussé (x vitesse de la voiture)// Rayon de la voie des ronds-points (milieu de l'anneau, depuis le centre)
// shortcut: réglé à l'œil sur road-roundabout ; à ajuster si les voitures mordent l'îlot ou l'herbe
export const RING_RADIUS = TILE_SIZE * 0.75; // plus petit = plus près de l'îlot
