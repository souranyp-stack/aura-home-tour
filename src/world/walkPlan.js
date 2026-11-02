import { edgeZ, heightAt } from './landscape.js';
import { FL } from './house.js';

// Where a visitor can stand. Everything here is measured for the centre of a
// person about 0.25 m in radius, so it reads directly as "can my feet go here".
// The house has two levels joined by the external stair; each has its own rules.

export const EYE = 1.62;
const STAIR = { x0: 12.45, x1: 13.55, top: 10, bottom: 16.4 };

// The lower level, inside the stone plinth. Each bedroom looks out to sea; behind
// it a lobby runs back to the corridor, with its bathroom off to one side.
export const LOWER = {
  ceiling: 3.28,
  wallA: [4.5, 4.65], // bedrooms | lobbies and bathrooms
  wallB: [6.9, 7.02], // lobbies and bathrooms | corridor
  doorHead: 2.2,
  bathDoor: [5.3, 6.2],
  door: [2.2, 3.8], // the front door, in the north wall
};
export const LOWER_ROOMS = [
  { n: 1, x0: -9, x1: -3.5, pass: [-9, -7.4], bath: [-7.3, -3.5] },
  { n: 2, x0: -3.5, x1: 2, pass: [-3.5, -1.9], bath: [-1.8, 2] },
  { n: 3, x0: 2, x1: 7.5, pass: [2, 3.6], bath: [3.7, 7.5] },
  { n: 4, x0: 7.5, x1: 14.4, pass: [7.5, 9.1], bath: [9.2, 14.4] },
].map((r) => ({ ...r, bedAt: (r.pass[1] + r.x1) / 2, chairAt: r.x0 + 0.95 }));
// the inside stair, rising eastward from the corridor to the living room
export const INSIDE_STAIR = { x0: -6.6, x1: -0.66, z0: 7, z1: 8 };

