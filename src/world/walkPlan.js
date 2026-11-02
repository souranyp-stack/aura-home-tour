import { edgeZ, heightAt } from './landscape.js';
import { FL } from './house.js';

// Where a visitor can stand. Everything here is measured for the centre of a
// person about 0.25 m in radius, so it reads directly as "can my feet go here".
// The house has two levels joined by the external stair; each has its own rules.

export const EYE = 1.62;
const STAIR = { x0: 12.45, x1: 13.55, top: 10, bottom: 16.4 };

const inRect = (x, z, r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const inCircle = (x, z, c) => Math.hypot(x - c[0], z - c[1]) < c[2];

// the floors of the upper level, which together make one connected walk
const UPPER_FLOORS = [
  [-8.75, -7.6, 3.25, -4.25], // the terrace
  [1.3, -4.3, 3.2, -3.75], // the sliding door
  [-8.75, -3.75, 10.75, 7.75], // living room and dining room
  [3.25, -4.55, 11.3, -4.25], // the coping along the pool
  [11.25, -4.55, 15.75, 9.75], // the east deck
  [-8.75, 8.6, 15.75, 9.75], // the walk behind the back wall
];
const UPPER_BLOCKS = [
  [-4.95, 3.3, -1.05, 4.9], // sofa
  [-4.1, 1.7, -1.9, 3.1], // coffee table
  [-3.95, 7.2, 1.15, 7.75], // console
  [-9, 4.25, -6.45, 7.6], // hearth and its bench
  [4.65, 1.7, 8.35, 4.3], // dining table and chairs
  [-6.85, -7.35, -5.55, -4.85], // loungers
  [-4.65, -7.35, -3.35, -4.85],
];
const UPPER_ROUND = [
  [-1.75, 2.95, 0.58], // side table
  [-4.95, 1.4, 0.72], // armchairs
  [-1.05, 1.4, 0.72],
  [9.5, -2.7, 0.6], // potted olive
  [-5.1, -6.6, 0.5], // terrace drum
];

const GROUND_BLOCKS = [
  [-13.25, -2.25, 15.25, 10], // plinth
  [-10.45, -11.25, -8.75, 15.25], // spine wall
  [16.45, 0.75, 17.75, 7.25], // east fin
  [11.95, 10, 14.05, 16.4], // the side of the stair
];
const COURT = [-9, 10, 15, 16];
const COURT_ROUND = [[9.5, 13.2, 2.65]]; // the planter

export function createFloorPlan(plantings = []) {
  // pines, cypresses and olives have trunks; shrubs are walked through
  const trunks = plantings.filter((p) => p.type !== 'shrub').map((p) => [p.x, p.z, 0.55]);

  const onStair = (x, z) => x >= STAIR.x0 && x <= STAIR.x1 && z >= STAIR.top - 0.3 && z <= STAIR.bottom + 0.1;

  function canStand(x, z, level) {
    if (level === 'stair') {
      if (onStair(x, z)) return true;
      if (z < STAIR.top) return canStand(x, z, 'upper');
      if (z > STAIR.bottom) return canStand(x, z, 'ground');
      return false;
    }
    if (level === 'upper') {
      if (onStair(x, z) && z < STAIR.top + 0.5) return true;
      if (!UPPER_FLOORS.some((r) => inRect(x, z, r))) return false;
      if (UPPER_BLOCKS.some((r) => inRect(x, z, r))) return false;
      return !UPPER_ROUND.some((c) => inCircle(x, z, c));
    }
    if (onStair(x, z) && z > STAIR.bottom - 0.5) return true;
    if (Math.hypot(x - 3, z - 3) > 120) return false;
    if (z < edgeZ(x) + 1.7) return false;
    if (GROUND_BLOCKS.some((r) => inRect(x, z, r))) return false;
    if (COURT_ROUND.some((c) => inCircle(x, z, c))) return false;
    return !trunks.some((c) => inCircle(x, z, c));
  }

  function levelAfter(x, z, level) {
    if (level === 'stair') {
      if (z < STAIR.top - 0.2) return 'upper';
      if (z > STAIR.bottom) return 'ground';
      return 'stair';
    }
    if (onStair(x, z) && (level === 'upper' ? z >= STAIR.top : z <= STAIR.bottom)) return 'stair';
    return level;
  }

  function floorY(x, z, level) {
    if (level === 'upper') return FL;
    if (level === 'stair') {
      const t = Math.min(1, Math.max(0, (z - STAIR.top) / (STAIR.bottom - STAIR.top)));
      return FL + (0.24 - FL) * t;
    }
    return inRect(x, z, COURT) ? 0.24 : Math.max(heightAt(x, z), 0);
  }

  // Slides along whatever is in the way rather than stopping dead.
  function move(state, dx, dz) {
    const { level } = state;
    let { x, z } = state;
    if (canStand(x + dx, z, level)) x += dx;
    if (canStand(x, z + dz, level)) z += dz;
    state.x = x;
    state.z = z;
    state.level = levelAfter(x, z, level);
    return state;
  }

  function whereIs(x, z, level) {
    if (level === 'stair') return { name: 'The stair', note: 'Twenty-two stone steps' };
    if (level === 'upper') {
      if (x > 11.2) return { name: 'The east deck', note: 'Upper level, +4.05' };
      if (z > 8.2) return { name: 'Behind the house', note: 'Upper level, +4.05' };
      if (z < -4.3 && x > 2.2) return { name: 'Beside the pool', note: 'A vanishing edge to the sea' };
      if (z < -4) return { name: 'The terrace', note: 'Five metres out over the cliff' };
      if (x < -3.9 && z > 2.4) return { name: 'By the fire', note: 'Living room, +4.05' };
      if (x > 4) return { name: 'The dining room', note: 'Upper level, +4.05' };
      return { name: 'The living room', note: 'Twenty metres of glass' };
    }
    if (inRect(x, z, COURT)) return { name: 'The entry court', note: 'At grade, ±0.00' };
    if (z - edgeZ(x) < 12) return { name: 'The cliff edge', note: '38 m above the sea' };
    return { name: 'The headland', note: 'Olive and pine' };
  }

  return { canStand, floorY, move, whereIs };
}

// Named places to arrive at. Look is the point the visitor faces on arrival.
export const PLACES = [
  { id: 'pool', label: 'Pool', level: 'upper', at: [2.9, -6.1], look: [17, 3.6, -6.2] },
  { id: 'terrace', label: 'Terrace', level: 'upper', at: [1.7, -4.8], look: [-8, 3.6, -8.5] },
  { id: 'living', label: 'Living room', level: 'upper', at: [1.5, -1.6], look: [-5, 4.8, 4.6] },
  { id: 'fire', label: 'Fire', level: 'upper', at: [-5.6, 2.6], look: [-7.2, 4.9, 5.75] },
  { id: 'dining', label: 'Dining', level: 'upper', at: [9.6, 1.0], look: [5, 4.9, 3.4] },
  { id: 'deck', label: 'East deck', level: 'upper', at: [14.2, 3.0], look: [7, 3.6, -9] },
  { id: 'court', label: 'Entry court', level: 'ground', at: [-5, 15.4], look: [13, 3.2, 12.4] },
  { id: 'cliff', label: 'Cliff edge', level: 'ground', at: [29, 6.5], look: [4, 5.4, -5] },
];
