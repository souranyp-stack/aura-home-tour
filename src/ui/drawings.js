import { heightAt, SEA, edgeZ } from '../world/landscape.js';

// Architectural drawings generated from the same coordinates as the model
// (metres; x along the coast, z inland, y up). Plans put the sea at the
// bottom of the sheet; the section is cut at x = 2.25 through the sliding
// door, looking west. Every stroked element can be drawn on with DrawSVG.

const NS = 'http://www.w3.org/2000/svg';
const f = (n) => n.toFixed(1);

function sheet(w, h) {
  const out = [];
  const defs = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(239,233,223,0.35)" stroke-width="1"/></pattern>
  <pattern id="rock" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="9" stroke="rgba(239,233,223,0.13)" stroke-width="0.8"/></pattern>
  <pattern id="conc" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.7" fill="rgba(239,233,223,0.4)"/><circle cx="5" cy="4.6" r="0.5" fill="rgba(239,233,223,0.3)"/><circle cx="3.6" cy="6.2" r="0.35" fill="rgba(239,233,223,0.3)"/></pattern></defs>`;
  return {
    add: (s) => out.push(s),
    svg: (label) => `<svg class="drw" xmlns="${NS}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${defs}${out.join('')}</svg>`,
  };
}

// ---------------------------------------------------------------- plans
const PX0 = -14.5, PX1 = 19.5, PZ0 = -11.5, PZ1 = 17.5;
const K = 20; // px per metre
const W = (PX1 - PX0) * K, H = (PZ1 - PZ0) * K;
const X = (x) => (x - PX0) * K;
const Y = (z) => (PZ1 - z) * K;
export const planXY = (x, z) => [X(x), Y(z)];

const rect = (x0, z0, x1, z1, cls, extra = '') =>
  `<rect class="${cls}" ${extra} x="${f(X(Math.min(x0, x1)))}" y="${f(Y(Math.max(z0, z1)))}" width="${f(Math.abs(x1 - x0) * K)}" height="${f(Math.abs(z1 - z0) * K)}"/>`;
const line = (x0, z0, x1, z1, cls, extra = '') => `<line class="${cls}" ${extra} x1="${f(X(x0))}" y1="${f(Y(z0))}" x2="${f(X(x1))}" y2="${f(Y(z1))}"/>`;
const poly = (pts, cls, closed = true) => `<${closed ? 'polygon' : 'polyline'} class="${cls}" points="${pts.map(([x, z]) => `${f(X(x))},${f(Y(z))}`).join(' ')}"/>`;
const circle = (x, z, r, cls) => `<circle class="${cls}" cx="${f(X(x))}" cy="${f(Y(z))}" r="${f(r * K)}"/>`;
const text = (x, z, s, cls = 't-room', anchor = 'middle', rot = 0) =>
  `<text class="${cls}" text-anchor="${anchor}" x="${f(X(x))}" y="${f(Y(z))}"${rot ? ` transform="rotate(${rot} ${f(X(x))} ${f(Y(z))})"` : ''}>${s}</text>`;

function rotRect(cx, cz, w, d, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}

function cliffEdge(sh) {
  const pts = [];
  for (let x = PX0; x <= PX1; x += 0.5) pts.push([x, edgeZ(x)]);
  sh.add(poly(pts, 'l-ground', false));
  sh.add(text(PX0 + 0.6, edgeZ(PX0 + 0.6) - 0.9, 'Cliff edge', 't-dim', 'start'));
}

function furnitureUpper(sh) {
  sh.add(rect(-5.6, 0.3, -0.4, 4.3, 'l-fur'));
  sh.add(rect(-4.68, 3.58, -1.32, 4.62, 'l-fur'));
  sh.add(rect(-4.68, 4.32, -1.32, 4.62, 'l-fur'));
  sh.add(rect(-3.85, 1.95, -2.15, 2.85, 'l-fur'));
  sh.add(circle(-1.75, 2.95, 0.32, 'l-fur'));
  sh.add(poly(rotRect(-4.95, 1.4, 0.82, 0.84, Math.PI * 0.68), 'l-fur'));
  sh.add(poly(rotRect(-1.05, 1.4, 0.82, 0.84, -Math.PI * 0.68), 'l-fur'));
  sh.add(rect(4.9, 2.45, 8.1, 3.55, 'l-fur'));
  for (const x of [5.4, 6.5, 7.6]) { sh.add(rect(x - 0.24, 1.96, x + 0.24, 2.44, 'l-fur')); sh.add(rect(x - 0.24, 3.56, x + 0.24, 4.04, 'l-fur')); }
  sh.add(circle(6.5, 3.0, 0.8, 'l-fur'));
  sh.add(rect(-3.7, 7.48, 0.9, 7.96, 'l-fur'));
  for (const x of [-6.2, -4.0]) sh.add(rect(x - 0.38, -7.1, x + 0.38, -5.1, 'l-fur'));
  sh.add(circle(9.5, -2.7, 0.36, 'l-fur'));
  sh.add(circle(9.5, -2.7, 0.9, 'l-fur'));
}

