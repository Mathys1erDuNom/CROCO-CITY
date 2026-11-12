import * as THREE from 'three';
import { placeModel } from './city.js';
import { emitSmoke, emitFlame } from './effects.js';
import {
  TILE_SIZE, SINK_SPEED, SINK_DEPTH, OVERTAKE_LANE, OVERTAKE_BOOST, OVERTAKE_CELLS, OVERTAKE_CLEAR, OVERTAKE_MARGIN, OVERTAKE_SLOWER, YIELD_MAX_WAIT,
  CAR_HEADING_OFFSET,
  SAFE_WIDTH,
  DRIVING_STYLES,
  CRASH_DURATION,
  CRASH_IMMUNITY,
  GRAVITY,
  BUMP_UP,
  BUMP_SWERVE,
  BUMP_SHOVE,
  BUMP_ROLL,
  DAMAGE_PER_IMPACT,
  FIRE_DAMAGE,
  FIRE_DELAY,
  SMOKE_RATE,
  FLAME_RATE,
  BRIDGE_HEIGHT,
  RING_RADIUS,
  MEDIC_MODEL,
  MEDIC_SPEED,
  MEDIC_CARRY_HEIGHT,
  TOW_REACH,
  TOW_MODEL,
  PARK_LANE,
} from './config.js';
import { pedestrians } from './pedestrians.js';
import { MAP, isRoad, isWaterAt, canMove, heightAt, DIRECTIONS, ROUNDABOUTS, inRoundabout } from './map.js';

// Branche de rond-point = case juste à côté d'un centre (seules cases du rond-point où l'on roule en ligne droite)
const isArm = (col, row) => ROUNDABOUTS.some((rb) => Math.abs(rb.col - col) + Math.abs(rb.row - row) === 1);
// Dans un rond-point, on ne va jamais en ligne droite vers le centre ou les coins : on prend l'anneau
const canDriveTo = (col, row) => isRoad(col, row) && (!inRoundabout(col, row) || isArm(col, row));

// Exportée pour que collisions.js puisse parcourir les voitures
export const vehicles = [];

// style : 'calm' (calme), 'fast' (rapide et nerveuse), 'drunk' (zigzague)
//         'ambulance' (attend à sa case de départ, va chercher les piétons morts, puis revient)
//         ou 'tow' (dépanneuse : pareil, mais elle enlève les voitures en feu)
export async function addVehicle(scene, pack, name, col, row, style = 'calm') {
  const settings = DRIVING_STYLES[style];
  if (!settings) throw new Error(`Style de conduite inconnu : "${style}" (choix : ${Object.keys(DRIVING_STYLES)})`);

  const model = await placeModel(scene, pack, name, col, row);
  // Taille réelle du modèle (un camion est plus long qu'un taxi) : sert aux chocs et aux distances
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const sideways = Math.abs(Math.sin(CAR_HEADING_OFFSET)) > 0.5; // modèle tourné d'un quart de tour
  const width = sideways ? size.z : size.x;
  const length = sideways ? size.x : size.z;
  model.rotation.order = 'YXZ'; // tourne (y), puis penche avant/arrière (x) et sur le côté (z)

  const car = {
    model, name, col, row, width, length,
    nextCol: col, nextRow: row,
    dir: null, style: settings, speed: settings.speed, waitTime: 0, yieldTime: 0,
    queued: false, // ralentie ou arrêtée par une autre voiture (file, priorité) : on ne la double pas
    heading: 0,           // direction "normale", sans le zigzag
    time: Math.random() * 10, // décalage : deux voitures ne zigzaguent pas pareil
    offX: 0, offZ: 0,     // écart sur le côté (voie de droite + zigzag) appliqué en ce moment
    // --- état de collision ---
    state: 'driving', // 'driving' (roule) ou 'crashed' (accidentée)
    crashTimer: 0,    // temps restant d'immobilisation
    immunity: 0,      // temps restant sans collision possible
    vx: 0, vz: 0,     // vitesse réelle (en roulant comme en glissant après un choc)
    spin: 0,          // vitesse de rotation pendant l'accident
    // --- bosse (roule sur un corps) ---
    baseY: model.position.y, vy: 0, roll: 0, bumpCooldown: 0,
    // --- dégâts ---
    damage: 0,        // de 0 (neuve) à 100 (détruite)
    fireFuse: 0,      // temps écoulé depuis que les dégâts ont dépassé FIRE_DAMAGE
    onFire: false,    // en feu : arrêtée pour toujours
    smokeCount: 0, flameCount: 0, // bouffées "en attente" d'être émises
    fireLight: null,
    // --- ambulance ---
    home: { col, row }, // case de départ, où elle revient se garer
    mission: null,      // { ped, goal, phase, carrying } : le corps à ramasser et la case de route où s'arrêter
    parked: false,
    medic: null, medicY: 0, // l'ambulancier (caché tant qu'il est dans l'ambulance) et sa hauteur de pose
  };
  if (settings.rescue) {
    // Le personnage qui descend de la voiture : ambulancier ou dépanneur
    car.medic = await placeModel(scene, 'characters', settings.rescue === 'body' ? MEDIC_MODEL : TOW_MODEL, col, row);
    car.medicY = car.medic.position.y;
    car.medic.visible = false;
  }
  chooseNext(car);
  vehicles.push(car);
}