const inRect = (x, z, r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const inCircle = (x, z, c) => Math.hypot(x - c[0], z - c[1]) < c[2];

// the floors of the upper level, which together make one connected walk
const UPPER_FLOORS = [
  [-8.75, -7.6, 3.25, -4.25], // the terrace
  [1.3, -4.3, 3.2, -3.75], // the sliding door
  [-8.75, -3.75, 10.75, 7.75], // living room, dining room and kitchen
  [3.25, -4.55, 11.3, -4.25], // the coping along the pool
  [11.25, -4.55, 15.75, 9.75], // the east deck
  [-8.75, 8.6, 15.75, 9.75], // the walk behind the back wall
];
const UPPER_BLOCKS = [
  [-4.95, 3.3, -1.05, 4.9], // sofa
  [-4.1, 1.7, -1.9, 3.1], // coffee table
  [0.95, 7.2, 6.05, 7.75], // credenza
  [-9, 4.25, -6.45, 7.6], // hearth and its bench
  [4.15, 1.7, 8.85, 4.3], // dining table and chairs
  [6.95, 5.1, 10.45, 6.85], // kitchen island and stools
  [6.35, 7.1, 10.75, 7.75], // kitchen wall
  [-6.85, 6.75, -0.62, 7.75], // the stair opening
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

// The lower level's floors and furniture, generated from its layout.
const LOWER_FLOORS = [
  [-8.75, 8.25, 14.15, 9.15], // the corridor
  [-8.75, 7.27, -6.7, 8.25], // the foot of the stair
  [-0.4, 7.27, 14.15, 8.25],
  [LOWER.door[0] + 0.25, 9.1, LOWER.door[1] - 0.25, 10.2], // the front door
];
const LOWER_BLOCKS = [[-2.95, 8.85, -0.85, 9.15]]; // the gallery bench
const LOWER_ROUND = [];
for (const r of LOWER_ROOMS) {
  const [a, b] = r.bath, inner = r.pass[0] + 0.45, outer = r.pass[0] + 1.05;
  LOWER_FLOORS.push(
    [r.x0 + 0.33, -1.45, r.x0 + 1.72, 4.25], // bedroom: the reading corner
    [r.x0 + 0.33, -0.92, r.x1 - 0.33, 4.25], // bedroom, clear of the window seat
    [inner, 4.2, outer, 4.95], // door from the bedroom to the lobby
    [r.pass[0] + 0.3, 4.9, r.pass[1] - 0.2, 6.7], // lobby
    [inner, 6.65, outer, 7.3], // door from the lobby to the corridor
    [r.pass[1] - 0.3, 5.5, a + 0.4, 6], // door to the bathroom
    [a + 0.25, 4.9, b - 0.25, 6.65], // bathroom
  );
  LOWER_BLOCKS.push(
    [r.bedAt - 1.3, 2.05, r.bedAt + 1.3, 4.25], // bed
    [r.bedAt - 1.85, 3.7, r.bedAt + 1.85, 4.25], // bedside tables
    [r.bedAt - 1, 1.25, r.bedAt + 1, 2.1], // bench
    [a + 0.9, 4.65, a + 3.1, 5.6], // tub
    [a + 1, 6.2, a + 3, 6.9], // vanity
    [a, 6.05, a + 0.8, 6.9], // WC
  );
  LOWER_ROUND.push([r.chairAt, -0.45, 0.68], [r.chairAt + 0.02, 0.5, 0.4], [a + 0.5, 5, 0.36]);
}
LOWER_BLOCKS.push([INSIDE_STAIR.x0, 7, INSIDE_STAIR.x1 + 0.2, 8.15]); // under the stair

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
  const onInside = (x, z) => x >= INSIDE_STAIR.x0 - 0.15 && x <= INSIDE_STAIR.x1 + 0.2 && z >= 7.22 && z <= 7.78;
  const inDoor = (x, z) => x >= LOWER.door[0] + 0.25 && x <= LOWER.door[1] - 0.25 && z >= 9.8 && z <= 10.25;

  function canStand(x, z, level) {
    if (level === 'stair') {
      if (onStair(x, z)) return true;
      if (z < STAIR.top) return canStand(x, z, 'upper');
      if (z > STAIR.bottom) return canStand(x, z, 'ground');
      return false;
    }
    if (level === 'inside') {
      if (onInside(x, z)) return true;
      if (x > INSIDE_STAIR.x1) return canStand(x, z, 'upper');
      if (x < INSIDE_STAIR.x0) return canStand(x, z, 'lower');
      return false;
    }
    if (level === 'lower') {
      if (onInside(x, z) && x < INSIDE_STAIR.x0 + 0.35) return true;
      if (!LOWER_FLOORS.some((r) => inRect(x, z, r))) return false;
      if (LOWER_BLOCKS.some((r) => inRect(x, z, r))) return false;
      return !LOWER_ROUND.some((c) => inCircle(x, z, c));
    }
    if (level === 'upper') {
      if (onStair(x, z) && z < STAIR.top + 0.5) return true;
      if (onInside(x, z) && x > INSIDE_STAIR.x1 - 0.45) return true;
      if (!UPPER_FLOORS.some((r) => inRect(x, z, r))) return false;
      if (UPPER_BLOCKS.some((r) => inRect(x, z, r))) return false;
      return !UPPER_ROUND.some((c) => inCircle(x, z, c));
    }
    if (onStair(x, z) && z > STAIR.bottom - 0.5) return true;
    if (inDoor(x, z)) return true;
    if (Math.hypot(x - 3, z - 3) > 120) return false;
    if (z < edgeZ(x) + 1.7) return false;
    if (GROUND_BLOCKS.some((r) => inRect(x, z, r))) return false;
    if (COURT_ROUND.some((c) => inCircle(x, z, c))) return false;
    return !trunks.some((c) => inCircle(x, z, c));
  }

  function levelAfter(x, z, level) {
    if (level === 'inside') {
      if (x > INSIDE_STAIR.x1 + 0.05) return 'upper';
      if (x < INSIDE_STAIR.x0 - 0.05) return 'lower';
      return 'inside';
    }
    if (level === 'lower') {
      if (z > 10.1) return 'ground';
      if (onInside(x, z) && x >= INSIDE_STAIR.x0) return 'inside';
      return 'lower';
    }
    if (level === 'ground' && inDoor(x, z) && z < 10) return 'lower';
    if (level === 'upper' && onInside(x, z) && x <= INSIDE_STAIR.x1) return 'inside';
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
    if (level === 'lower') return 0.02;
    if (level === 'inside') {
      const t = Math.min(1, Math.max(0, (x - INSIDE_STAIR.x0) / (INSIDE_STAIR.x1 - INSIDE_STAIR.x0)));
      return 0.02 + (FL - 0.02) * t;
    }
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
    if (level === 'inside') return { name: 'The inside stair', note: 'Oak treads on a steel spine' };
    if (level === 'lower') {
      if (z > LOWER.wallB[0]) return { name: 'The gallery', note: 'Lower level, ±0.00' };
      const r = LOWER_ROOMS.find((q) => x <= q.x1) || LOWER_ROOMS[3];
      if (z < LOWER.wallA[1]) return { name: `Bedroom ${r.n}`, note: 'Lower level, facing the sea' };
      if (x > r.pass[1]) return { name: `Bathroom ${r.n}`, note: 'Honed stone, lit from behind' };
      return { name: `The lobby to bedroom ${r.n}`, note: 'Lower level, ±0.00' };
    }
    if (level === 'upper') {
      if (x > 11.2) return { name: 'The east deck', note: 'Upper level, +4.05' };
      if (z > 8.2) return { name: 'Behind the house', note: 'Upper level, +4.05' };
      if (z < -4.3 && x > 2.2) return { name: 'Beside the pool', note: 'A vanishing edge to the sea' };
      if (z < -4) return { name: 'The terrace', note: 'Five metres out over the cliff' };
      if (x < -3.9 && z > 2.4) return { name: 'By the fire', note: 'Living room, +4.05' };
      if (x > 6 && z > 4.6) return { name: 'The kitchen', note: 'Travertine and walnut' };
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
  { id: 'kitchen', label: 'Kitchen', level: 'upper', at: [6.3, 4.85], look: [11, 4.9, 7.3] },
  { id: 'bedroom', label: 'Bedroom', level: 'lower', at: [7.05, -0.6], look: [4.4, 0.72, 3.8] },
  { id: 'bathroom', label: 'Bathroom', level: 'lower', at: [4.15, 5.85], look: [6.2, 0.75, 5.2] },
  { id: 'gallery', label: 'Gallery', level: 'lower', at: [-4, 8.75], look: [9, 1.5, 8.4] },
  { id: 'deck', label: 'East deck', level: 'upper', at: [14.2, 3.0], look: [7, 3.6, -9] },
  { id: 'court', label: 'Entry court', level: 'ground', at: [-5, 15.4], look: [13, 3.2, 12.4] },
  { id: 'cliff', label: 'Cliff edge', level: 'ground', at: [29, 6.5], look: [4, 5.4, -5] },
];