function northAndScale(sh, x, z) {
  // scale bar 0 – 5 – 10 m
  sh.add(line(x, z, x + 10, z, 'l-cut'));
  for (const t of [0, 5, 10]) { sh.add(line(x + t, z - 0.25, x + t, z + 0.25, 'l-thin')); sh.add(text(x + t, z - 1.1, `${t}`, 't-dim')); }
  sh.add(text(x + 10.6, z - 0.15, 'm', 't-dim', 'start'));
  // north: the sea is to the south-west of the terrace
  const nx = x + 13.2, nz = z + 0.4;
  sh.add(circle(nx, nz, 0.9, 'l-thin'));
  sh.add(poly([[nx, nz + 1.4], [nx - 0.35, nz - 0.3], [nx, nz + 0.1], [nx + 0.35, nz - 0.3]], 'l-cut'));
  sh.add(text(nx, nz + 2.1, 'N', 't-dim'));
}

export function upperPlan() {
  const sh = sheet(W, H);
  cliffEdge(sh);
  sh.add(rect(-10, -9.5, 17.5, 10, 'l-dim', 'stroke-dasharray="5 4"'));
  sh.add(text(17.2, 9.3, 'Roof over', 't-dim', 'end'));
  sh.add(poly([[-10, 10], [16, 10], [16, -4.4], [3.5, -4.4], [3.5, -8], [-10, -8]], 'l-thin'));
  sh.add(rect(3.5, -8, 17, -4.4, 'f-water'));
  sh.add(rect(3.8, -7.75, 16.7, -4.7, 'l-glass'));
  sh.add(line(-10, -7.9, 3.5, -7.9, 'l-glass'));
  // glazing and mullions
  sh.add(line(-9, -4, 11, -4, 'l-glass'));
  sh.add(line(11, -4, 11, 8, 'l-glass'));
  for (let k = 0; k <= 8; k++) sh.add(line(-9 + k * 2.5, -4.18, -9 + k * 2.5, -3.82, 'l-cut'));
  for (let k = 1; k <= 4; k++) sh.add(line(10.82, -4 + k * 3, 11.18, -4 + k * 3, 'l-cut'));
  sh.add(line(1, -4.25, 3.46, -4.25, 'l-thin', 'stroke-dasharray="3 3"'));
  sh.add(text(2.25, -4.9, 'Slides', 't-dim'));
  // walls
  sh.add(rect(-9, 8, 11, 8.35, 'l-solid'));
  sh.add(rect(-10.2, -11, -9, 15, 'f-hatch'));
  sh.add(rect(16.7, 1, 17.5, 7, 'f-hatch'));
  sh.add(rect(-9, 4.5, -7.2, 7, 'f-hatch'));
  // external stair down to the court
  sh.add(rect(12.2, 10, 13.8, 16.4, 'l-thin'));
  for (let i = 1; i < 22; i++) sh.add(line(12.2, 10 + i * 0.291, 13.8, 10 + i * 0.291, 'l-fur'));
  sh.add(text(13, 8.9, 'Down', 't-dim'));
  furnitureUpper(sh);
  // section mark A–A through the door
  sh.add(line(2.25, -10.8, 2.25, 15.5, 'l-dim', 'stroke-dasharray="10 4 2 4"'));
  sh.add(circle(2.25, -10.8, 0.6, 'l-thin'));
  sh.add(text(2.25, -11.0, 'A', 't-dim'));
  sh.add(circle(2.25, 15.9, 0.6, 'l-thin'));
  sh.add(text(2.25, 15.7, 'A', 't-dim'));
  // rooms
  sh.add(text(-3, 0.2, 'Living'));
  sh.add(text(6.5, 1.3, 'Dining'));
  sh.add(text(-6.7, 5.8, 'Hearth', 't-room', 'start'));
  sh.add(text(-3.3, -6.3, 'Terrace'));
  sh.add(text(10.25, -6.45, 'Pool'));
  sh.add(text(-9.6, 1, 'Spine wall', 't-dim', 'middle', -90));
  northAndScale(sh, 4.2, -10.9);
  return sh.svg('Upper level plan: living pavilion, terrace and pool');
}