// --- Ambulance ---
const cellKey = (col, row) => `${col},${row}`;
const atCell = (car, cell) => car.col === cell.col && car.row === cell.row;
// Là où l'ambulance doit aller : près du corps si elle en a un à ramasser, sinon chez elle
const rescueGoal = (car) => car.mission?.goal ?? car.home;

// Nombre de cases de route à parcourir depuis chaque case jusqu'à (col, row). Les cases non reliées sont absentes.
function roadDistances(col, row) {
  const dist = new Map([[cellKey(col, row), 0]]);
  const queue = [{ col, row }];
  for (const cell of queue) { // la file grandit pendant qu'on la parcourt : on s'éloigne case par case
    for (const d of DIRECTIONS) {
      const c = cell.col + d.dc;
      const r = cell.row + d.dr;
      if (dist.has(cellKey(c, r)) || !isRoad(c, r) || !canMove(cell.col, cell.row, d)) continue;
      dist.set(cellKey(c, r), dist.get(cellKey(cell.col, cell.row)) + 1);
      queue.push({ col: c, row: r });
    }
  }
  return dist;
}

// Case de route la plus proche du point (x, z) où l'ambulance peut s'arrêter : une ligne droite si possible
// (arrêtée dans un virage ou un carrefour, elle est sur la trajectoire de ceux qui tournent)
function nearestRoad(x, z) {
  let best = null;
  let bestDistance = Infinity;
  MAP.forEach((line, row) => line.forEach((_, col) => {
    if (!canDriveTo(col, row)) return;
    const distance = Math.hypot(col * TILE_SIZE - x, row * TILE_SIZE - z) + (isTurnCell(col, row) ? 1000 : 0);
    if (distance < bestDistance) { bestDistance = distance; best = { col, row }; }
  }));
  return best;
}

// Appelée à chaque image pour une ambulance qui roule : elle se trouve un corps à ramasser,
// et envoie son ambulancier le chercher une fois arrivée. Renvoie true si elle doit rester à l'arrêt (il est dehors).
function updateRescue(car, delta) {
  const wasParked = car.parked;
  const stopped = rescueStep(car, delta);
  // Elle quitte le bord alors qu'une voiture la frôle peut-être encore : pas d'accident le temps de se dégager
  if (wasParked && !car.parked) car.immunity = CRASH_IMMUNITY;
  return stopped;
}

function rescueStep(car, delta) {
  if (car.style.rescue === 'wreck') return towStep(car, delta);
  // Le corps n'est plus là (un crocodile l'a pris...) : mission annulée, ou l'ambulancier déjà sorti rentre les mains vides
  const lost = car.mission && !car.mission.carrying && car.mission.ped.state !== 'down';
  if (lost && car.mission.phase) car.mission.phase = 'back';
  else if (lost) car.mission = null;

  if (!car.mission) {
    // Le mort le plus proche dont aucune autre ambulance en état de rouler ne s'occupe
    const pos = car.model.position;
    let body = null;
    let best = Infinity;
    for (const ped of pedestrians) {
      if (ped.state !== 'down' || ped.noRescue) continue;
      const r = ped.rescuer;
      if (r && r !== car && r.mission?.ped === ped && !r.onFire && !r.sinking) continue;
      const distance = Math.hypot(ped.model.position.x - pos.x, ped.model.position.z - pos.z);
      if (distance < best) { best = distance; body = ped; }
    }
    const goal = body && nearestRoad(body.model.position.x, body.model.position.z);
    if (goal) {
      body.rescuer = car;
      car.mission = { ped: body, goal, phase: null, carrying: false };
    }
  }

  car.parked = !car.mission && atCell(car, car.home) && car.nextCol === car.col && car.nextRow === car.row;
  if (!car.mission || !atCell(car, car.mission.goal)) return false;

  // Arrivée à la route la plus proche du corps : elle reste à l'arrêt pendant que l'ambulancier fait l'aller-retour
  car.parked = true; // rangée sur le bord : les autres voitures passent à côté
  const m = car.mission;
  const back = fetchOnFoot(car, delta, m.ped.model, TILE_SIZE * 0.1,
    () => {
      if (m.ped.state !== 'down') return false; // un crocodile l'a pris entre-temps
      m.ped.state = 'grabbed'; // pedestrians.js ne le déplace plus, le crocodile ne peut plus le prendre
      m.ped.vx = m.ped.vz = 0;
      return true;
    },
    // Le corps est porté au-dessus de lui
    (pos, angle) => {
      m.ped.model.position.set(pos.x, pos.y + MEDIC_CARRY_HEIGHT, pos.z);
      m.ped.model.rotation.y = angle;
    });
  if (!back) return true;

  // De retour à l'ambulance : l'ambulancier et le corps disparaissent, elle peut repartir
  if (m.carrying) {
    m.ped.model.removeFromParent();
    m.ped.state = 'gone'; // pedestrians.js le retire de sa liste
  }
  car.mission = null;
  car.parked = false;
  return false;
}

