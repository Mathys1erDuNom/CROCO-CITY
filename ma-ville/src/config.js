// Taille d'une case de la grille
export const TILE_SIZE = 4;

// Réglages par défaut de chaque pack Kenney.
//  - scale : échelle (1 = taille d'origine)
//  - y     : hauteur de pose (pour corriger un modèle qui flotte ou s'enfonce)
export const PACK_SETTINGS = {
  suburban: { scale: 1.5 , y: 0 },
  cars: { scale: 0.3, y: 0 },
};

// Utilisé si un pack n'est pas listé ci-dessus
export const DEFAULT_SETTINGS = { scale: 1, y: 0 };