export function lowerPlan() {
  const sh = sheet(W, H);
  cliffEdge(sh);
  // entry court at grade
  sh.add(rect(-9, 10, 15, 16, 'l-thin'));
  sh.add(circle(9.5, 13.2, 2.4, 'l-fur'));
  sh.add(circle(9.5, 13.2, 0.25, 'l-fur'));
  sh.add(text(3, 13.6, 'Entry court'));
  // the external stair, landing at the edge of the court
  sh.add(rect(12.2, 10, 13.8, 16.4, 'l-thin'));
  for (let i = 1; i < 22; i++) sh.add(line(12.2, 10 + i * 0.291, 13.8, 10 + i * 0.291, 'l-fur'));
  sh.add(text(13, 17, 'Up', 't-dim'));
  // stone plinth: outer face, inner face (wall poche between)
  sh.add(rect(-13, -2, 15, 10, 'l-solid'));
  sh.add(rect(-12.4, -1.4, 14.4, 9.4, 'l-cut', 'style="fill:#121110"'));
  sh.add(line(-8.5, -2.0, 11.5, -2.0, 'l-glass'));
  sh.add(line(-8.5, -1.7, 11.5, -1.7, 'l-glass'));
  sh.add(rect(-10.2, -11, -9, 15, 'f-hatch'));
  // bedrooms along the sea, baths behind, corridor against the hill
  for (const x of [-3.5, 2, 7.5]) sh.add(rect(x - 0.08, -1.4, x + 0.08, 4.6, 'l-solid'));
  sh.add(rect(-9, 4.5, 14.4, 4.65, 'l-solid'));
  for (const x of [-6.2, -0.8, 4.7, 10.2]) sh.add(rect(x - 0.06, 4.65, x + 0.06, 7.2, 'l-solid'));
  sh.add(rect(-9, 7.2, 14.4, 7.32, 'l-solid'));
  for (const [x, n] of [[-6.25, 1], [-0.75, 2], [4.75, 3], [11.0, 4]]) {
    sh.add(text(x, 1.9, `Bedroom ${n}`));
    sh.add(rect(x - 1.0, 0.3, x + 1.0, 2.4 - 0.9, 'l-fur'));
  }
  for (const x of [-3.5, 2, 7.5, 12.4]) sh.add(text(x - 0.1, 5.8, 'Bath', 't-dim'));
  sh.add(text(2.5, 8.15, 'Gallery corridor', 't-dim'));
  // west of the spine: stair and plant
  sh.add(rect(-12.4, 3, -10.2, 9.4, 'l-thin'));
  for (let i = 1; i < 16; i++) sh.add(line(-12.4, 3 + i * 0.4, -10.2, 3 + i * 0.4, 'l-fur'));
  sh.add(text(-11.3, 2.2, 'Stair', 't-dim'));
  sh.add(text(-11.3, 0.4, 'Plant', 't-dim'));
  // entrance
  sh.add(line(2.2, 10, 3.8, 10, 'l-glass'));
  sh.add(text(3, 10.7, 'Entrance', 't-dim'));
  sh.add(line(2.25, -10.8, 2.25, 15.5, 'l-dim', 'stroke-dasharray="10 4 2 4"'));
  northAndScale(sh, 4.2, -10.9);
  return sh.svg('Lower level plan: stone plinth with four bedrooms');
}