// Le personnage de la voiture (ambulancier ou dépanneur) descend, marche jusqu'à "model", le prend et le ramène.
//  - reach : distance à laquelle il s'arrête devant
//  - take() : appelée quand il y arrive ; renvoie false s'il n'y a plus rien à prendre (il rentre les mains vides)
//  - hold(pos, angle) : appelée à chaque image du retour, pour placer ce qu'il ramène (pos et angle = les siens)
// Renvoie true quand il est remonté dans la voiture.
// shortcut: il marche tout droit (à travers bâtiments et clôtures) et rien ne peut le toucher ;
// en faire un vrai piéton s'il doit contourner les obstacles ou se faire renverser
function fetchOnFoot(car, delta, model, reach, take, hold) {
  const m = car.mission;
  const helper = car.medic;
  const from = car.model.position;
  const pos = helper.position;
  if (!m.phase) {
    m.phase = 'out'; // 'out' : il y va ; 'back' : il revient à la voiture
    helper.visible = true;
    pos.set(from.x, 0, from.z);
  }

  const target = m.phase === 'out' ? model.position : from;
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const distance = Math.hypot(dx, dz);
  const step = MEDIC_SPEED * delta;
  const arrived = distance - (m.phase === 'out' ? reach : 0) <= step;
  if (!arrived) {
    pos.x += (dx / distance) * step;
    pos.z += (dz / distance) * step;
    helper.rotation.y = Math.atan2(dx, dz);
  }
  pos.y = car.medicY + heightAt(pos.x, pos.z);
  if (m.carrying) hold(pos, helper.rotation.y);

  if (arrived && m.phase === 'out') {
    m.phase = 'back';
    m.carrying = take();
    return false;
  }
  if (!arrived) return false;
  helper.visible = false;
  return true;
}

// Dépanneuse : elle se trouve une voiture en feu et s'arrête juste à côté. Son dépanneur descend,
// va jusqu'à l'épave et la tire jusqu'à la dépanneuse, où les deux disparaissent.
// Renvoie true si elle doit rester à l'arrêt (il est dehors).
function towStep(car, delta) {
  // L'épave n'est plus là (tombée à l'eau, qui éteint le feu) : mission annulée, ou le dépanneur déjà sorti rentre les mains vides
  const lost = car.mission && !car.mission.carrying && (car.mission.wreck.gone || !car.mission.wreck.onFire);
  if (lost && car.mission.phase) car.mission.phase = 'back';
  else if (lost) car.mission = null;

  const pos = car.model.position;
  const gap = (wreck) => Math.hypot(wreck.model.position.x - pos.x, wreck.model.position.z - pos.z);
  if (!car.mission) {
    // La voiture en feu la plus proche dont aucune autre dépanneuse en état de rouler ne s'occupe
    let wreck = null;
    for (const other of vehicles) {
      if (other === car || !other.onFire || other.gone || other.noRescue) continue;
      const t = other.tower;
      if (t && t !== car && t.mission?.wreck === other && !t.onFire && !t.sinking) continue;
      if (!wreck || gap(other) < gap(wreck)) wreck = other;
    }
    const goal = wreck && nearestRoad(wreck.model.position.x, wreck.model.position.z);
    if (goal) {
      wreck.tower = car;
      car.mission = { wreck, goal, phase: null, carrying: false };
    }
  }

  car.parked = !car.mission && atCell(car, car.home) && car.nextCol === car.col && car.nextRow === car.row;
  // Elle s'arrête avant de toucher l'épave (ou sur la route la plus proche, si l'épave a fini dans l'herbe),
  // et ne bouge plus tant que le dépanneur est dehors
  const m = car.mission;
  if (!m || !(m.phase || atCell(car, m.goal) || gap(m.wreck) < TOW_REACH)) return false;

  car.parked = true; // rangée sur le bord : les autres voitures passent à côté
  const wreck = m.wreck;
  const behind = wreck.length / 2 + TILE_SIZE * 0.1; // distance entre le dépanneur et le milieu de l'épave
  const back = fetchOnFoot(car, delta, wreck.model, behind,
    () => wreck.onFire && !wreck.gone,
    // L'épave est tirée derrière lui, le nez dans le sens de la marche
    (pos, angle) => {
      wreck.model.position.x = pos.x - Math.sin(angle) * behind;
      wreck.model.position.z = pos.z - Math.cos(angle) * behind;
      wreck.model.rotation.y = angle + CAR_HEADING_OFFSET;
      wreck.vx = wreck.vz = wreck.spin = 0; // elle ne glisse plus toute seule
    });
  if (!back) return true;

  // De retour à la dépanneuse : le dépanneur et l'épave disparaissent, elle peut repartir
  if (m.carrying) {
    wreck.model.removeFromParent(); // sa lueur de feu part avec elle
    wreck.gone = true;              // updateVehicles la retire de la liste
  }
  car.mission = null;
  car.parked = false;
  return false;
}

// Ambulance ou dépanneuse en feu ou tombée à l'eau en pleine intervention : mission abandonnée
// (le personnage disparaît et lâche ce qu'il ramenait ; l'épave reste où elle est)
function abortRescue(car) {
  if (car.mission.carrying && car.mission.ped) car.mission.ped.state = 'down';
  if (car.medic) car.medic.visible = false;
  car.mission = null;
  car.parked = false;
}

