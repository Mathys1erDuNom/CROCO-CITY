import { vehicles, crashCar } from './vehicles.js';
import { pedestrians, launchPedestrian } from './pedestrians.js';
import { CAR_RADIUS, PED_RADIUS } from './config.js';

// Appelée à chaque image, après les déplacements
export function checkCollisions() {
  // --- Voiture contre voiture ---
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i];
      const b = vehicles[j];

      // Une voiture qui vient de redémarrer ne peut pas être percutée tout de suite
      if (a.immunity > 0 || b.immunity > 0) continue;

      const pa = a.model.position;
      const pb = b.model.position;
      const distance = Math.hypot(pa.x - pb.x, pa.z - pb.z);

      // Les cercles se touchent : choc !
      if (distance < CAR_RADIUS * 2) {
        crashCar(a, pb.x, pb.z);
        crashCar(b, pa.x, pa.z);
      }
    }
  }

  // --- Voiture contre piéton ---
  for (const car of vehicles) {
    // Seule une voiture qui roule peut renverser quelqu'un
    if (car.state !== 'driving' || !car.dir) continue;

    for (const ped of pedestrians) {
      if (ped.state !== 'walking') continue;

      const pc = car.model.position;
      const pp = ped.model.position;
      const distance = Math.hypot(pc.x - pp.x, pc.z - pp.z);

      if (distance < CAR_RADIUS + PED_RADIUS) {
        // Projeté dans la direction où roule la voiture
        launchPedestrian(ped, car.dir.dc, car.dir.dr, car.speed);
      }
    }
  }
}