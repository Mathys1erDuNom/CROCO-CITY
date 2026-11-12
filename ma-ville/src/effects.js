import * as THREE from 'three';

// Particules (fumée, flammes) : des petits disques flous qui montent, grossissent et s'effacent
const particles = [];
const MAX_PARTICLES = 400; // au-delà, on n'en crée plus : la page reste fluide

let texture = null;
function getTexture() {
  if (texture) return texture;
  // Disque blanc flou dessiné une seule fois, teinté ensuite par la couleur de chaque particule
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function emit(scene, pos, { color, size, grow, life, rise, spread, opacity, glow = false }) {
  if (particles.length >= MAX_PARTICLES) return;
  const material = new THREE.SpriteMaterial({
    map: getTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, // les flammes s'additionnent = brillent
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(pos.x, pos.y, pos.z);
  sprite.scale.setScalar(size);
  scene.add(sprite);
  particles.push({
    sprite, life, maxLife: life, grow, opacity,
    vx: (Math.random() - 0.5) * spread,
    vy: rise * (0.7 + Math.random() * 0.6),
    vz: (Math.random() - 0.5) * spread,
  });
}

const LIGHT_SMOKE = new THREE.Color(0xcccccc);
const BLACK_SMOKE = new THREE.Color(0x1a1a1a);

// darkness : 0 = fumée blanche légère, 1 = fumée noire épaisse
export function emitSmoke(scene, pos, darkness) {
  emit(scene, pos, {
    color: LIGHT_SMOKE.clone().lerp(BLACK_SMOKE, darkness),
    size: 0.25 + darkness * 0.25, grow: 1.2, life: 1.5 + darkness * 1.5,
    rise: 0.8, spread: 0.4, opacity: 0.4 + darkness * 0.4,
  });
}

// Gouttes d'eau blanches : partent vite sur les côtés et vers le haut, et s'effacent tôt
const SPLASH = new THREE.Color(0xe6f4ff);
export function emitSplash(scene, pos) {
  emit(scene, pos, {
    color: SPLASH, size: 0.12, grow: 1.5, life: 0.35 + Math.random() * 0.2,
    rise: 1.2, spread: 1.4, opacity: 0.8,
  });
}

// Coup de feu : éclair et fumée au bout du pistolet, trait lumineux jusqu'à la cible, étincelles à l'impact
const SHOT = new THREE.Color(0xffe066);
const SPARK = new THREE.Color(0xff9933);
const beams = []; // traits lumineux en cours : { mesh, life }
const BEAM_LIFE = 0.12;
const BEAM_WIDTH = 0.035;
const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).rotateX(Math.PI / 2); // couché : sa longueur suit l'axe z
export function emitShot(scene, from, to) {
  const start = new THREE.Vector3(from.x, from.y, from.z);
  const end = new THREE.Vector3(to.x, to.y, to.z);

  // Le trait : un tube fin et brillant, qui s'affine et s'efface en une fraction de seconde
  const mesh = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({
    color: 0xfff2a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.lookAt(end);
  mesh.scale.set(BEAM_WIDTH, BEAM_WIDTH, start.distanceTo(end));
  scene.add(mesh);
  beams.push({ mesh, life: BEAM_LIFE });

  // Au canon : un éclair bref, puis une petite bouffée de fumée
  emit(scene, from, { color: SHOT, size: 0.7, grow: -7, life: 0.1, rise: 0, spread: 0, opacity: 1, glow: true });
  emit(scene, from, { color: LIGHT_SMOKE, size: 0.12, grow: 2, life: 0.6, rise: 0.5, spread: 0.2, opacity: 0.5 });

  // À l'impact : un flash et des étincelles qui giclent
  emit(scene, to, { color: SHOT, size: 0.45, grow: -6, life: 0.12, rise: 0, spread: 0, opacity: 1, glow: true });
  for (let i = 0; i < 8; i++) {
    emit(scene, to, { color: SPARK, size: 0.09, grow: -2, life: 0.2 + Math.random() * 0.25, rise: 1.5, spread: 3.5, opacity: 1, glow: true });
  }
}

export function emitFlame(scene, pos) {
  emit(scene, pos, {
    color: new THREE.Color().setHSL(0.02 + Math.random() * 0.08, 1, 0.55), // rouge à orange
    size: 0.4, grow: -0.9, life: 0.5 + Math.random() * 0.3,
    rise: 1.6, spread: 0.6, opacity: 0.9, glow: true,
  });
}

export function updateEffects(delta) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const beam = beams[i];
    beam.life -= delta;
    if (beam.life <= 0) {
      beam.mesh.removeFromParent();
      beam.mesh.material.dispose();
      beams.splice(i, 1);
      continue;
    }
    const k = beam.life / BEAM_LIFE; // 1 au départ, 0 à la fin
    beam.mesh.material.opacity = k;
    beam.mesh.scale.x = beam.mesh.scale.y = BEAM_WIDTH * k;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= delta;
    if (p.life <= 0) {
      p.sprite.removeFromParent();
      p.sprite.material.dispose();
      particles.splice(i, 1);
      continue;
    }
    p.sprite.position.x += p.vx * delta;
    p.sprite.position.y += p.vy * delta;
    p.sprite.position.z += p.vz * delta;
    p.sprite.scale.multiplyScalar(Math.max(0, 1 + p.grow * delta));
    p.sprite.material.opacity = p.opacity * (p.life / p.maxLife);
  }
}