// ---------------------------------------------------------------- section
// Section A–A at 1:100 through the sliding door (x = 2.25), looking west.
// The cliff is 38 m tall, so it is drawn with a break: the house and the
// cliff top at full scale above, the waterline in a strip below.
export function sectionAA() {
  const Z0 = -22, Z1 = 23, Y1 = 12, YB = -7.2, YS0 = -30.6, YS1 = -37, GAP = 30;
  const k = 24;
  const w = (Z1 - Z0) * k;
  const upperH = (Y1 - YB) * k;
  const h = upperH + GAP + (YS0 - YS1) * k;
  const sx = (z) => (z - Z0) * k;
  const sy = (y) => (y >= YB ? (Y1 - y) * k : upperH + GAP + (YS0 - y) * k);
  const sh = sheet(w, h);
  const P = (z, y) => `${f(sx(z))},${f(sy(y))}`;
  const r = (z0, y0, z1, y1, cls, extra = '') =>
    `<rect class="${cls}" ${extra} x="${f(sx(Math.min(z0, z1)))}" y="${f(sy(Math.max(y0, y1)))}" width="${f(Math.abs(z1 - z0) * k)}" height="${f(Math.abs(sy(Math.min(y0, y1)) - sy(Math.max(y0, y1))))}"/>`;
  const l = (z0, y0, z1, y1, cls, extra = '') => `<line class="${cls}" ${extra} x1="${f(sx(z0))}" y1="${f(sy(y0))}" x2="${f(sx(z1))}" y2="${f(sy(y1))}"/>`;
  const pl = (pts, cls, closed = false, extra = '') => `<${closed ? 'polygon' : 'polyline'} class="${cls}" ${extra} points="${pts.map(([z, y]) => P(z, y)).join(' ')}"/>`;
  const t = (z, y, str, cls = 't-dim', anchor = 'start') => `<text class="${cls}" text-anchor="${anchor}" x="${f(sx(z))}" y="${f(sy(y))}">${str}</text>`;
  const add = (...a) => a.forEach((x) => sh.add(x));

  // ---- ground: the headland cut at x = 2.25, in two parts either side of the break
  const prof = [];
  for (let z = Z0; z <= Z1 + 1e-6; z += 0.2) prof.push([z, heightAt(2.25, z)]);
  const cross = (yv) => { for (let i = 1; i < prof.length; i++) if (prof[i - 1][1] < yv && prof[i][1] >= yv) return prof[i - 1][0] + (prof[i][0] - prof[i - 1][0]) * (yv - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1]); return Z0; };
  const zTop = cross(YB), zLow = cross(YS0);
  const upper = [[zTop, YB], ...prof.filter(([z, y]) => z > zTop && y >= YB), [Z1, YB]];
  add(pl(upper, 'g-rock', true));
  add(pl(upper.slice(0, -1), 'l-ground'));
  // the foot of the cliff: the face continues below the break into the sea,
  // with a few fallen blocks at the waterline
  const foot = [[zLow, YS0], [zLow - 0.5, SEA + 1.4], [zLow - 0.9, SEA - 0.4], [zLow - 2.4, SEA - 1.6], [zLow - 6, YS1 + 0.9], [Z0, YS1 + 0.5]];
  add(pl([...foot, [Z0, YS1], [Z1, YS1], [Z1, YS0]], 'g-rock', true));
  add(pl(foot, 'l-ground'));
  for (const [bz, by, bw, bh] of [[zLow - 1.9, SEA - 0.2, 1.3, 0.75], [zLow - 3.3, SEA - 0.55, 0.9, 0.5], [zLow - 4.6, SEA - 0.8, 0.6, 0.35]])
    add(`<ellipse class="l-ground g-block" cx="${f(sx(bz))}" cy="${f(sy(by))}" rx="${f(bw * k / 2)}" ry="${f(bh * k / 2)}"/>`);
  // break lines with the conventional zigzag
  // drawn in sheet space: the zigzag must not cross into the other side of the break
  const zig = (z0, z1, y) => {
    const m = sx((z0 + z1) / 2), yy = sy(y);
    const pts = [[sx(z0), yy], [m - 9, yy], [m - 4, yy - 11], [m + 4, yy + 11], [m + 9, yy], [sx(z1), yy]];
    return `<polyline class="l-break" points="${pts.map(([x, v]) => `${f(x)},${f(v)}`).join(' ')}"/>`;
  };
  add(zig(zTop - 0.6, Z1, YB), zig(zLow - 0.6, Z1, YS0));
  add(`<text class="t-note" text-anchor="middle" x="${f(sx((zTop + Z1) / 2 + 4))}" y="${f(upperH + GAP / 2 + 3)}">24 m of bedded limestone omitted</text>`);
  // sea
  const zWater = zLow - 0.7;
  add(l(Z0, SEA, zWater, SEA, 'l-water'));
  for (let i = 0; i < 12; i++) { const z = Z0 + 0.6 + i * 1.6; if (z + 0.7 < zWater) add(l(z, SEA - 0.55, z + 0.7, SEA - 0.55, 'l-wave')); }
  add(t(Z0 + 0.6, SEA + 0.5, 'Sea level', 't-dim'));

  // ---- lower level: stone plinth on footings
  add(r(-2.35, -1.25, -1.35, -0.4, 'f-conc'), r(9.35, -1.25, 10.35, -0.4, 'f-conc'));
  add(r(-2, -0.4, 10, 0, 'f-conc'));
  add(r(-2, 0, -1.7, 1.375, 'f-hatch'), r(-2, 2.725, -1.7, 3.6, 'f-hatch'));
  add(r(-1.74, 1.375, -1.66, 2.725, 'l-glass2'), r(-1.78, 1.33, -1.62, 1.375, 'f-bronze'), r(-1.78, 2.725, -1.62, 2.77, 'f-bronze'));
  add(r(9.7, 2.4, 10, 3.6, 'f-hatch'));
  add(l(9.85, 0, 9.85, 2.4, 'l-glass'), r(9.7, 2.35, 10, 2.4, 'f-bronze'));
  add(r(4.5, 0, 4.65, 3.6, 'f-wall'), r(7.2, 0, 7.32, 3.6, 'f-wall'));
  add(r(5.2, 0, 6.5, 2.1, 'l-beyond'));
  // bed and lamp seen beyond in the bedroom
  add(r(0.3, 0, 2.6, 0.42, 'l-fur'), r(0.35, 0.42, 2.55, 0.6, 'l-fur', 'rx="3"'), r(2.45, 0, 2.6, 1.15, 'l-fur'));
  add(r(2.05, 0.6, 2.4, 0.74, 'l-fur', 'rx="4"'));
  add(l(3.35, 0, 3.35, 0.55, 'l-fur'), r(3.1, 0.55, 3.6, 0.6, 'l-fur'), r(3.2, 0.95, 3.5, 1.2, 'l-fur', 'rx="2"'), l(3.35, 0.6, 3.35, 0.95, 'l-fur'));
  add(t(1.4, 2.6, 'Bedroom', 't-room', 'middle'));

  // ---- upper level
  add(r(-8, 3.6, 10, 4.05, 'f-conc'));
  add(l(-4, 4.05, 8, 4.05, 'l-finish'));
  for (let z = -7.6; z < -4.1; z += 0.6) add(l(z, 4.05, z, 4.12, 'l-fur'));
  add(l(-7.92, 4.05, -7.92, 5.06, 'l-glass'), r(-7.98, 5.06, -7.86, 5.1, 'f-bronze'));
  add(r(-4.05, 4.05, -3.95, 4.11, 'f-bronze'), r(-4.06, 7.4, -3.94, 7.5, 'f-bronze'), l(-4.0, 4.11, -4.0, 7.4, 'l-glass2'));
  add(r(8, 4.05, 8.35, 7.5, 'f-hatch'));
  // roof: core plate, oak soffit, fascia over a shadow gap, membrane and PV
  add(r(-9.38, 7.55, 9.88, 8.0, 'f-conc'));
  add(l(-9.38, 7.5, 9.88, 7.5, 'l-finish'));
  add(r(-9.5, 7.83, -9.47, 8.05, 'f-bronze'), r(9.97, 7.83, 10.0, 8.05, 'f-bronze'));
  add(l(-9.38, 8.02, 9.88, 8.02, 'l-fur'));
  for (let j = 0; j < 5; j++) { const z0 = -2.35 + j * 1.08; add(r(z0, 8.04, z0 + 1.0, 8.09, 'f-bronze')); }
  for (const z of [0.4, 5.4]) add(r(z - 0.05, 7.46, z + 0.05, 7.5, 'f-light'));
  for (const z of [1.2, 3.8, 6.6]) add(r(z - 0.06, 7.47, z + 0.06, 7.5, 'f-light'));
  // seen beyond: the spine wall, the hearth with its firebox, the living group
  add(r(-11, 0.01, 15, 9.5, 'l-beyond'));
  add(t(-10.8, 9.1, 'Spine wall beyond', 't-dim'));
  add(r(4.5, 4.05, 7, 10.2, 'l-beyond'));
  add(r(4.9, 4.53, 6.6, 5.15, 'f-fire'));
  add(r(4.15, 4.05, 7.35, 4.43, 'l-fur'));
  add(r(3.58, 4.05, 4.62, 4.45, 'l-fur', 'rx="4"'), r(4.4, 4.45, 4.62, 4.92, 'l-fur', 'rx="4"'));
  add(r(1.95, 4.05, 2.85, 4.39, 'l-fur'));
  add(r(1.0, 4.15, 1.8, 4.5, 'l-fur', 'rx="3"'), r(1.62, 4.5, 1.8, 4.9, 'l-fur', 'rx="3"'));
  add(t(2, 6.2, 'Living', 't-room', 'middle'), t(5.75, 5.55, 'Hearth beyond', 't-dim', 'middle'));
  add(t(-5.5, 4.6, 'Terrace', 't-dim', 'middle'));

  // ---- entry court and the garden olive beyond
  add(r(10, 0, 16, 0.24, 'f-conc'));
  // the olive: a twisting trunk and a scalloped crown of overlapping clumps
  add(pl([[13.2, 0.24], [13.05, 0.9], [13.3, 1.5], [13.15, 2.2]], 'l-fur'), pl([[13.2, 1.6], [13.9, 2.3]], 'l-fur'), pl([[13.15, 1.8], [12.5, 2.4]], 'l-fur'));
  for (const [cz, cy, cr] of [[12.0, 2.9, 0.75], [12.8, 3.4, 0.85], [13.7, 3.35, 0.8], [14.5, 2.95, 0.7], [13.2, 2.7, 0.7], [12.4, 3.6, 0.55], [14.0, 3.8, 0.55]])
    add(`<circle class="l-fur g-block" cx="${f(sx(cz))}" cy="${f(sy(cy))}" r="${f(cr * k)}"/>`);
  add(t(13.2, -0.9, 'Entry court', 't-dim', 'middle'));

  // ---- people, for scale
  const person = (z, y) => [
    `<circle class="l-person" cx="${f(sx(z))}" cy="${f(sy(y + 1.62))}" r="${f(0.11 * k)}"/>`,
    l(z, y + 1.5, z, y + 0.85, 'l-person'), l(z, y + 0.85, z - 0.16, y, 'l-person'), l(z, y + 0.85, z + 0.14, y, 'l-person'),
    l(z, y + 1.32, z - 0.22, y + 0.9, 'l-person'), l(z, y + 1.32, z + 0.2, y + 0.92, 'l-person'),
  ];
  add(...person(-7.6, 4.05), ...person(-0.6, 4.05), ...person(12.2, 0.24));

  // ---- the sun at 19:30: under the roof edge, across the room, onto the back wall
  const tan = Math.tan((8 * Math.PI) / 180);
  // the ray clears the roof edge by 300 mm and lands on the back wall
  const sunY = (z) => 7.2 - tan * (z + 9.5);
  add(l(Z0 + 0.4, sunY(Z0 + 0.4), 8, sunY(8), 'l-sun'));
  add(`<circle class="f-datum" cx="${f(sx(8))}" cy="${f(sy(sunY(8)))}" r="2.5"/>`);
  add(t(Z0 + 0.6, 7.45, 'Sun at 19:30, 8° above the horizon', 't-sun'));

  // ---- levels, on the right
  const datum = (y, label) => [
    l(16.6, y, 22.6, y, 'l-dim'),
    `<path class="f-datum" d="M${f(sx(17.1))},${f(sy(y))} l${f(-0.18 * k)},${f(-0.3 * k)} l${f(0.36 * k)},0 Z"/>`,
    t(17.5, y + 0.22, label, 't-lev'),
  ];
  add(...datum(8.05, '+8.05 roof'), ...datum(7.5, '+7.50 soffit'), ...datum(4.05, '+4.05 upper floor'), ...datum(0, '±0.00 lower floor'));
  add(...[l(16.6, SEA, 22.6, SEA, 'l-dim'), t(17.5, SEA + 0.22, '−34.00 sea', 't-lev')]);
  // dimension string behind the back wall
  const dz = 11.6;
  add(l(dz, 0, dz, 8.05, 'l-dim'));
  for (const y of [0, 3.6, 4.05, 7.5, 8.05]) add(l(dz - 0.2, y - 0.2, dz + 0.2, y + 0.2, 'l-dim'));
  for (const [y0, y1, s] of [[0, 3.6, '3.60'], [4.05, 7.5, '3.45']]) add(`<text class="t-dim" text-anchor="middle" transform="translate(${f(sx(dz) - 6)},${f(sy((y0 + y1) / 2))}) rotate(-90)">${s}</text>`);
  // horizontal dimensions above the roof
  const hd = (z0, z1, y, s) => [l(z0, y, z1, y, 'l-dim'), l(z0 - 0.2, y - 0.2, z0 + 0.2, y + 0.2, 'l-dim'), l(z1 - 0.2, y - 0.2, z1 + 0.2, y + 0.2, 'l-dim'), t((z0 + z1) / 2, y + 0.3, s, 't-dim', 'middle')];
  add(...hd(-9.5, -4, 9.6, '5.50 roof beyond the glass'), ...hd(-4, 8, 9.6, '12.00 living pavilion'));
  add(...hd(-8, -3.5, 2.9, '4.50 beyond the cliff edge'));
  add(l(-3.5, 3.5, -3.5, 0.2, 'l-dim', 'stroke-dasharray="3 3"'));

  // ---- material notes, set out in the clear space over the sea
  const notes = [
    [10.9, 'Bronze fascia over a 120 mm shadow gap', -9.5, 7.95],
    [10.2, 'Concealed photovoltaic field, 86 m²', -2.0, 8.07],
    [9.5, 'Oak soffit with recessed light lines', -6.5, 7.5],
    [6.2, 'Low-iron glass, bronze frame, sliding', -4.0, 6.2],
    [5.5, 'Frameless glass balustrade', -7.92, 4.8],
    [4.8, 'Honed travertine on pedestals', -7.0, 4.08],
    [1.9, 'Split-face limestone, 600 mm', -1.85, 0.8],
    [1.2, 'Window band, deep reveal', -1.7, 2.0],
    [-0.8, 'Footings on the bedrock', -1.85, -0.85],
  ];
  for (const [y, txt, tz, ty] of notes) add(t(-21.4, y, txt, 't-note'), pl([[-21.4 + txt.length * 0.19 + 0.2, y + 0.12], [tz - 0.6, y + 0.12], [tz, ty]], 'l-leader'), `<circle class="f-datum" cx="${f(sx(tz))}" cy="${f(sy(ty))}" r="2"/>`);
  add(t(Z1 - 0.4, YS1 + 0.6, 'Section A–A · 1:100', 't-title', 'end'));
  return sh.svg('Section A–A through the house and the top of the cliff');
}