// La voiture choisit sa prochaine case au hasard (sans demi-tour si possible).
// L'ambulance, elle, prend la case qui la rapproche de son but.
function chooseNext(car) {
  // Route voisine ET raccordée à la même hauteur (on ne monte sur un pont que par sa rampe)
  let options = DIRECTIONS.filter((d) => canMove(car.col, car.row, d) && canDriveTo(car.col + d.dc, car.row + d.dr));

  if (car.style.rescue) {
    const goal = rescueGoal(car);
    if (atCell(car, goal)) {
      // Arrivée : elle reste sur sa case (à la création, elle se tourne juste dans le sens de la route)
      car.nextCol = car.col;
      car.nextRow = car.row;
      if (!car.dir && options.length > 0) {
        car.dir = options[0];
        car.heading = Math.atan2(car.dir.dc, car.dir.dr) + CAR_HEADING_OFFSET;
      }
      return;
    }
    const dist = roadDistances(goal.col, goal.row);
    const left = (d) => dist.get(cellKey(car.col + d.dc, car.row + d.dr)) ?? Infinity;
    // Pas de demi-tour sur place (elle se retrouverait face aux autres) : elle fait le tour, sauf dans un cul-de-sac
    const ahead = options.filter((d) => !(car.dir && d.dc === -car.dir.dc && d.dr === -car.dir.dr));
    if (ahead.some((d) => left(d) < Infinity)) options = ahead;
    if (options.length > 0) options = [options.reduce((best, d) => (left(d) < left(best) ? d : best))];
    // Aucune route n'y mène : elle abandonne ce corps
    if (car.mission && options.length > 0 && left(options[0]) === Infinity) {
      (car.mission.ped ?? car.mission.wreck).noRescue = true;
      car.mission = null;
      return;
    }
  } else if (car.dir) {
    const withoutUTurn = options.filter(
      (d) => !(d.dc === -car.dir.dc && d.dr === -car.dir.dr)
    );
    if (withoutUTurn.length > 0) options = withoutUTurn;
  }
  // En plein dépassement : elle continue tout droit si elle peut
  if (car.overtaking && options.includes(car.dir)) options = [car.dir];
  if (options.length === 0) return;

  const choice = options[Math.floor(Math.random() * options.length)];
  car.dir = choice;
  car.nextCol = car.col + choice.dc;
  car.nextRow = car.row + choice.dr;
  car.heading = Math.atan2(choice.dc, choice.dr) + CAR_HEADING_OFFSET;
}

// Arrivée sur une branche en allant vers le centre : la voiture prend l'anneau
// (sens inverse des aiguilles d'une montre vu du dessus) jusqu'à une autre branche au hasard.
function enterRoundabout(car) {
  const d = car.dir;
  const rb = d && ROUNDABOUTS.find((r) => r.col === car.col + d.dc && r.row === car.row + d.dr);
  if (!rb) return false;
  if (car.style.rescue) {
    if (atCell(car, rescueGoal(car))) return false; // arrivée sur cette branche : elle s'y arrête
    // Ambulance : elle sort par la branche la plus proche de son but (y compris celle d'où elle vient)
    const goal = rescueGoal(car);
    const dist = roadDistances(goal.col, goal.row);
    const left = (e) => dist.get(cellKey(rb.col + e.dc, rb.row + e.dr)) ?? Infinity;
    const exit = DIRECTIONS.filter((e) => canMove(rb.col + e.dc, rb.row + e.dr, e) && isRoad(rb.col + 2 * e.dc, rb.row + 2 * e.dr))
      .reduce((best, e) => (!best || left(e) < left(best) ? e : best), null);
    if (exit) {
      const TAU = Math.PI * 2;
      const from = Math.atan2(-d.dr, -d.dc);
      car.ring = { rb, exit, angle: from, left: (((from - Math.atan2(exit.dr, exit.dc)) % TAU) + TAU) % TAU || TAU };
      return true;
    }
  }
  // Sorties possibles : branche dont la route continue vers l'extérieur
  let exits = DIRECTIONS.filter((e) =>
    !(e.dc === -d.dc && e.dr === -d.dr) &&
    canMove(rb.col + e.dc, rb.row + e.dr, e) && isRoad(rb.col + 2 * e.dc, rb.row + 2 * e.dr));
  if (exits.length === 0) exits = [DIRECTIONS.find((e) => e.dc === -d.dc && e.dr === -d.dr)]; // demi-tour
  const exit = exits[Math.floor(Math.random() * exits.length)];

  // Angles mesurés comme atan2(z, x) : vu du dessus, faire DIMINUER l'angle = sens inverse des aiguilles
  const from = Math.atan2(-d.dr, -d.dc);
  const to = Math.atan2(exit.dr, exit.dc);
  const TAU = Math.PI * 2;
  const left = (((from - to) % TAU) + TAU) % TAU || TAU; // demi-tour = tour complet
  car.ring = { rb, exit, angle: from, left };
  return true;
}

