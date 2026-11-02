import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { metricUV } from './materials.js';
import { FL } from './house.js';
import { mergeStatic } from '../core/merge.js';
import { buildKitchen, buildLowerLevel } from './rooms.js';

// Living pavilion interior: x -9…11, z -4…8, floor FL, ceiling FL + 3.45.
// Every material here uses 'reveal' mode, so it prints in behind the sweep.

const CEIL = FL + 3.45;

export function mesh(geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
export const boxG = (w, h, d) => metricUV(new THREE.BoxGeometry(w, h, d));
export const rbox = (w, h, d, r = 0.06) => metricUV(new RoundedBoxGeometry(w, h, d, 4, r));

// A slab bent along a side profile: the profile curve lives in the y-z plane,
// the slab's local z runs along it and local y becomes the offset from it.
export function bentSlab(w, t, profile, r = 0.03) {
  const curve = new THREE.CatmullRomCurve3(profile.map(([y, z]) => new THREE.Vector3(0, y, z)));
  const len = curve.getLength();
  const g = new RoundedBoxGeometry(w, t, len, 6, r);
  const pos = g.attributes.position;
  const P = new THREE.Vector3(), T = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = THREE.MathUtils.clamp(z / len + 0.5, 0, 1);
    curve.getPointAt(u, P);
    curve.getTangentAt(u, T);
    pos.setXYZ(i, x, P.y + T.z * y, P.z - T.y * y);
  }
  g.computeVertexNormals();
  return metricUV(g);
}

// Anything soft. Unlike a rounded box this has vertices across its faces, so it
// can crown like something filled, ease out at the sides, and carry the very slight
// unevenness that stops upholstery looking machined.
export function cushion(w, h, d, crown = 0.03, r = 0.06, { puff = crown * 0.35, wrinkle = 0.0016 } = {}) {
  const seg = (a) => Math.max(4, Math.min(30, Math.ceil(a / 0.05)));
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const pos = g.attributes.position;
  const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const ix = w / 2 - rr, iy = h / 2 - rr, iz = d / 2 - rr;
  const P = new THREE.Vector3(), C = new THREE.Vector3();
  const seed = w * 13.7 + d * 7.1 + h * 3.3;
  for (let i = 0; i < pos.count; i++) {
    P.fromBufferAttribute(pos, i);
    C.set(THREE.MathUtils.clamp(P.x, -ix, ix), THREE.MathUtils.clamp(P.y, -iy, iy), THREE.MathUtils.clamp(P.z, -iz, iz));
    const n = P.clone().sub(C);
    if (n.lengthSq() > 1e-10) P.copy(C).addScaledVector(n.normalize(), rr);
    const u = (2 * P.x) / w, v = (2 * P.z) / d, t = (2 * P.y) / h;
    const fill = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
    if (P.y > 0) P.y += crown * fill;
    else P.y -= crown * 0.25 * fill;
    const side = Math.max(0, 1 - t * t);
    P.x += Math.sign(P.x) * puff * side * Math.abs(u) ** 3;
    P.z += Math.sign(P.z) * puff * side * Math.abs(v) ** 3;
    if (wrinkle > 0) {
      const a = Math.sin(P.x * 23 + seed) * Math.cos(P.z * 19 - seed * 0.7) + 0.6 * Math.sin((P.x + P.z) * 41 + seed * 1.3);
      P.y += wrinkle * a * (P.y > 0 ? 1 : 0.3);
      P.x += wrinkle * 0.5 * Math.sin(P.y * 37 + seed) * Math.sign(P.x) * Math.abs(u);
    }
    pos.setXYZ(i, P.x, P.y, P.z);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  welded.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(welded.attributes.position.count * 2), 2));
  return metricUV(welded);
}

// A tapered round member between two points, for joints that must actually meet.
export function rod(mat, a, b, ra, rb = ra, opts) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.CylinderGeometry(rb, ra, len, 14), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, opts);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

// A square-section member between two points: slim metal frames.
export function bar(mat, a, b, t = 0.016, opts) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.BoxGeometry(t, len, t), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, opts);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

