# Graph Report - ma-ville  (2026-11-10)

## Corpus Check
- 17 files · ~10,284 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 110 file(s) not represented in the graph (top: .glb 108, .graphify-bak 1, (none) 1)
- WARNING: 110 of 133 files seen (83%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 178 nodes · 412 edges · 9 communities (7 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d3722bc5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- City Map & Grid Queries
- App Entry & Render Loop
- collisions.js
- Config & Vehicle Tuning
- pedestrians.js
- Package Manifest
- Texture Atlases
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `updateVehicles()` - 12 edges
2. `checkCollisions()` - 11 edges
3. `canMove()` - 10 edges
4. `placeModel()` - 10 edges
5. `drawRoads()` - 9 edges
6. `TILE_SIZE` - 8 edges
7. `chooseNext()` - 8 edges
8. `updatePedestrians()` - 8 edges
9. `isRoad()` - 8 edges
10. `three` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Cars Colormap Texture Atlas` --semantically_similar_to--> `Characters Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/cars/Textures/colormap.png → public/models/characters/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Roads Colormap Texture Atlas` --semantically_similar_to--> `Cars Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/roads/Textures/colormap.png → public/models/cars/Textures/colormap.png
- `Commercial Colormap Texture Atlas` --semantically_similar_to--> `Suburban Colormap Texture Atlas`  [INFERRED] [semantically similar]
  public/models/commercial/Textures/colormap.png → public/models/suburban/Textures/colormap.png
- `buildCity()` --calls--> `drawRoads()`  [EXTRACTED]
  src/main.js → src/roads.js

## Import Cycles
- None detected.

## Communities (9 total, 2 thin omitted)

### Community 0 - "City Map & Grid Queries"
Cohesion: 0.14
Nodes (24): blockedCells, canMove(), COLS, DIR, DIRECTIONS, edgeHeight(), inRoundabout(), isBeach() (+16 more)

### Community 1 - "App Entry & Render Loop"
Cohesion: 0.10
Nodes (26): index.html (Ma petite ville), Fullscreen 3D Canvas Style, Main Module Script Tag, addBuilding(), buildings, placeModel(), DEFAULT_SETTINGS, PACK_SETTINGS (+18 more)

### Community 2 - "collisions.js"
Cohesion: 0.15
Nodes (21): bounceOffWall(), hitBuildings(), carCircles(), checkCollisions(), hitCars(), hitWallCar(), sameLevel(), BODY_RADIUS (+13 more)

### Community 3 - "Config & Vehicle Tuning"
Cohesion: 0.08
Nodes (35): BUMP_ROLL, BUMP_SHOVE, BUMP_SWERVE, BUMP_UP, CRASH_DURATION, CRASH_IMMUNITY, DAMAGE_PER_IMPACT, DRIVING_STYLES (+27 more)

### Community 4 - "pedestrians.js"
Cohesion: 0.12
Nodes (34): BRIDGE_HEIGHT, CROC_DRAG_SPEED, CROC_MOUTH, CROC_SWIM_BOOST, CROC_SWIM_DEPTH, DROWN_DEPTH, DROWN_TIME, FIGHTER_CHARGE (+26 more)

### Community 5 - "Package Manifest"
Cohesion: 0.13
Nodes (15): dependencies, three@^0.187.0, devDependencies, vite@^8.3.6, name, private, scripts, build (+7 more)

### Community 8 - "Texture Atlases"
Cohesion: 0.40
Nodes (5): Cars Colormap Texture Atlas, Characters Colormap Texture Atlas, Commercial Colormap Texture Atlas, Roads Colormap Texture Atlas, Suburban Colormap Texture Atlas

## Knowledge Gaps
- **4 isolated node(s):** `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas`, `Suburban Colormap Texture Atlas`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 35 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Package Manifest` to `App Entry & Render Loop`, `Config & Vehicle Tuning`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **What connects `Main Module Script Tag`, `Characters Colormap Texture Atlas`, `Roads Colormap Texture Atlas` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `City Map & Grid Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._
- **Should `App Entry & Render Loop` be split into smaller, more focused modules?**
  _Cohesion score 0.1032258064516129 - nodes in this community are weakly interconnected._
- **Should `Config & Vehicle Tuning` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `pedestrians.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._