// Un pas sur l'anneau. Renvoie la direction avant (fx, fz) pour l'écart de voie.
function driveRing(car, pos, step) {
  const r = car.ring;
  const a = Math.min(step / RING_RADIUS, r.left);
  r.angle -= a;
  r.left -= a;
  pos.x = r.rb.col * TILE_SIZE + Math.cos(r.angle) * RING_RADIUS;
  pos.z = r.rb.row * TILE_SIZE + Math.sin(r.angle) * RING_RADIUS;
  const fx = Math.sin(r.angle);
  const fz = -Math.cos(r.angle);
  car.heading = Math.atan2(fx, fz) + CAR_HEADING_OFFSET;
  // Direction "en cases" la plus proche (sert aux distances de sécurité et aux chocs)
  car.dir = Math.abs(fx) > Math.abs(fz)
    ? DIRECTIONS.find((d) => d.dc === Math.sign(fx))
    : DIRECTIONS.find((d) => d.dr === Math.sign(fz));

  if (r.left <= 0) {
    // Sortie : on reprend la route normale sur la branche choisie
    const e = r.exit;
    car.ring = null;
    car.col = r.rb.col + e.dc;
    car.row = r.rb.row + e.dr;
    car.dir = e;
    car.nextCol = car.col + e.dc;
    car.nextRow = car.row + e.dr;
    car.heading = Math.atan2(e.dc, e.dr) + CAR_HEADING_OFFSET;
  }
  return [fx, fz];
}

// La voiture roulant dans le même sens qui gêne devant "car" (null si aucune)
function isBlocked(car) {
  if (!car.dir) return null;
  const pos = car.model.position;

  for (const other of vehicles) {
    if (other === car || other === car.overtaking) continue; // celle qu'on double ne gêne plus
    // Ambulance garée sur le bord : on passe à côté (seulement une fois qu'elle s'est vraiment rangée)
    if (other.parked && other.state === 'driving' && Math.hypot(other.offX, other.offZ) > PARK_LANE * 0.8) continue;
    // Les voitures en sens inverse ne sont PAS évitées : elles vont se percuter
    if (other.dir && other.dir.dc === -car.dir.dc && other.dir.dr === -car.dir.dr) continue;

    const dx = other.model.position.x - pos.x;
    const dz = other.model.position.z - pos.z;
    const forward = dx * car.dir.dc + dz * car.dir.dr;
    const side = Math.abs(dx * car.dir.dr - dz * car.dir.dc);

    if (forward > 0 && forward < car.style.safeDistance && side < SAFE_WIDTH) return other;
  }
  return null;
}

// Virage, carrefour ou cul-de-sac : toute case de route qui n'est pas une simple ligne droite
function isTurnCell(col, row) {
  const open = DIRECTIONS.filter((d) => canMove(col, row, d) && canDriveTo(col + d.dc, row + d.dr));
  return !(open.length === 2 && open[0].dc === -open[1].dc && open[0].dr === -open[1].dr);
}

// Distance (en "carré") entre le milieu de la route sous la voiture et le centre de la case (col, row)
function gapTo(car, col, row) {
  const p = car.model.position;
  return Math.max(Math.abs(p.x - car.offX - col * TILE_SIZE), Math.abs(p.z - car.offZ - row * TILE_SIZE));
}

// Vrai si la voiture doit attendre à l'entrée du virage ou du carrefour devant elle :
// une voiture d'un autre sens y est déjà, ou y arrive avant elle. (En tournant, l'avant d'une voiture
// passe sur la voie d'en face : à deux dans un virage, elles se touchent.)
function mustYield(car) {
  if (!car.style.yield || car.ring || !car.dir) return false;
  const col = car.nextCol;
  const row = car.nextRow;
  if (inRoundabout(col, row) || !isTurnCell(col, row)) return false;
  const reach = TILE_SIZE / 2 + car.length / 2; // en deçà, son avant est dans la case
  const mine = gapTo(car, col, row);
  if (mine < reach) return false; // déjà engagée : elle ne s'arrête pas au milieu
  return vehicles.some((other) => {
    if (other === car || other.state !== 'driving' || !other.model.visible || other.ring) return false;
    if (other.dir === car.dir) return false; // même sens : la distance de sécurité suffit
    const gap = gapTo(other, col, row);
    if (gap < reach) return true;                                         // elle est dans la case
    return other.nextCol === col && other.nextRow === row && gap < mine;  // elle arrive avant nous
  });
}

// Vrai si "car" peut doubler "ahead" par la gauche : route droite devant, et personne sur la route devant
function canOvertake(car, ahead) {
  if (car.ring || !car.dir) return false;
  // Celle de devant double déjà (elle est sur la voie de gauche), ou quelqu'un nous double : on reste à droite
  if (ahead.overtaking || vehicles.some((other) => other.overtaking === car)) return false;
  // Elle attend son tour (file, priorité à un virage) : elle n'est pas lente, on attend aussi
  if (ahead.queued) return false;
  // On ne double qu'une épave ou une voiture plus lente par nature (son style), pas sa vitesse d'un instant :
  // elle saute d'une image à l'autre (centre de case, changement de voie) et ferait doubler sans raison
  if (ahead.state === 'driving' && ahead.style.speed > car.style.speed * OVERTAKE_SLOWER) return false;
  const { dc, dr } = car.dir;
  const pos = car.model.position;
  // Route droite jusqu'au-delà de celle qu'on double (pas de virage au milieu du dépassement)
  const gap = (ahead.model.position.x - pos.x) * dc + (ahead.model.position.z - pos.z) * dr;
  const cells = Math.max(OVERTAKE_CELLS, Math.ceil((gap + ahead.length + car.length) / TILE_SIZE) + 1);
  for (let i = 1; i <= cells; i++) {
    const c = car.col + dc * i;
    const r = car.row + dr * i;
    if (!canDriveTo(c, r) || inRoundabout(c, r) || !canMove(c - dc, r - dr, car.dir)) return false;
  }
  return !vehicles.some((other) => {
    if (other === car || other === ahead || !other.model.visible) return false;
    const dx = other.model.position.x - pos.x;
    const dz = other.model.position.z - pos.z;
    const forward = dx * dc + dz * dr;
    const side = Math.abs(dx * dr - dz * dc);
    return forward > -car.length && forward < OVERTAKE_CLEAR && side < TILE_SIZE * 0.5; // les 2 voies
  });
}