// A curtain panel hanging from y = 0, its pivot at the end it gathers to. Pleats stay
// the same depth as it compresses, so it looks fuller as it opens.
export function drape(len, h, dir) {
  const g = new THREE.PlaneGeometry(len, h, Math.ceil(len / 0.03), 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + len / 2;
    pos.setXYZ(i, x * dir, pos.getY(i) - h / 2, Math.sin(x * 31) * 0.042 + Math.sin(x * 4.3 + 1) * 0.018);
  }
  g.computeVertexNormals();
  return metricUV(g);
}

// A row of stitches along a straight seam.
export function stitches(group, a, b, mat, pitch = 0.016) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const n = Math.floor(A.distanceTo(B) / pitch);
  const dir = B.clone().sub(A).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  for (let i = 0; i <= n; i++) {
    const m = mesh(new THREE.BoxGeometry(pitch * 0.62, 0.0022, 0.0022), mat, 0, 0, 0, { cast: false, receive: false });
    m.position.copy(A).addScaledVector(dir, i * pitch);
    m.quaternion.copy(q);
    group.add(m);
  }
}

// A reeded surface: half-round ribs side by side, facing +z, ribs running up y.
export function reeded(w, h, pitch = 0.03, depth = 0.008) {
  const ribs = Math.round(w / pitch);
  const g = new THREE.PlaneGeometry(w, h, ribs * 6, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = ((pos.getX(i) + w / 2) / pitch) % 1;
    pos.setZ(i, depth * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)));
  }
  g.computeVertexNormals();
  // the grain runs up the ribs, the same across each one
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getY(i), pos.getX(i));
  return g;
}

// A drum with flutes cut around it.
export function fluted(rTop, rBottom, h, flutes = 44, depth = 0.05) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, flutes * 6, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), rad = Math.hypot(x, z);
    if (rad < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k = 1 - depth * Math.abs(Math.cos((a * flutes) / 2));
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return metricUV(g);
}

export function tube(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.1);
  return new THREE.TubeGeometry(curve, Math.max(24, points.length * 14), radius, 10, false);
}

function sofa(M) {
  // Low and square, as modern sofas are: it floats on a recessed bronze base, with
  // deep loose cushions, slim arms and soft pillows. Faces -z.
  const g = new THREE.Group();
  g.add(mesh(rbox(3.14, 0.06, 0.84, 0.008), M.bronzeInterior, 0, 0.03, 0.02));
  g.add(mesh(cushion(3.4, 0.16, 1.06, 0.004, 0.035, { wrinkle: 0.0008 }), M.boucle, 0, 0.16, 0));
  for (const sx of [-1, 1]) {
    g.add(mesh(cushion(1.5, 0.17, 0.82, 0.03, 0.05), M.boucle, sx * 0.76, 0.325, -0.1));
    const back = mesh(cushion(1.5, 0.5, 0.2, 0.012, 0.075), M.boucle, sx * 0.76, 0.56, 0.3);
    back.rotation.x = 0.13;
    g.add(back);
    g.add(mesh(cushion(0.17, 0.36, 1.06, 0.006, 0.07), M.boucle, sx * 1.615, 0.36, 0));
  }
  // the full-height back behind the loose cushions
  g.add(mesh(cushion(3.4, 0.42, 0.14, 0.004, 0.06), M.boucle, 0, 0.42, 0.46));
  // pillows, in linen and leather against the boucle
  const pillow = (w, h, mat, x, y, z, rx, ry, rz = 0) => {
    const p = mesh(cushion(w, 0.13, h, 0.05, 0.05), mat, x, y, z);
    p.rotation.set(rx + Math.PI / 2, ry, rz);
    g.add(p);
  };
  pillow(0.52, 0.52, M.linenClay, -1.14, 0.63, 0.1, 0.22, 0.18);
  pillow(0.46, 0.46, M.linenCharcoal, -0.72, 0.6, 0.07, 0.3, -0.1);
  pillow(0.56, 0.32, M.cognac, 1.12, 0.56, 0.04, 0.34, -0.14);
  // a throw folded over the arm
  g.add(mesh(cushion(0.2, 0.012, 0.86, 0.003, 0.006, { wrinkle: 0.002 }), M.linenClay, 1.615, 0.548, 0.02));
  return g;
}

