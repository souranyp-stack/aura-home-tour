import * as THREE from 'three';

// Scroll progress p ∈ [0,1] drives the whole film. Camera keys are
// interpolated with time-knotted Hermite splines so velocity stays continuous
// across keys of different durations.

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA_KEYS = [
  { p: 0.0, pos: V(40.8, 12.7, -62.5), tgt: V(3, 6, 2), fov: 30 },
  { p: 0.07, pos: V(28.2, 10.2, -65.2), tgt: V(3, 6, 2), fov: 30 },
  { p: 0.15, pos: V(1.1, 8.9, -66.4), tgt: V(3, 5.5, 2), fov: 32 },
  { p: 0.24, pos: V(-33.8, 14, -49.2), tgt: V(3, 4.5, 2), fov: 34 },
  { p: 0.33, pos: V(-42.6, 14.8, -16.9), tgt: V(2, 4, 2), fov: 34 },
  { p: 0.39, pos: V(-31.6, 6.5, -26.8), tgt: V(2, 3.5, 2), fov: 32 },
  { p: 0.45, pos: V(-24, 9, -40), tgt: V(2, 3, 1), fov: 34 },
  { p: 0.52, pos: V(-70, 18, -95), tgt: V(0, -2, 0), fov: 36 },
  { p: 0.6, pos: V(-30, -22, -150), tgt: V(2, -6, 0), fov: 30 },
  { p: 0.66, pos: V(34, 10, -58), tgt: V(4, 3, 0), fov: 36 },
  { p: 0.71, pos: V(6, 6.2, -18), tgt: V(3, 5.3, 0), fov: 40 },
  { p: 0.745, pos: V(2.3, 5.7, -7.2), tgt: V(2.3, 5.5, 2), fov: 44 },
  { p: 0.79, pos: V(2.0, 5.65, 0.0), tgt: V(-4, 5.0, 5.5), fov: 46 },
  { p: 0.85, pos: V(-1.0, 5.6, 6.6), tgt: V(1.0, 5.1, -6), fov: 44 },
  { p: 0.92, pos: V(-6.0, 5.55, 7.0), tgt: V(3.0, 5.0, -5), fov: 42 },
  { p: 1.0, pos: V(-6.5, 5.6, 7.2), tgt: V(3.0, 5.0, -5), fov: 42 },
];

export const CHAPTERS = [
  { id: 'prologue', p: 0.0 },
  { id: 'sculpture', p: 0.075 },
  { id: 'gravity', p: 0.17 },
  { id: 'matter', p: 0.345 },
  { id: 'ground', p: 0.5 },
  { id: 'threshold', p: 0.665 },
  { id: 'interior', p: 0.78 },
  { id: 'atmosphere', p: 0.925 },
];

function hermite(keys, field, p, out) {
  const n = keys.length;
  let i = 0;
  while (i < n - 2 && p > keys[i + 1].p) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const dt = k2.p - k1.p;
  const t = THREE.MathUtils.clamp((p - k1.p) / dt, 0, 1);
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const isNum = typeof k1[field] === 'number';
  const tan = (a, b, c) => {
    // tangent at b, scaled to this segment's duration; zero at the ends
    if (a === b || b === c) return isNum ? 0 : new THREE.Vector3();
    const span = c.p - a.p;
    if (isNum) return ((c[field] - a[field]) / span) * dt;
    return c[field].clone().sub(a[field]).multiplyScalar(dt / span);
  };
  const m1 = tan(k0, k1, k2), m2 = tan(k1, k2, k3);
  if (isNum) return h00 * k1[field] + h10 * m1 + h01 * k2[field] + h11 * m2;
  return out
    .copy(k1[field]).multiplyScalar(h00)
    .addScaledVector(m1, h10)
    .addScaledVector(k2[field], h01)
    .addScaledVector(m2, h11);
}

export function cameraAt(p, pos, tgt) {
  hermite(CAMERA_KEYS, 'pos', p, pos);
  hermite(CAMERA_KEYS, 'tgt', p, tgt);
  return hermite(CAMERA_KEYS, 'fov', p);
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const remap = (p, a, b) => clamp01((p - a) / (b - a));
const sstep = (p, a, b) => { const t = remap(p, a, b); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

// The scripted environment along the film.
export function storyAt(p) {
  const time =
    p < 0.45 ? 17.9 :
    p < 0.6 ? lerp(17.9, 18.6, sstep(p, 0.45, 0.6)) :
    p < 0.75 ? lerp(18.6, 19.2, sstep(p, 0.6, 0.75)) :
    lerp(19.2, 19.75, sstep(p, 0.75, 0.9));
  const worldT = remap(p, 0.44, 0.6);
  return {
    assemble: remap(p, 0.13, 0.33),
    sweep: lerp(-12, 18, sstep(p, 0.33, 0.45)),
    studio: 1 - sstep(p, 0.43, 0.53),
    voidOpacity: 1 - sstep(p, 0.45, 0.58),
    worldR: 2800 * Math.pow(worldT, 2.2),
    door: sstep(p, 0.7, 0.745),
    env: {
      time,
      mist: 0.08,
      interior: 0.75 * sstep(p, 0.72, 0.82),
      fire: sstep(p, 0.74, 0.8),
      veil: 0,
    },
    controls: sstep(p, 0.885, 0.925),
  };
}
