# Graph Report - ma-ville  (2026-11-13)

## Corpus Check
- 21 files · ~18,693 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 193 file(s) not represented in the graph (top: .glb 191, .graphify-bak 1, (none) 1)
- WARNING: 193 of 221 files seen (87%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 241 nodes · 578 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd36fe33`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- canMove
- App Entry & Render Loop
- collisions.js
- map.js
- config.js
- Package Manifest
- buildings.js
- effects.js
- Texture Atlases
- CLAUDE.md
- .claude/CLAUDE.md
- vehicles.js

## God Nodes (most connected - your core abstractions)
1. `updateVehicles()` - 17 edges
2. `placeModel()` - 14 edges
3. `canMove()` - 13 edges
4. `checkCollisions()` - 11 edges
5. `updatePedestrians()` - 10 edges
6. `three` - 10 edges
7. `isRoad()` - 9 edges
8. `canDriveTo()` - 9 edges
9. `chooseNext()` - 9 edges
10. `drawRoads()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Cars Colormap Texture Atlas` --semantically_similar_to--> `Characters Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/cars/Textures/colormap.png → public/models/characters/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Roads Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/roads/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Suburban Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/suburban/Textures/colormap.png
- `chooseNext()` --calls--> `canMove()`  [EXTRACTED]
  src/pedestrians.js → src/map.js

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "canMove"
Cohesion: 0.12
Nodes (30): canMove(), heightAt(), inRoundabout(), isRoad(), abortRescue(), atCell(), canDriveTo(), canOvertake() (+22 more)

### Community 1 - "App Entry & Render Loop"
Cohesion: 0.10
Nodes (27): index.html (Ma petite ville), Fullscreen 3D Canvas Style, Main Module Script Tag, updateEffects(), animate(), cameraLabel, cameraMenus, center (+19 more)

### Community 2 - "collisions.js"
Cohesion: 0.17
Nodes (20): bounceOffWall(), hitBuildings(), carCircles(), checkCollisions(), hitCars(), hitWallCar(), sameLevel(), BODY_RADIUS (+12 more)

### Community 3 - "map.js"
Cohesion: 0.10
Nodes (24): buildings, BRIDGE_HEIGHT, buildCity(), blockedCells, COLS, DIR, DIRECTIONS, edgeHeight() (+16 more)

### Community 4 - "config.js"
Cohesion: 0.08
Nodes (38): CROC_DRAG_SPEED, CROC_MOUTH, CROC_SWIM_BOOST, CROC_SWIM_DEPTH, DROWN_DEPTH, DROWN_TIME, FIGHTER_CHARGE, FIGHTER_SIGHT (+30 more)

### Community 5 - "Package Manifest"
Cohesion: 0.13
Nodes (14): dependencies, three@^0.187.0, devDependencies, vite@^8.3.6, name, private, scripts, build (+6 more)

### Community 6 - "buildings.js"
Cohesion: 0.27
Nodes (14): three, addBuilding(), placeModel(), DEFAULT_SETTINGS, PACK_SETTINGS, TILE_SIZE, cache, loader (+6 more)

### Community 7 - "effects.js"
Cohesion: 0.16
Nodes (16): beamGeometry, beams, BLACK_SMOKE, emit(), emitFlame(), emitShot(), emitSmoke(), emitSplash() (+8 more)

### Community 8 - "Texture Atlases"
Cohesion: 0.40
Nodes (5): Cars Colormap Texture Atlas, Characters Colormap Texture Atlas, Commercial Colormap Texture Atlas, Roads Colormap Texture Atlas, Suburban Colormap Texture Atlas

### Community 11 - "vehicles.js"
Cohesion: 0.12
Nodes (31): BUMP_ROLL, BUMP_SHOVE, BUMP_SWERVE, BUMP_UP, CAR_HEADING_OFFSET, CRASH_DURATION, CRASH_IMMUNITY, DAMAGE_PER_IMPACT (+23 more)

## Knowledge Gaps
- **4 isolated node(s):** `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas`, `Suburban Colormap Texture Atlas`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 51 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `buildings.js` to `App Entry & Render Loop`, `config.js`, `Package Manifest`, `effects.js`, `vehicles.js`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `canMove` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._
- **Should `App Entry & Render Loop` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Should `map.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09788359788359788 - nodes in this community are weakly interconnected._
- **Should `config.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0796221322537112 - nodes in this community are weakly interconnected._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._