// A run of piping (a welted seam) along a path, in a contrasting leather or cord.
export function piping(points, mat, r = 0.0065) {
  return mesh(tube(points, r), mat, 0, 0, 0, { cast: false });
}

// Tapered turned leg, slightly splayed.
export function leg(mat, x, z, h, rTop, rBot, splay = 0.06) {
  const m = mesh(new THREE.CylinderGeometry(rTop, rBot, h, 18), mat, x, h / 2, z);
  m.rotation.z = -Math.sign(x) * splay;
  m.rotation.x = Math.sign(z) * splay;
  return m;
}

// Modern lounge chair: a slim bronze frame carrying channel-tufted leather. Faces -z.
// 780 x 820, seat at 400. The channels are separate soft strips, so they catch light
// the way stuffed leather does, and every seam is stitched.
export function loungeChair(M) {
  const g = new THREE.Group();
  const quiet = { cast: false };
  // two sled frames, tied across under the seat
  for (const sx of [-1, 1]) {
    const x = sx * 0.375;
    g.add(bar(M.bronzeInterior, [x, 0.012, -0.4], [x, 0.012, 0.4], 0.018));
    g.add(bar(M.bronzeInterior, [x, 0.012, -0.36], [x, 0.47, -0.36], 0.018));
    g.add(bar(M.bronzeInterior, [x, 0.012, 0.37], [x, 0.47, 0.37], 0.018));
    g.add(bar(M.bronzeInterior, [x, 0.47, -0.37], [x, 0.47, 0.38], 0.018));
    // the arm: a leather pad wrapped over the top rail, its seams stitched
    g.add(mesh(cushion(0.086, 0.032, 0.8, 0.005, 0.014, { wrinkle: 0.0005 }), M.cognac, x, 0.492, 0));
    for (const ox of [-0.03, 0.03]) stitches(g, [x + ox, 0.5135, -0.385], [x + ox, 0.5135, 0.385], M.thread);
  }
  g.add(bar(M.bronzeInterior, [-0.375, 0.17, -0.34], [0.375, 0.17, -0.34], 0.018));
  g.add(bar(M.bronzeInterior, [-0.375, 0.17, 0.34], [0.375, 0.17, 0.34], 0.018));
  g.add(bar(M.bronzeInterior, [-0.375, 0.17, 0], [0.375, 0.17, 0], 0.018));
  // seat: a base roll with five channels running front to back
  g.add(mesh(cushion(0.72, 0.07, 0.72, 0.002, 0.024, { wrinkle: 0 }), M.cognacDark, 0, 0.215, -0.02));
  const CH = 5, cw = 0.138;
  for (let i = 0; i < CH; i++) {
    const x = (i - (CH - 1) / 2) * cw;
    g.add(mesh(cushion(cw + 0.004, 0.135, 0.7, 0.022, 0.042, { puff: 0.002, wrinkle: 0.0012 }), M.cognac, x, 0.3, -0.03));
  }
  // back: the same channels, raked, on a leather-covered shell
  const back = new THREE.Group();
  back.position.set(0, 0.56, 0.31);
  back.rotation.x = 0.26;
  back.add(mesh(cushion(0.72, 0.56, 0.05, 0.002, 0.02, { wrinkle: 0 }), M.cognacDark, 0, 0.0, 0.05));
  for (let i = 0; i < CH; i++) {
    const x = (i - (CH - 1) / 2) * cw;
    const strip = mesh(cushion(cw + 0.004, 0.11, 0.54, 0.018, 0.04, { puff: 0.002, wrinkle: 0.0012 }), M.cognac, x, 0.0, -0.015);
    strip.rotation.x = -Math.PI / 2; // crowned toward the sitter
    back.add(strip);
  }
  g.add(back);
  // the frame's back posts, rising to hold the shell
  for (const sx of [-1, 1]) g.add(bar(M.bronzeInterior, [sx * 0.3, 0.17, 0.34], [sx * 0.3, 0.72, 0.42], 0.016));
  // a small linen kidney pillow
  const p = mesh(cushion(0.44, 0.1, 0.22, 0.04, 0.045), M.linenClay, 0.02, 0.46, 0.2);
  p.rotation.set(Math.PI / 2 + 0.3, 0, 0.03);
  g.add(p);
  return g;
}