// Fin du dépassement : elle est passée devant, l'autre est partie loin, ou elle a tourné
function overtakeDone(car) {
  const o = car.overtaking;
  if (car.ring || car.dir !== car.overtakeDir) return true;
  const forward = (o.model.position.x - car.model.position.x) * car.dir.dc +
    (o.model.position.z - car.model.position.z) * car.dir.dr;
  // Elle se rabat quand son arrière a dépassé l'avant de l'autre (+ une marge)
  return forward < -((car.length + o.length) / 2 + OVERTAKE_MARGIN) || forward > car.style.safeDistance * 3;
}

// Déclenche (ou prolonge) l'accident d'une voiture.
// Sa nouvelle vitesse (vx, vz) a déjà été calculée par collisions.js.
// impact : vitesse du choc, qui donne les dégâts
export function crashCar(car, spin, impact) {
  car.damage = Math.min(100, car.damage + impact * DAMAGE_PER_IMPACT);
  car.smokeCount = Math.max(car.smokeCount, 1); // bouffée immédiate, sinon la 1re fumée tarde de plusieurs secondes
  car.state = 'crashed';
  car.queued = false; // une épave, ça se double
  car.crashTimer = CRASH_DURATION;
  car.spin += spin;
  car.offX = car.offZ = 0; // l'écart sur le côté reste où il est, on ne le retire plus
}

// Pendant l'accident : la voiture glisse, tourne, ralentit, puis redémarre
function updateCrash(car, delta) {
  const pos = car.model.position;
  pos.x += car.vx * delta;
  pos.z += car.vz * delta;
  car.model.rotation.y += car.spin * delta;

  // Frottement : tout ralentit progressivement
  const friction = Math.max(0, 1 - 4 * delta);
  car.vx *= friction;
  car.vz *= friction;
  car.spin *= friction;

  car.crashTimer -= delta;
  if (car.crashTimer <= 0 && !car.onFire) recoverCar(car); // en feu : elle ne repart jamais
}

// La voiture repart d'où le choc l'a laissée : elle roule jusqu'à la case de route
// la plus proche, puis reprend son trajet normalement (pas de téléportation)
function recoverCar(car) {
  const pos = car.model.position;
  // Elle garde le sens où elle roulait avant le choc (même après un tête-à-queue) : jamais de demi-tour
  const nose = car.model.rotation.y - CAR_HEADING_OFFSET;
  const dir = car.dir ?? DIRECTIONS.reduce((b, d) =>
    (d.dc * Math.sin(nose) + d.dr * Math.cos(nose) > b.dc * Math.sin(nose) + b.dr * Math.cos(nose) ? d : b));
  // Case de route la plus proche, au même niveau qu'elle (pas le pont si elle est tombée en bas),
  // de préférence devant elle : une case derrière ne sert que s'il n'y a rien devant
  let best = { col: car.col, row: car.row };
  let bestDistance = Infinity;
  MAP.forEach((line, row) => line.forEach((_, col) => {
    if (!canDriveTo(col, row)) return;
    const x = col * TILE_SIZE;
    const z = row * TILE_SIZE;
    // >= : le milieu d'une rampe (mi-hauteur) est exclu, elle repart toujours d'une route normale
    if (Math.abs(car.baseY + heightAt(x, z) - pos.y) >= BRIDGE_HEIGHT / 2) return;
    const behind = (x - pos.x) * dir.dc + (z - pos.z) * dir.dr < -TILE_SIZE * 0.5;
    const distance = Math.hypot(x - pos.x, z - pos.z) + (behind ? 1000 : 0);
    if (distance < bestDistance) { bestDistance = distance; best = { col, row }; }
  }));
  car.col = car.nextCol = best.col;
  car.row = car.nextRow = best.row;

  car.state = 'driving';
  car.ring = null;
  car.spin = 0;
  car.immunity = CRASH_IMMUNITY; // sinon elle repercute aussitôt l'autre voiture
  car.waitTime = 0;
  car.heading = Math.atan2(car.nextCol * TILE_SIZE - pos.x, car.nextRow * TILE_SIZE - pos.z) + CAR_HEADING_OFFSET;
  car.dir = dir; // arrivée sur la route, elle continue ou tourne, sans revenir en arrière
}

// Roule sur un obstacle (ex : un corps) : elle saute un peu, penche et dévie.
// strength : de 0 à 1, selon la vitesse. Le côté (gauche ou droite) est au hasard.
export function bumpCar(car, strength) {
  const side = Math.random() < 0.5 ? -1 : 1;
  car.vy = Math.max(car.vy, BUMP_UP * strength);
  car.roll = BUMP_ROLL * strength * side;
  car.model.rotation.y += BUMP_SWERVE * strength * side * Math.random();

  // Écart sur le côté : (-cos, sin) = la droite de la voiture
  const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
  const shove = BUMP_SHOVE * strength * side;
  car.model.position.x -= Math.cos(angle) * shove;
  car.model.position.z += Math.sin(angle) * shove;
}

