// The stretch of coast around the house, as a height field in metres, on a map
// 10 units wide and 6.25 deep: x runs east, z runs south, so the land is at the
// top and the sea at the bottom. Everything on the approach map, from the
// contour lines to the elevation profile, reads from these functions.

export const MAP_W = 10, MAP_D = 6.25;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x, y);
    total += amp;
    amp *= 0.5;
    x = x * 2.03 + 11.7;
    y = y * 2.03 + 5.3;
  }
  return sum / total;
}

// where the land meets the sea at each x: the harbour bay, a cove, the headland
export function coastAt(x) {
  return 3.85 + 0.06 * (x - 5)
    - 0.6 * bump(x, 1.6, 0.42)
    - 0.46 * bump(x, 5.4, 0.36)
    + 1.2 * bump(x, 6.7, 0.56)
    - 0.34 * bump(x, 8.2, 0.5)
    + 0.34 * (fbm(x * 0.9 + 3.1, 2.2, 3) - 0.5);
}

const signedDistance = (x, z) => {
  const slope = (coastAt(x + 0.02) - coastAt(x - 0.02)) / 0.04;
  const wander = 0.07 * (fbm(x * 3.2, z * 3.2, 3) - 0.5);
  return (coastAt(x) + wander - z) / Math.sqrt(1 + slope * slope);
};

export const HOUSE = { x: 6.7, z: coastAt(6.7) - 0.17 };
export const groveMask = (x, z) => 1 - smooth(GROVE.r * 0.55, GROVE.r, Math.hypot((x - GROVE.x) * 0.8, z - GROVE.z));

export function heightAt(x, z) {
  const d = signedDistance(x, z);
  if (d < 0) {
    // height crosses zero in a straight line at the shore, so the coast draws cleanly
    return -2.5 * Math.min(1, -d / 0.03) - 96 * smooth(0, 2.3, -d) - 16 * (fbm(x * 0.8, z * 0.8, 3) * smooth(0.05, 1.1, -d));
  }
  // the cliff is a low bank at the harbour and 38 m by the headland
  const cliff = 2.5 + 37 * smooth(2.8, 5.2, x);
  // the hills rise from the line of the coast as a whole, not from each of its
  // bays, or every bump in the shoreline would smear inland
  const inland = 3.85 + 0.06 * (x - 5) - z;
  const massif = 0.62 + 1.25 * (fbm(x * 0.55 + 4, z * 0.55, 5) - 0.5) + 0.34 * (fbm(x * 1.9, z * 1.9, 4) - 0.5);
  let h = 2.5 * Math.min(1, d / 0.03) + cliff * smooth(0, 0.11, d)
    + 340 * smooth(0.1, 3.3, inland) * Math.max(0.08, massif) * smooth(0, 0.9, d)
    + 12 * (fbm(x * 3.1, z * 3.7, 3) - 0.5) * smooth(0.15, 1.2, d);
  // old terraces step the hillside where the olives are
  const g = groveMask(x, z) * smooth(0.12, 0.85, d);
  if (g > 0) {
    h += 105 * g;
    const step = h / 14, base = Math.floor(step), f = step - base;
    h += (14 * (base + smooth(0.25, 0.75, f)) - h) * 0.75 * g;
  }
  // the house stands on a level shelf
  const shelf = 1 - smooth(0.1, 0.27, Math.hypot(x - HOUSE.x, z - HOUSE.z));
  h += (38 - h) * shelf * smooth(0.02, 0.1, d);
  return h;
}

// ---------------------------------------------------------------- the road
const ctrl = [
  [1.62, 0.12], [2.25, 0.3], [3.0, 0.3], [3.6, 0.55], [4.2, 0.95], [4.85, 1.32], [5.45, 1.42], [5.95, 1.16], [6.36, 0.78], [6.7, 0.17],
].map(([x, back]) => [x, coastAt(x) - back]);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
}

const SAMPLES = 900;
const raw = [];
for (let i = 0; i <= SAMPLES; i++) {
  const f = (i / SAMPLES) * (ctrl.length - 1), k = Math.min(ctrl.length - 2, Math.floor(f)), t = f - k;
  const a = ctrl[Math.max(0, k - 1)], b = ctrl[k], c = ctrl[k + 1], e = ctrl[Math.min(ctrl.length - 1, k + 2)];
  // no road runs straight on a hillside: it bends with the ground, and the bends stop at the house
  const u = i / SAMPLES, ease = smooth(0, 0.06, u) * (1 - smooth(0.955, 1, u));
  const bendX = 0.05 * Math.sin(u * 37 + 1) + 0.022 * Math.sin(u * 83);
  const bendZ = 0.055 * Math.sin(u * 29 + 2.2) + 0.024 * Math.sin(u * 71 + 1);
  raw.push([catmull(a[0], b[0], c[0], e[0], t) + bendX * ease, catmull(a[1], b[1], c[1], e[1], t) + bendZ * ease]);
}
const lengths = [0];
for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
export const ROAD_POINTS = raw;
export const ROAD_LENGTH = lengths[lengths.length - 1];
// the signposted distance is 6.2 km; the map's scale bar follows from that
export const ROAD_KM = 6.2;

export function roadAt(km) {
  const target = (Math.min(ROAD_KM, Math.max(0, km)) / ROAD_KM) * ROAD_LENGTH;
  let lo = 0, hi = lengths.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lengths[m] < target) lo = m; else hi = m; }
  const t = (target - lengths[lo]) / Math.max(1e-6, lengths[hi] - lengths[lo]);
  const x = raw[lo][0] + (raw[hi][0] - raw[lo][0]) * t, z = raw[lo][1] + (raw[hi][1] - raw[lo][1]) * t;
  return { x, z, index: lo + t };
}

// the olive terraces lie around the 4.6 km mark
const groveCentre = roadAt(4.6);
export const GROVE = { x: groveCentre.x, z: groveCentre.z, r: 0.78 };