// A panel curved across its width, so a chair back wraps around the sitter.
function bowedPanel(w, h, t, bow) {
  const g = new THREE.BoxGeometry(w, h, t, 24, 6, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (2 * pos.getX(i)) / w;
    pos.setZ(i, pos.getZ(i) + bow * (1 - u * u));
  }
  g.computeVertexNormals();
  return metricUV(g);
}

// Dining chair: modern, light and properly joined. Its back is at +z, so the sitter
// faces -z. Each rear leg is one straight line from floor to shoulder with the back
// bowed between them, front legs taper to the floor, and the seat is a stitched pad.
// 500 x 520, seat at 460.
function diningChair(M) {
  const g = new THREE.Group();
  const rearFoot = 0.255, shoulderY = 0.8, shoulderZ = 0.285, seatY = 0.42;
  const rake = Math.atan2(shoulderZ - 0.222, shoulderY - seatY);
  for (const sx of [-1, 1]) {
    const x = sx * 0.2;
    g.add(rod(M.walnut, [x, 0, -0.225], [x, seatY, -0.2], 0.0105, 0.0175)); // front leg
    g.add(rod(M.walnut, [x, 0, rearFoot], [x, seatY, 0.222], 0.0105, 0.0165)); // rear leg below the seat
    g.add(rod(M.walnut, [x, seatY, 0.222], [x, shoulderY, shoulderZ], 0.0165, 0.012)); // and above it
    g.add(rod(M.walnut, [x, 0.215, -0.212], [x, 0.215, 0.238], 0.0075)); // side stretcher
  }
  g.add(rod(M.walnut, [-0.2, 0.255, 0.234], [0.2, 0.255, 0.234], 0.0075)); // back stretcher
  // seat frame, flush with the legs
  for (const [a, b] of [[[-0.2, seatY, -0.2], [0.2, seatY, -0.2]], [[-0.2, seatY, 0.222], [0.2, seatY, 0.222]], [[-0.2, seatY, -0.2], [-0.2, seatY, 0.222]], [[0.2, seatY, -0.2], [0.2, seatY, 0.222]]])
    g.add(bar(M.walnut, a, b, 0.024));
  g.add(mesh(rbox(0.43, 0.012, 0.44, 0.004), M.walnut, 0, seatY + 0.015, 0.01));
  // the pad: crowned, with its front edge stitched
  g.add(mesh(cushion(0.45, 0.046, 0.455, 0.014, 0.02, { wrinkle: 0.0008 }), M.cognac, 0, seatY + 0.042, 0.008));
  stitches(g, [-0.19, seatY + 0.074, -0.203], [0.19, seatY + 0.074, -0.203], M.thread);
  // the back: a bowed walnut shell between the posts, lined in leather. It leans with
  // the posts and its tips land on them, so nothing floats and nothing pokes through.
  const backY = 0.715, backZ = 0.222 + Math.tan(rake) * (backY - seatY);
  const back = new THREE.Group();
  back.position.set(0, backY, backZ);
  back.rotation.x = rake;
  back.add(mesh(bowedPanel(0.43, 0.2, 0.012, 0.028), M.walnut, 0, 0, 0.0));
  back.add(mesh(bowedPanel(0.4, 0.17, 0.012, 0.028), M.cognac, 0, 0, -0.011));
  stitches(back, [-0.17, 0.07, 0.009], [0.17, 0.07, 0.009], M.thread);
  g.add(back);
  return g;
}