// Saut : la gravité la ramène au sol, et elle se remet à plat
// Hauteur : elle suit la route (rampes, ponts), et la gravité la fait retomber (bosse, chute d'un pont)
function updateHeight(car, delta) {
  const pos = car.model.position;
  let floor = car.baseY + heightAt(pos.x, pos.z);
  // Bien plus basse que la route (sous un pont, au pied d'une rampe) : son sol est celui d'en bas, elle ne monte pas d'un coup
  if (pos.y < floor - BRIDGE_HEIGHT / 2) floor = car.baseY;

  if (car.vy <= 0 && pos.y - floor < 0.08) {
    // Au sol : collée à la route, et penchée selon la pente (avant plus haut que l'arrière = nez levé)
    pos.y = floor;
    car.vy = 0;
    car.model.rotation.z = 0;
    const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
    const half = car.length / 2;
    const front = heightAt(pos.x + Math.sin(angle) * half, pos.z + Math.cos(angle) * half);
    const back = heightAt(pos.x - Math.sin(angle) * half, pos.z - Math.cos(angle) * half);
    car.model.rotation.x = -Math.atan2(front - back, car.length);
    return;
  }

  // En l'air
  pos.y += car.vy * delta;
  car.vy -= GRAVITY * delta;
  car.model.rotation.z = car.roll * (pos.y - floor);
  if (pos.y <= floor) {
    pos.y = floor;
    car.vy = 0;
    car.model.rotation.z = 0;
  }
}

// Fumée selon les dégâts, puis feu si elle est trop abîmée
function updateDamage(car, delta) {
  if (car.damage <= 0) return;
  const scene = car.model.parent;
  const pos = car.model.position;

  // La fumée sort du capot (l'avant de la voiture)
  const angle = car.model.rotation.y - CAR_HEADING_OFFSET;
  const hood = {
    x: pos.x + Math.sin(angle) * car.length * 0.3,
    y: pos.y + 0.3,
    z: pos.z + Math.cos(angle) * car.length * 0.3,
  };

  const level = car.damage / 100;
  car.smokeCount += SMOKE_RATE * level * delta;
  for (; car.smokeCount >= 1; car.smokeCount--) emitSmoke(scene, hood, car.onFire ? 1 : level);

  if (car.onFire) {
    car.flameCount += FLAME_RATE * delta;
    for (; car.flameCount >= 1; car.flameCount--) emitFlame(scene, hood);
    car.fireLight.intensity = 3 + Math.random() * 3; // les flammes vacillent
    return;
  }

  // Trop abîmée : elle fume noir quelques secondes, puis s'embrase
  if (car.damage >= FIRE_DAMAGE) {
    car.fireFuse += delta;
    if (car.fireFuse >= FIRE_DELAY) igniteCar(car);
  }
}

function igniteCar(car) {
  car.onFire = true;
  car.damage = 100;
  car.state = 'crashed'; // elle glisse jusqu'à l'arrêt, puis ne bouge plus (sauf si on la percute)
  car.crashTimer = 0;

  // Carrosserie noircie (copie des matériaux pour ne pas noircir les autres voitures)
  car.model.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.color.multiplyScalar(0.25);
    }
  });

  // Lueur orange autour de la voiture
  car.fireLight = new THREE.PointLight(0xff6a00, 4, 5);
  car.fireLight.position.y = 0.8;
  car.model.add(car.fireLight);
}

// Tombée dans l'eau : elle glisse encore un peu, pique du nez et coule. Elle ne repart jamais.
function sinkCar(car, delta) {
  const pos = car.model.position;
  if (!car.sinking) {
    car.sinking = true;
    car.state = 'crashed'; // plus de piétons renversés
    car.onFire = false;    // l'eau éteint le feu
    if (car.fireLight) car.fireLight.intensity = 0;
  }
  if (!car.model.visible) return;
  pos.x += car.vx * delta;
  pos.z += car.vz * delta;
  const drag = Math.max(0, 1 - 3 * delta); // l'eau freine fort
  car.vx *= drag;
  car.vz *= drag;
  pos.y -= SINK_SPEED * delta;
  car.model.rotation.x += (0.4 - car.model.rotation.x) * Math.min(1, delta * 2);
  if (pos.y < car.baseY - SINK_DEPTH) car.model.visible = false; // au fond
}

