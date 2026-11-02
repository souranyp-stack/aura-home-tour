import * as THREE from 'three';

// Scroll progress p ∈ [0,1] drives the whole film. Camera keys are
// interpolated with time-knotted Hermite splines so velocity stays continuous
// across keys of different durations.

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// shift: horizontal framing offset (fraction of width) that keeps the subject
// clear of the chapter copy; positive moves the subject right.
export const CAMERA_KEYS = [
  { p: 0.0, pos: V(88, 52, -98), tgt: V(3, 9.5, 2), fov: 22, shift: 0.22 },
  { p: 0.07, pos: V(64, 47, -112), tgt: V(3, 9, 2), fov: 22, shift: 0.2 },
  { p: 0.15, pos: V(30, 40, -112), tgt: V(3, 7, 2), fov: 24, shift: 0.13 },
  { p: 0.24, pos: V(52, 26, -72), tgt: V(3, 5, 2), fov: 28, shift: -0.14 },
  { p: 0.33, pos: V(44, 9, -26), tgt: V(3, 4, 2), fov: 32, shift: -0.12 },
  { p: 0.39, pos: V(24, 3.2, -30), tgt: V(3, 4.5, 0), fov: 30, shift: 0.12 },
  { p: 0.45, pos: V(10, 9, -52), tgt: V(2, 3, 1), fov: 32, shift: 0.06 },
  { p: 0.52, pos: V(-40, 26, -125), tgt: V(2, -4, 0), fov: 34, shift: -0.06 },
  { p: 0.6, pos: V(-95, -16, -128), tgt: V(4, -5, 0), fov: 24, shift: -0.1 },
  { p: 0.66, pos: V(-46, 10, -52), tgt: V(4, 3, 0), fov: 34, shift: 0 },
  { p: 0.71, pos: V(-6, 6.3, -21), tgt: V(3, 5.3, 0), fov: 40, shift: 0 },
  { p: 0.745, pos: V(2.3, 5.7, -7.2), tgt: V(2.3, 5.5, 2), fov: 44, shift: 0 },
  { p: 0.79, pos: V(2.0, 5.65, 0.0), tgt: V(-4, 5.0, 5.5), fov: 46, shift: 0 },
  { p: 0.85, pos: V(-1.0, 5.6, 6.6), tgt: V(1.0, 5.1, -6), fov: 44, shift: 0.1 },
  { p: 0.92, pos: V(-6.0, 5.55, 7.0), tgt: V(3.0, 5.0, -5), fov: 42, shift: 0 },
  { p: 1.0, pos: V(-6.5, 5.6, 7.2), tgt: V(3.0, 5.0, -5), fov: 42, shift: 0 },
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
  return { fov: hermite(CAMERA_KEYS, 'fov', p), shift: hermite(CAMERA_KEYS, 'shift', p) };
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const remap = (p, a, b) => clamp01((p - a) / (b - a));
const sstep = (p, a, b) => { const t = remap(p, a, b); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

// The scripted environment along the film.
export function storyAt(p) {
  // the day moves with the story: late afternoon, golden hour, then dusk indoors
  const time =
    p < 0.45 ? 18.7 :
    p < 0.6 ? lerp(18.7, 19.1, sstep(p, 0.45, 0.6)) :
    p < 0.75 ? lerp(19.1, 19.4, sstep(p, 0.6, 0.75)) :
    lerp(19.4, 19.72, sstep(p, 0.75, 0.9));
  const worldT = remap(p, 0.435, 0.58);
  return {
    assemble: remap(p, 0.13, 0.33),
    sweep: lerp(-12, 18, sstep(p, 0.33, 0.45)),
    studio: 1 - sstep(p, 0.43, 0.53),
    voidOpacity: 1 - sstep(p, 0.44, 0.53),
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