// Teak chaise: two side rails on square legs (wheels at the head), a run of
// 22 slats, a hinged slatted backrest, thick piped cushions and a rolled towel.
function lounger(M) {
  const g = new THREE.Group();
  const L = 1.98, W = 0.7;
  for (const sx of [-1, 1]) g.add(mesh(rbox(0.05, 0.085, L, 0.008), M.teak, sx * (W / 2 - 0.025), 0.27, 0));
  for (const z of [-0.18, L / 2 - 0.06]) g.add(mesh(rbox(W - 0.1, 0.06, 0.04, 0.006), M.teak, 0, 0.25, z));
  for (const [sx, z] of [[-1, L / 2 - 0.08], [1, L / 2 - 0.08], [-1, -L / 2 + 0.14], [1, -L / 2 + 0.14]])
    g.add(mesh(rbox(0.05, 0.27, 0.05, 0.006), M.teak, sx * (W / 2 - 0.025), 0.135, z));
  for (const sx of [-1, 1]) {
    const wheel = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 28), M.basalt, sx * (W / 2 + 0.01), 0.075, -L / 2 + 0.07);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
  }
  for (let i = 0; i < 22; i++) g.add(mesh(rbox(W - 0.08, 0.018, 0.058, 0.005), M.teak, 0, 0.32, -0.36 + i * 0.062));
  // backrest, hinged at z = -0.4 and raised 38 degrees
  const back = new THREE.Group();
  back.position.set(0, 0.32, -0.4);
  back.rotation.x = 0.66;
  for (const sx of [-1, 1]) back.add(mesh(rbox(0.04, 0.04, 0.6, 0.006), M.teak, sx * (W / 2 - 0.07), 0, -0.3));
  for (let i = 0; i < 9; i++) back.add(mesh(rbox(W - 0.16, 0.016, 0.052, 0.005), M.teak, 0, 0.02, -0.04 - i * 0.064));
  back.add(mesh(cushion(W - 0.12, 0.065, 0.6, 0.02, 0.03), M.outdoorFabric, 0, 0.06, -0.31));
  back.add(piping([[-(W - 0.12) / 2, 0.06, -0.01], [0, 0.062, -0.01], [(W - 0.12) / 2, 0.06, -0.01]], M.cord, 0.007));
  g.add(back);
  g.add(mesh(cushion(W - 0.12, 0.075, 1.36, 0.022, 0.03), M.outdoorFabric, 0, 0.368, 0.3));
  for (const sx of [-1, 1]) g.add(piping([[sx * (W - 0.12) / 2, 0.378, -0.37], [sx * (W - 0.12) / 2, 0.38, 0.3], [sx * (W - 0.12) / 2, 0.378, 0.97]], M.cord, 0.007));
  // rolled towel resting at the head of the seat
  const towel = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.46, 32), M.towel, 0, 0.47, -0.3);
  towel.rotation.z = Math.PI / 2;
  g.add(towel);
  return g;
}

export function vase(M, mat, h, r) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const rr = r * (0.55 + 0.6 * Math.sin(Math.PI * (0.15 + t * 0.75))) * (t > 0.92 ? 0.7 : 1);
    pts.push(new THREE.Vector2(Math.max(0.01, rr), t * h));
  }
  const geo = new THREE.LatheGeometry(pts, 40);
  return mesh(geo, mat, 0, 0, 0);
}

const FIRE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FIRE_FRAG = /* glsl */ `
uniform float uTime; uniform float uIntensity; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ return n(p)*0.5 + n(p*2.1)*0.3 + n(p*4.3)*0.2; }
void main(){
  vec2 uv = vUv;
  float t = uTime;
  float tongues = fbm(vec2(uv.x * 9.0, uv.y * 2.5 - t * 2.6));
  float body = (1.0 - uv.y) * (0.5 + tongues * 1.05) - 0.3;
  float f = smoothstep(0.0, 0.55, body);
  f *= smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x);
  vec3 col = mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.72, 0.36), smoothstep(0.35, 0.95, f));
  gl_FragColor = vec4(col * f * f * uIntensity * 1.15, 1.0);
}`;

