# Graph Report - ma-ville  (2026-11-12)

## Corpus Check
- 17 files · ~16,691 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 193 file(s) not represented in the graph (top: .glb 191, .graphify-bak 1, (none) 1)
- WARNING: 193 of 217 files seen (89%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 229 nodes · 543 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9b5265f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Entry & Render Loop
- collisions.js
- map.js
- config.js
- Package Manifest
- updatePedestrians
- effects.js
- Texture Atlases
- CLAUDE.md
- .claude/CLAUDE.md
- vehicles.js

## God Nodes (most connected - your core abstractions)
1. `updateVehicles()` - 17 edges
2. `canMove()` - 13 edges
3. `placeModel()` - 12 edges
4. `checkCollisions()` - 11 edges
5. `updatePedestrians()` - 10 edges
6. `canDriveTo()` - 9 edges
7. `chooseNext()` - 9 edges
8. `drawRoads()` - 9 edges
9. `isRoad()` - 9 edges
10. `three` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Cars Colormap Texture Atlas` --semantically_similar_to--> `Characters Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/cars/Textures/colormap.png → public/models/characters/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Roads Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/roads/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Suburban Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/suburban/Textures/colormap.png
- `animate()` --calls--> `checkCollisions()`  [EXTRACTED]
  src/main.js → src/collisions.js

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 1 - "App Entry & Render Loop"
Cohesion: 0.08
Nodes (39): index.html (Ma petite ville), Fullscreen 3D Canvas Style, Main Module Script Tag, addBuilding(), buildings, placeModel(), DEFAULT_SETTINGS, PACK_SETTINGS (+31 more)

### Community 2 - "collisions.js"
Cohesion: 0.16
Nodes (21): bounceOffWall(), hitBuildings(), carCircles(), checkCollisions(), hitCars(), hitWallCar(), sameLevel(), BODY_RADIUS (+13 more)

### Community 3 - "map.js"
Cohesion: 0.14
Nodes (18): BRIDGE_HEIGHT, blockedCells, COLS, DIR, DIRECTIONS, edgeHeight(), isBeach(), isFree() (+10 more)

### Community 4 - "config.js"
Cohesion: 0.07
Nodes (42): BUMP_ROLL, BUMP_SHOVE, BUMP_SWERVE, BUMP_UP, CROC_DRAG_SPEED, CROC_MOUTH, CROC_SWIM_BOOST, CROC_SWIM_DEPTH (+34 more)

### Community 5 - "Package Manifest"
Cohesion: 0.13
Nodes (15): dependencies, three@^0.187.0, devDependencies, vite@^8.3.6, name, private, scripts, build (+7 more)

### Community 6 - "updatePedestrians"
Cohesion: 0.32
Nodes (12): isWater(), isWaterAt(), charge(), chooseNext(), dragVictim(), findPrey(), floorY(), grab() (+4 more)

### Community 7 - "effects.js"
Cohesion: 0.16
Nodes (16): beamGeometry, beams, BLACK_SMOKE, emit(), emitFlame(), emitShot(), emitSmoke(), emitSplash() (+8 more)

### Community 8 - "Texture Atlases"
Cohesion: 0.40
Nodes (5): Cars Colormap Texture Atlas, Characters Colormap Texture Atlas, Commercial Colormap Texture Atlas, Roads Colormap Texture Atlas, Suburban Colormap Texture Atlas

### Community 11 - "vehicles.js"
Cohesion: 0.10
Nodes (43): CRASH_DURATION, CRASH_IMMUNITY, DRIVING_STYLES, FIRE_DELAY, MEDIC_CARRY_HEIGHT, MEDIC_MODEL, MEDIC_SPEED, OVERTAKE_CELLS (+35 more)

## Knowledge Gaps
- **4 isolated node(s):** `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas`, `Suburban Colormap Texture Atlas`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 46 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Package Manifest` to `App Entry & Render Loop`, `vehicles.js`, `config.js`, `effects.js`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **What connects `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Entry & Render Loop` be split into smaller, more focused modules?**
  _Cohesion score 0.08139534883720931 - nodes in this community are weakly interconnected._
- **Should `map.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14210526315789473 - nodes in this community are weakly interconnected._
- **Should `config.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07293868921775898 - nodes in this community are weakly interconnected._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `vehicles.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09936575052854123 - nodes in this community are weakly interconnected._