// A stylised survey of the coast: the harbour village to the north-west, the
// road along the hills, the headland and the house at its tip.

// ---------------------------------------------------------------- the paper sheet
// Sheet A-101 as it would be printed: a 1600 x 1000 sheet with the title block
// down the left and the upper plan at a large scale, with pencil notes on top.
const nest = (svgStr, x, y, w, h) =>
  svgStr.replace(/<svg class="drw"[^>]*viewBox="([^"]+)"[^>]*>/, `<svg class="drw" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="$1">`)
    .replace(/id="hatch"/g, 'id="pHatch"').replace(/id="rock"/g, 'id="pRock"').replace(/url\(#rock\)/g, 'url(#pRock)');

// a pencil stroke: the points, nudged so the line wavers like a hand
function pencil(points, seed = 1) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.9;
  return 'M' + points.map(([x, y]) => `${(x + r()).toFixed(1)},${(y + r()).toFixed(1)}`).join(' L');
}
function pencilEllipse(cx, cy, rx, ry, seed) {
  const pts = [];
  // a little more than one turn, the way a pencil loop overshoots its start
  for (let i = 0; i <= 118; i++) {
    const a = (i / 108) * Math.PI * 2 - 0.3;
    const w = 1 + 0.035 * Math.sin(a * 3 + 0.6) + 0.02 * Math.sin(a * 7);
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  return pencil(pts, seed);
}

export function paperSheet() {
  // the plan's own coordinates (see upperPlan) mapped onto the sheet
  const S = 1.586, OX = 461, OY = 40;
  const P = (x, z) => [OX + S * (x + 14.5) * 20, OY + S * (17.5 - z) * 20];
  const [lx, ly] = P(-3, 2.3);
  const [gx0, gy] = P(-9, -4);
  const [gx1] = P(11, -4);
  const [px, py] = P(10.25, -6.2);
  const rust = (d, extra = '') => `<path class="pen" d="${d}" ${extra}/>`;
  const notes = [
    rust(pencilEllipse(lx, ly, 150, 96, 3)),
    `<text class="hand" x="${lx + 120}" y="${ly - 120}">the long room, facing sunset</text>`,
    rust(pencil([[lx + 118, ly - 112], [lx + 90, ly - 96], [lx + 70, ly - 86]], 5)),
    rust(pencil([[gx0, gy - 14], [(gx0 + gx1) / 2, gy - 15], [gx1, gy - 14]], 7)),
    rust(pencil([[gx0, gy - 24], [gx0, gy - 4]], 8)),
    rust(pencil([[gx1, gy - 24], [gx1, gy - 4]], 9)),
    `<text class="hand" x="${(gx0 + gx1) / 2 + 60}" y="${gy - 26}" text-anchor="middle">twenty metres of glass</text>`,
    rust(pencil([[px - 40, py + 70], [px - 10, py + 30], [px, py + 14]], 11)),
    rust(pencil([[px - 8, py + 26], [px, py + 14], [px + 10, py + 24]], 12)),
    `<text class="hand" x="${px - 150}" y="${py + 96}">vanishing edge</text>`,
    rust(pencil([[lx - 70, ly + 280], [lx - 90, ly + 330], [lx - 104, ly + 372]], 13)),
    rust(pencil([[lx - 118, ly + 352], [lx - 104, ly + 372], [lx - 86, ly + 356]], 14)),
    `<text class="hand" x="${lx - 84}" y="${ly + 402}">the sea, 38 m below</text>`,
  ].join('');

  const rows = [['Scale', '1 : 100'], ['Sheet', 'A-101'], ['Revision', 'C'], ['Date', 'Oct 2026'], ['Drawn for', 'AURA']];
  const table = rows.map(([k, v], i) => `
    <line class="rule" x1="48" y1="${712 + i * 44}" x2="376" y2="${712 + i * 44}"/>
    <text class="tb-k" x="48" y="${740 + i * 44}">${k}</text>
    <text class="tb-v" x="376" y="${740 + i * 44}" text-anchor="end">${v}</text>`).join('');

  return `<svg class="paper-svg" xmlns="${NS}" viewBox="0 0 1600 1000" preserveAspectRatio="none">
    <rect class="frame" x="22" y="22" width="1556" height="956"/>
    <line class="rule" x1="400" y1="22" x2="400" y2="978"/>
    <text class="tb-title" x="48" y="104">AURA</text>
    <text class="tb-sub" x="50" y="146">The living sanctuary</text>
    <line class="rule" x1="48" y1="182" x2="376" y2="182"/>
    <text class="tb-k" x="48" y="214">Drawing</text>
    <text class="tb-big" x="48" y="252">Upper level plan</text>
    <text class="tb-k" x="48" y="282">Living pavilion · FL +4.05</text>
    ${nest(lowerPlan(), 48, 320, 328, 280)}
    <text class="tb-k" x="48" y="628">Key plan · lower level</text>
    <g transform="translate(330,660)"><circle class="rule" r="18"/><path d="M0,-13 L5,6 L0,2 L-5,6 Z" class="ink"/><text class="tb-k" x="0" y="-26" text-anchor="middle">N</text></g>
    ${table}
    <text class="tb-k" x="48" y="958">Concept, not for construction</text>
    ${nest(upperPlan(), 430, 40, 1140, 920)}
    <g class="notes">${notes}</g>
  </svg>`;
}

// ---------------------------------------------------------------- the sun dial
// A 24-hour dial with solar noon at the top: the sun walks the ring at 15° an
// hour and crosses the horizon at the same sunrise and sunset as the scene.
export const DIAL = { C: 160, ORBIT: 104, NOON: 13.25 };
export const dialAngle = (h) => (h - DIAL.NOON) * 15;

export function sunDial({ sunrise, sunset, from, to }) {
  const { C, ORBIT } = DIAL;
  const polar = (h, r) => {
    const a = (dialAngle(h) * Math.PI) / 180;
    return [C + r * Math.sin(a), C - r * Math.cos(a)];
  };
  const arc = (h0, h1, r, cls, id = '') => {
    const [x0, y0] = polar(h0, r), [x1, y1] = polar(h1, r);
    return `<path ${id && `id="${id}"`} class="${cls}" d="M${f(x0)},${f(y0)} A${r},${r} 0 ${h1 - h0 > 12 ? 1 : 0} 1 ${f(x1)},${f(y1)}"/>`;
  };

  const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

  // the horizon is where the sun's centre crosses it, not where the ring does
  const R = 126;
  const HY = C - ORBIT * Math.cos((dialAngle(sunrise) * Math.PI) / 180);
  const HW = Math.sqrt(R * R - (HY - C) ** 2);
  const xL = C - HW, xR = C + HW;

  let ticks = '';
  for (let i = 0; i < 96; i++) {
    const h = i / 4;
    const len = i % 12 === 0 ? 9 : i % 4 === 0 ? 7 : 4;
    const [x0, y0] = polar(h, 150 - len), [x1, y1] = polar(h, 150);
    const kind = i % 4 === 0 ? ' dial__tick--hour' : '';
    ticks += `<line class="dial__tick${kind}" data-h="${h}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`;
  }
  let nums = '';
  for (let h = 0; h < 24; h += 3) {
    const [x, y] = polar(h, 133.5);
    const minor = h % 6 ? ' dial__num--minor' : '';
    nums += `<text class="dial__num${minor}" x="${f(x)}" y="${f(y + 2.9)}" text-anchor="middle">${String(h).padStart(2, '0')}</text>`;
  }
  const marker = (h) => {
    const a = dialAngle(h);
    return `<path class="dial__mark" transform="rotate(${f(a)} ${C} ${C})" d="M${C},${C - 127} l-2.6,-4.6 h5.2 Z"/>`;
  };
  // stars sit on the disc that carries the sun and moon, scattered by the golden angle
  let stars = '';
  for (let i = 0; i < 34; i++) {
    const a = i * 2.39996, r = 30 + ((i * 37) % 90);
    stars += `<circle cx="${f(C + r * Math.cos(a))}" cy="${f(C + r * Math.sin(a))}" r="${(0.45 + (i % 4) * 0.2).toFixed(2)}"/>`;
  }
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, s = Math.sin(a), c = Math.cos(a), o = i % 2 ? 12 : 14.5;
    rays += `<line x1="${f(8.6 * s)}" y1="${f(8.6 * c)}" x2="${f(o * s)}" y2="${f(o * c)}"/>`;
  }
  let sea = '';
  [3.5, 7, 11.5, 17].forEach((d, i) => { sea += `<line class="dial__swell" x1="${f(xL)}" y1="${f(HY + d)}" x2="${f(xR)}" y2="${f(HY + d)}" style="opacity:${(0.3 - i * 0.06).toFixed(2)}"/>`; });

  return `<svg class="dial" viewBox="0 0 320 320">
    <defs>
      <linearGradient id="dialSky" x1="0" y1="${f(C - R)}" x2="0" y2="${f(HY)}" gradientUnits="userSpaceOnUse">
        <stop id="dialSkyTop" offset="0"/><stop id="dialSkyMid" offset="0.62"/><stop id="dialSkyLow" offset="1"/>
      </linearGradient>
      <linearGradient id="dialSea" x1="0" y1="${f(HY)}" x2="0" y2="${f(C + R)}" gradientUnits="userSpaceOnUse">
        <stop id="dialSeaTop" offset="0"/><stop offset="0.5" stop-color="#0c0d10"/><stop offset="1" stop-color="#090908"/>
      </linearGradient>
      <radialGradient id="dialGlow"><stop class="dial__halo" offset="0" stop-opacity="0.7"/><stop class="dial__halo" offset="0.3" stop-opacity="0.22"/><stop class="dial__halo" offset="0.62" stop-opacity="0.05"/><stop class="dial__halo" offset="1" stop-opacity="0"/></radialGradient>
      <clipPath id="dialAperture"><path d="M${f(xL)},${f(HY)} A${R},${R} 0 1 1 ${f(xR)},${f(HY)} Z"/></clipPath>
      <clipPath id="dialPlate"><path d="M${f(xL)},${f(HY)} A${R},${R} 0 0 0 ${f(xR)},${f(HY)} Z"/></clipPath>
    </defs>

    <g clip-path="url(#dialAperture)">
      <rect x="0" y="0" width="320" height="${f(HY + 1)}" fill="url(#dialSky)"/>
      <g class="dial__stars" id="dialStars">${stars}</g>
      <g class="dial__moon" id="dialMoon">
        <circle class="dial__moon-disc" r="8"/>
        <path class="dial__moon-lit" d="M3,-7.4 A8,8 0 1 0 3,7.4 A9,9 0 0 1 3,-7.4 Z"/>
      </g>
      <line class="dial__ray" id="dialRay" x1="${C}" y1="${C}" x2="${C}" y2="${C - ORBIT}"/>
      <g id="dialSun">
        <circle r="40" fill="url(#dialGlow)"/>
        <g class="dial__rays">${rays}</g>
        <circle class="dial__sun" r="6.4"/>
      </g>
      <!-- the headland and the house, engraved on the horizon -->
      <path class="dial__land" d="M${f(xL - 2)},${f(HY + 1)} L${f(xL - 2)},${f(HY - 6)} C62,${f(HY - 8)} 88,${f(HY - 12)} 112,${f(HY - 18)} C130,${f(HY - 22)} 150,${f(HY - 22)} 212,${f(HY - 22)} L220,${f(HY - 15)} C224,${f(HY - 9)} 226,${f(HY - 4)} 232,${f(HY + 1)} Z"/>
      <g class="dial__house">
        <rect x="160" y="${f(HY - 28)}" width="46" height="6"/>
        <rect x="154" y="${f(HY - 31.5)}" width="58" height="1.8"/>
        <rect class="dial__glass" id="dialGlass" x="162" y="${f(HY - 37)}" width="42" height="5.5"/>
        <rect x="152" y="${f(HY - 38.4)}" width="62" height="1.6"/>
        <rect x="157" y="${f(HY - 42)}" width="3.2" height="20"/>
      </g>
    </g>

    <g clip-path="url(#dialPlate)">
      <rect x="0" y="${f(HY)}" width="320" height="${f(320 - HY)}" fill="url(#dialSea)"/>
      ${sea}
      <g class="dial__glint" id="dialGlint">
        <line x1="-11" y1="3" x2="11" y2="3"/><line x1="-8" y1="7" x2="8" y2="7"/><line x1="-5.5" y1="11.5" x2="5.5" y2="11.5"/><line x1="-3" y1="17" x2="3" y2="17"/>
      </g>
    </g>
    <line class="dial__horizon" x1="${f(xL)}" y1="${f(HY)}" x2="${f(xR)}" y2="${f(HY)}"/>

    <text class="dial__edge" x="${f(xL + 15)}" y="${f(HY + 30)}">${hhmm(sunrise)}</text>
    <text class="dial__edge" x="${f(xR - 15)}" y="${f(HY + 30)}" text-anchor="end">${hhmm(sunset)}</text>
    <text class="dial__value" id="dialValue" x="${C}" y="${f(HY + 44)}" text-anchor="middle"></text>
    <text class="dial__caption" id="dialCaption" x="${C}" y="${f(HY + 58)}" text-anchor="middle"></text>
    <text class="dial__caption dial__caption--alt" id="dialAlt" x="${C}" y="${f(HY + 74)}" text-anchor="middle"></text>

    <circle class="dial__ring" cx="${C}" cy="${C}" r="${R}"/>
    <circle class="dial__ring" cx="${C}" cy="${C}" r="150.5"/>
    ${arc(sunrise, sunset, 127.5, 'dial__sector dial__sector--day')}
    ${ticks}${nums}
    ${marker(sunrise)}${marker(sunset)}
    ${arc(from, to, 154.5, 'dial__track')}
    ${arc(from, to, 154.5, 'dial__done', 'dialDone')}
    <g id="dialPointer">
      <line class="dial__needle" x1="${C}" y1="${C - 140}" x2="${C}" y2="${C - 154.5}"/>
      <circle class="dial__head" cx="${C}" cy="${C - 154.5}" r="3"/>
    </g>
  </svg>`;
}