export function createInterior(M) {
  const root = new THREE.Group();
  root.name = 'interior';

  // floor and ceiling light lines
  // the oak floor stops at the opening for the inside stair (x -6.6…-0.66, z 7…8)
  root.add(mesh(boxG(19.9, 0.02, 10.9), M.floorOak, 1, FL + 0.01, 1.55, { cast: false }));
  root.add(mesh(boxG(2.35, 0.02, 0.9), M.floorOak, -7.775, FL + 0.01, 7.45, { cast: false }));
  root.add(mesh(boxG(11.61, 0.02, 0.9), M.floorOak, 5.145, FL + 0.01, 7.45, { cast: false }));
  const strips = [];
  for (const z of [0.4, 5.4]) {
    const s = mesh(boxG(17, 0.02, 0.05), M.lightStrip, 1.2, CEIL - 0.02, z, { cast: false, receive: false });
    strips.push(s);
    root.add(s);
  }

  // hearth: firebox on the east face of the chimney mass (x = -7.2)
  const fireX = -7.2, fireZ = 5.75;
  // firebox: blackened steel surround proud of the stone, a deep sooted box, a
  // bed of ceramic stones; the hearth bench is a single travertine block
  const fx = fireX + 0.06;
  root.add(mesh(rbox(0.12, 0.78, 1.96, 0.01), M.steel, fireX + 0.0, FL + 0.84, fireZ, { cast: false }));
  root.add(mesh(boxG(0.02, 0.6, 1.72), M.soot, fireX + 0.075, FL + 0.84, fireZ, { cast: false }));
  root.add(mesh(boxG(0.3, 0.6, 0.02), M.soot, fireX + 0.0, FL + 0.84, fireZ - 0.86, { cast: false }));
  root.add(mesh(boxG(0.3, 0.6, 0.02), M.soot, fireX + 0.0, FL + 0.84, fireZ + 0.86, { cast: false }));
  for (let i = 0; i < 26; i++) {
    const r = 0.035 + ((i * 37) % 11) * 0.003;
    const st = mesh(new THREE.SphereGeometry(r, 10, 7), M.ceramicDark, fx + 0.02 + ((i * 13) % 5) * 0.012, FL + 0.56 + r * 0.6, fireZ - 0.78 + (i / 25) * 1.56, { cast: false });
    st.scale.y = 0.6;
    root.add(st);
  }
  root.add(mesh(rbox(0.52, 0.38, 3.2, 0.015), M.wallTravertine, fireX + 0.26, FL + 0.19, fireZ));
  const fireUniforms = { uTime: { value: 0 }, uIntensity: { value: 0 } };
  const fireMat = new THREE.ShaderMaterial({
    uniforms: fireUniforms, vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.48), fireMat);
    f.position.set(fireX + 0.1 + i * 0.035, FL + 0.84, fireZ);
    f.rotation.y = Math.PI / 2 + (i - 1) * 0.12;
    flames.push(f);
    root.add(f);
  }
  const fireLight = new THREE.PointLight(0xff9a50, 0, 9, 2);
  fireLight.position.set(fireX + 0.7, FL + 0.9, fireZ);
  root.add(fireLight);

  // living group
  const rug = mesh(rbox(5.2, 0.02, 4.0, 0.008), M.wool, -3, FL + 0.03, 2.3, { cast: false });
  root.add(rug);
  const s = sofa(M);
  s.position.set(-3, FL, 4.1);
  root.add(s);
  const c1 = loungeChair(M);
  // the pair faces the coffee table and the sofa across the rug
  c1.position.set(-4.95, FL, 1.4);
  c1.rotation.y = -Math.PI * 0.68;
  root.add(c1);
  const c2 = loungeChair(M);
  c2.position.set(-1.05, FL, 1.4);
  c2.rotation.y = Math.PI * 0.68;
  root.add(c2);
  // coffee table: a honed slab floating on a smaller one, with a fluted drum beside it
  root.add(mesh(rbox(1.2, 0.2, 0.62, 0.01), M.walnut, -3.15, FL + 0.1, 2.42));
  root.add(mesh(rbox(1.7, 0.05, 0.9, 0.008), M.travertine, -3.0, FL + 0.255, 2.4));
  root.add(mesh(fluted(0.32, 0.3, 0.42, 48, 0.035), M.basalt, -1.75, FL + 0.21, 2.95));
  root.add(mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.016, 64), M.bronzeInterior, -1.75, FL + 0.428, 2.95, { cast: false }));
  const books = [[0.36, 0.05, 0.26, M.cognac], [0.32, 0.04, 0.24, M.ceramic], [0.3, 0.035, 0.22, M.basalt]];
  let by = FL + 0.28;
  for (const [w, h, d, mt] of books) {
    const b = mesh(boxG(w, h, d), mt, -3.4, by + h / 2, 2.25);
    b.rotation.y = (Math.random() - 0.5) * 0.3;
    by += h;
    root.add(b);
  }
  const bowl = vase(M, M.ceramicDark, 0.12, 0.16);
  bowl.position.set(-2.55, FL + 0.305, 2.5);
  root.add(bowl);

  // credenza and artwork on the travertine back wall
  root.add(mesh(rbox(4.6, 0.5, 0.48, 0.01), M.walnut, 3.5, FL + 0.31, 7.72));
  root.add(mesh(boxG(4.4, 0.06, 0.4), M.basalt, 3.5, FL + 0.03, 7.74));
  // reeded walnut doors, with one bronze pull each
  const doors = mesh(reeded(4.5, 0.42, 0.026, 0.007), M.walnut, 3.5, FL + 0.31, 7.474);
  doors.rotation.y = Math.PI;
  root.add(doors);
  for (let i = 1; i < 4; i++) root.add(mesh(boxG(0.004, 0.44, 0.012), M.basalt, 3.5 - 2.3 + i * 1.15, FL + 0.31, 7.468, { cast: false }));
  for (let i = 0; i < 4; i++) root.add(mesh(rbox(0.014, 0.14, 0.014, 0.003), M.bronzeInterior, 3.5 - 2.3 + 0.575 + i * 1.15 + 0.48, FL + 0.31, 7.456, { cast: false }));
  root.add(mesh(boxG(2.4, 1.6, 0.04), M.art, 3.5, FL + 1.92, 7.93));
  root.add(mesh(boxG(2.5, 1.7, 0.015), M.basalt, 3.5, FL + 1.92, 7.985, { cast: false }));
  for (const [w, h, x, y] of [[2.5, 0.012, 0, 0.85], [2.5, 0.012, 0, -0.85], [0.012, 1.7, 1.25, 0], [0.012, 1.7, -1.25, 0]])
    root.add(mesh(boxG(w, h, 0.06), M.walnut, 3.5 + x, FL + 1.92 + y, 7.96, { cast: false }));
  const v1 = vase(M, M.ceramic, 0.62, 0.15); v1.position.set(1.8, FL + 0.55, 7.7); root.add(v1);
  const v2 = vase(M, M.ceramicDark, 0.38, 0.12); v2.position.set(2.15, FL + 0.55, 7.68); root.add(v2);
  const v3 = vase(M, M.terracotta, 0.3, 0.16); v3.position.set(5.2, FL + 0.55, 7.72); root.add(v3);

  // dining
  root.add(mesh(rbox(3.2, 0.05, 1.1, 0.018), M.oak, 6.5, FL + 0.745, 3.0));
  root.add(mesh(rbox(3.0, 0.03, 0.94, 0.01), M.walnut, 6.5, FL + 0.708, 3.0));
  for (const x of [5.45, 7.55]) {
    root.add(mesh(rbox(0.08, 0.69, 0.78, 0.012), M.walnut, x, FL + 0.345, 3.0));
    root.add(mesh(rbox(0.14, 0.02, 0.86, 0.006), M.bronzeInterior, x, FL + 0.012, 3.0, { cast: false }));
  }
  root.add(mesh(rbox(2.1, 0.09, 0.05, 0.01), M.walnut, 6.5, FL + 0.6, 3.0));
  // every chair turns its back away from the table, tucked in ready to sit at
  const seats = [
    [5.4, 2.14, Math.PI], [6.5, 2.14, Math.PI], [7.6, 2.14, Math.PI],
    [5.4, 3.86, 0], [6.5, 3.86, 0], [7.6, 3.86, 0],
    [4.62, 3.0, -Math.PI / 2], [8.38, 3.0, Math.PI / 2],
  ];
  for (const [x, z, r] of seats) {
    const ch = diningChair(M);
    ch.position.set(x, FL, z);
    ch.rotation.y = r;
    root.add(ch);
  }
  // pendant: a shallow linen drum
  const shade = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.32, 64, 1, true), M.pendantShade, 6.5, FL + 2.05, 3.0, { cast: false });
  root.add(shade);
  root.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2, 6), M.bronzeInterior, 6.5, FL + 2.8, 3.0, { cast: false }));
  const pendantLight = new THREE.PointLight(0xffc68a, 0, 8, 2);
  pendantLight.position.set(6.5, FL + 1.9, 3.0);
  root.add(pendantLight);
  // recessed downlights: a wide spot washes the living group from the soffit,
  // the fittings themselves are small glowing apertures, not a hot spot
  const livingLight = new THREE.SpotLight(0xffd6a8, 0, 0, 0.95, 1.0, 2);
  livingLight.position.set(-3, CEIL - 0.04, 2.5);
  livingLight.target.position.set(-3, FL, 2.4);
  root.add(livingLight, livingLight.target);
  for (const [x, z] of [[-4.6, 1.2], [-1.4, 1.2], [-4.6, 3.8], [-1.4, 3.8], [5.0, 5.6], [8.0, 5.6], [-1.4, 6.6], [2.6, 6.6]]) {
    root.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24), M.lightStrip, x, CEIL - 0.004, z, { cast: false, receive: false }));
    root.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 32), M.bronzeInterior, x, CEIL - 0.002, z, { cast: false, receive: false }));
  }

  // potted olive inside the glass corner and a tall plant by the west glazing
  const pot = vase(M, M.terracotta, 0.62, 0.36);
  pot.position.set(9.5, FL, -2.7);
  root.add(pot);

  // sheer curtains along the sea glazing, on a bronze track: two panels that draw in
  // from the ends and meet at the door, gathering into pleats as they open
  const drapes = [];
  root.add(mesh(rbox(19.8, 0.024, 0.04, 0.006), M.bronzeInterior, 1, CEIL - 0.03, -3.78, { cast: false }));
  for (const [pivot, len, dir] of [[-8.85, 11.1, 1], [10.85, 8.6, -1]]) {
    const panel = mesh(drape(len, 3.36, dir), M.linen, pivot, CEIL - 0.04, -3.78, { cast: false, receive: true });
    drapes.push(panel);
    root.add(panel);
  }

  // terrace: a travertine drum between the loungers, with a ceramic bowl
  root.add(mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.42, 48), M.travertine, -5.1, FL + 0.21, -6.6));
  const tb = vase(M, M.ceramicDark, 0.08, 0.12);
  tb.position.set(-5.1, FL + 0.42, -6.6);
  root.add(tb);

  // terrace loungers facing the sea
  for (const x of [-6.2, -4.0]) {
    const l = lounger(M);
    l.position.set(x, FL, -6.1);
    l.rotation.y = Math.PI;
    root.add(l);
  }

  buildKitchen(root, M);
  const lower = buildLowerLevel(root, M);

  // furniture is static: collapse ~120 parts into one draw per material
  drapes.push(...lower.drapes);
  mergeStatic(root, [...flames, ...drapes, lower.mirror]);

  const outdoorOlivePos = new THREE.Vector3(9.5, FL + 0.6, -2.7);

  function update(env, time) {
    fireUniforms.uTime.value = time;
    const flick = 0.85 + 0.15 * Math.sin(time * 11.0) * Math.sin(time * 7.3 + 1.0);
    fireUniforms.uIntensity.value = env.fire;
    fireLight.intensity = env.fire * 14 * flick;
    const lux = env.interior;
    livingLight.intensity = lux * 40;
    pendantLight.intensity = lux * 14;
    M.lightStrip.emissiveIntensity = lux * 3.2;
    M.pendantShade.emissiveIntensity = lux * 1.4;
    // gathered at the ends when open, drawn across when closed
    drapes.forEach((d) => { d.scale.x = 0.075 + 0.925 * env.veil; });
  }

  return { root, update, outdoorOlivePos, flames, lower };
}