export function updateVehicles(delta) {
  for (const car of vehicles) {
    if (car.gone) continue; // épave enlevée par une dépanneuse pendant cette image
    const p = car.model.position;
    if (car.mission && (car.onFire || car.sinking)) abortRescue(car);
    if (car.sinking || (isWaterAt(p.x, p.z) && p.y < car.baseY + 0.1)) {
      sinkCar(car, delta);
      continue;
    }
    if (car.immunity > 0) car.immunity -= delta;
    if (car.bumpCooldown > 0) car.bumpCooldown -= delta;
    updateHeight(car, delta);
    updateDamage(car, delta);

    // Voiture accidentée : on gère l'accident et on passe à la suivante
    if (car.state === 'crashed') {
      updateCrash(car, delta);
      continue;
    }

    // Ambulance dont l'ambulancier est dehors : à l'arrêt
    if (car.style.rescue && updateRescue(car, delta)) {
      car.vx = car.vz = 0;
      // Elle se serre sur le bord de la route, sinon les autres lui rentrent dedans
      if (car.dir) {
        const smooth = Math.min(1, delta * 8);
        const pos = car.model.position;
        pos.x -= car.offX;
        pos.z -= car.offZ;
        car.offX += (-car.dir.dr * PARK_LANE - car.offX) * smooth;
        car.offZ += (car.dir.dc * PARK_LANE - car.offZ) * smooth;
        pos.x += car.offX;
        pos.z += car.offZ;
      }
      continue;
    }

    if (car.overtaking && overtakeDone(car)) car.overtaking = null; // elle se rabat à droite

    // Virage ou carrefour occupé par une voiture d'un autre sens : on attend à l'entrée (temps limité)
    car.queued = false;
    if (mustYield(car)) {
      car.yieldTime += delta;
      if (car.yieldTime < YIELD_MAX_WAIT) {
        car.vx = car.vz = 0;
        car.queued = true;
        continue;
      }
    } else {
      car.yieldTime = 0;
    }

    // Une voiture devant gêne : elle double par la gauche si c'est possible, sinon elle reste derrière
    const ahead = isBlocked(car);
    let speedCap = Infinity;
    if (ahead && car.style.overtake && canOvertake(car, ahead)) {
      car.overtaking = ahead;
      car.overtakeDir = car.dir;
    } else if (ahead) {
      car.queued = true;
      const aheadSpeed = Math.hypot(ahead.vx, ahead.vz);
      if (aheadSpeed > 0.1) {
        speedCap = aheadSpeed; // elle roule à la vitesse de celle de devant
      } else {
        // Celle de devant est arrêtée : on attend (temps limité)
        car.waitTime += delta;
        if (car.waitTime < car.style.maxWait) {
          car.vx = car.vz = 0; // à l'arrêt
          continue;
        }
      }
    } else {
      car.waitTime = 0;
    }

    const pos = car.model.position;
    const { lane, speed, sway, swayAngle, speedSway } = car.style;
    car.time += delta;
    const startX = pos.x;
    const startZ = pos.z;

    // On retire l'écart de l'image d'avant : on avance depuis le centre de la route
    pos.x -= car.offX;
    pos.z -= car.offZ;

    // Vitesse qui varie (sinus mélangés = irrégulier)
    car.speed = speed * (1 + speedSway * Math.sin(car.time * 1.3) * Math.sin(car.time * 0.7));
    if (car.overtaking) {
      // D'abord elle se décale sur la voie de gauche (à la vitesse de l'autre), ensuite elle accélère
      const side = -car.offX * car.dir.dr + car.offZ * car.dir.dc; // écart actuel vers la droite
      if (side > -OVERTAKE_LANE * 0.8) speedCap = Math.min(speedCap, Math.hypot(car.overtaking.vx, car.overtaking.vz));
      else car.speed *= OVERTAKE_BOOST;
    }
    car.speed = Math.min(car.speed, speedCap);

    const step = car.speed * delta;
    let forward;

    if (car.ring) {
      forward = driveRing(car, pos, step);
    } else {
      const targetX = car.nextCol * TILE_SIZE;
      const targetZ = car.nextRow * TILE_SIZE;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const distance = Math.hypot(dx, dz);

      if (distance <= step) {
        pos.x = targetX;
        pos.z = targetZ;
        car.col = car.nextCol;
        car.row = car.nextRow;
        if (!enterRoundabout(car)) chooseNext(car);
      } else {
        pos.x += (dx / distance) * step;
        pos.z += (dz / distance) * step;
      }
      forward = car.dir && [car.dir.dc, car.dir.dr];
    }

    // Écart sur le côté : voie de droite + zigzag. (-dr, dc) = la droite de la voiture.
    if (forward) {
      const [fx, fz] = forward;
      const wave = sway > 0 ? Math.sin(car.time * 2.5) + 0.5 * Math.sin(car.time * 4.1) : 0;
      const side = car.parked ? PARK_LANE : (car.overtaking ? -OVERTAKE_LANE : lane) + wave * sway; // en dépassement : voie de gauche
      // On glisse vers l'écart voulu au lieu de sauter : changement de voie en douceur dans les virages
      const smooth = Math.min(1, delta * 8);
      car.offX += (-fz * side - car.offX) * smooth;
      car.offZ += (fx * side - car.offZ) * smooth;
      pos.x += car.offX;
      pos.z += car.offZ;
    }

    // Le nez tourne en douceur vers sa direction (+ oscillation du bourré)
    const wantedAngle = car.heading + Math.cos(car.time * 2.5) * swayAngle;
    let turn = (wantedAngle - car.model.rotation.y) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2;  // toujours par le chemin le plus court
    if (turn < -Math.PI) turn += Math.PI * 2;
    car.model.rotation.y += turn * Math.min(1, delta * 8);

    // Vitesse réelle de cette image : sert à calculer la force des chocs
    if (delta > 0) {
      car.vx = (pos.x - startX) / delta;
      car.vz = (pos.z - startZ) / delta;
    }
  }

  // Les épaves enlevées sont retirées de la liste (après la boucle, pour ne pas la casser en cours de route)
  for (let i = vehicles.length - 1; i >= 0; i--) {
    if (vehicles[i].gone) vehicles.splice(i, 1);
  }
}
