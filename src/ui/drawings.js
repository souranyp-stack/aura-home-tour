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
  <pattern id="rock" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="9" stroke="rgba(239,233,223,0.13)" stroke-width="0.8"/></pattern></defs>`;
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
  sh.add(poly(rotRect(-5.4, 1.0, 0.74, 0.8, -Math.PI * 0.82), 'l-fur'));
  sh.add(poly(rotRect(-0.6, 0.9, 0.74, 0.8, Math.PI * 0.82), 'l-fur'));
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
  sh.add(rect(12.2, 6, 13.8, 10, 'l-thin'));
  for (let i = 1; i < 14; i++) sh.add(line(12.2, 6 + i * 0.29, 13.8, 6 + i * 0.29, 'l-fur'));
  sh.add(text(13, 5.2, 'Down', 't-dim'));
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
export function sectionAA() {
  const Z0 = -74, Z1 = 24, Y0 = -38, Y1 = 12.5;
  const k = 12;
  const w = (Z1 - Z0) * k, h = (Y1 - Y0) * k;
  const sx = (z) => (z - Z0) * k;
  const sy = (y) => (Y1 - y) * k;
  const sh = sheet(w, h);
  const r = (z0, y0, z1, y1, cls) => `<rect class="${cls}" x="${f(sx(z0))}" y="${f(sy(y1))}" width="${f((z1 - z0) * k)}" height="${f((y1 - y0) * k)}"/>`;
  const l = (z0, y0, z1, y1, cls, extra = '') => `<line class="${cls}" ${extra} x1="${f(sx(z0))}" y1="${f(sy(y0))}" x2="${f(sx(z1))}" y2="${f(sy(y1))}"/>`;
  const t = (z, y, s, cls = 't-room', anchor = 'middle') => `<text class="${cls}" text-anchor="${anchor}" x="${f(sx(z))}" y="${f(sy(y))}">${s}</text>`;

  // sea
  sh.add(l(Z0, SEA, Z1, SEA, 'l-sea'));
  for (let i = 0; i < 14; i++) sh.add(l(Z0 + 1 + i * 4, SEA - 1.2, Z0 + 3 + i * 4, SEA - 1.2, 'l-sea'));
  sh.add(t(Z0 + 1, SEA + 1.2, 'Sea level', 't-dim', 'start'));
  // ground: cut through the headland at x = 2.25, rock poche below
  const pts = [];
  for (let z = Z0; z <= Z1 + 0.01; z += 0.5) pts.push([z, Math.max(Y0, heightAt(2.25, z))]);
  const ground = pts.map(([z, y]) => `${f(sx(z))},${f(sy(y))}`).join(' ');
  sh.add(`<polygon points="${ground} ${f(sx(Z1))},${f(sy(Y0))} ${f(sx(Z0))},${f(sy(Y0))}" fill="url(#rock)" stroke="none"/>`);
  sh.add(`<polyline class="l-ground" points="${ground}"/>`);
  // the spine beyond (not cut): seen in elevation
  sh.add(r(-11, -6.5, 15, 9.5, 'l-thin'));
  sh.add(t(13.6, 8.6, 'Spine wall beyond', 't-dim', 'end'));
  // cut elements: plinth with its window band, floor plate, terrace, back wall, roof
  sh.add(r(-2, 0, -1.7, 1.375, 'f-hatch'));
  sh.add(r(-2, 2.725, -1.7, 3.6, 'f-hatch'));
  sh.add(r(9.7, 0, 10, 3.6, 'f-hatch'));
  sh.add(l(-1.72, 1.375, -1.72, 2.725, 'l-glass'));
  sh.add(r(-2, -0.4, 10, 0, 'f-hatch'));
  sh.add(r(-8, 3.6, 10, 4.05, 'f-hatch'));
  sh.add(l(-4, 4.05, -4, 7.5, 'l-glass'));
  sh.add(r(8, 4.05, 8.35, 7.5, 'f-hatch'));
  sh.add(r(-9.5, 7.5, 10, 8.05, 'f-hatch'));
  sh.add(l(-7.9, 4.05, -7.9, 5.08, 'l-glass'));
  // stair to the court and the court itself
  sh.add(r(10, 0, 16, 0.24, 'l-solid'));
  // scale figure on the terrace
  const fz = -6.4, fy = 4.05;
  sh.add(`<circle class="l-thin" cx="${f(sx(fz))}" cy="${f(sy(fy + 1.62))}" r="${f(0.12 * k)}"/>`);
  sh.add(l(fz, fy + 1.48, fz, fy + 0.85, 'l-thin'));
  sh.add(l(fz, fy + 0.85, fz - 0.18, fy, 'l-thin'));
  sh.add(l(fz, fy + 0.85, fz + 0.18, fy, 'l-thin'));
  sh.add(l(fz, fy + 1.3, fz - 0.25, fy + 0.9, 'l-thin'));
  // dimensions
  const dz = -22;
  sh.add(l(dz, SEA, dz, 4.05, 'l-dim'));
  sh.add(l(dz - 0.5, SEA, dz + 0.5, SEA, 'l-dim'));
  sh.add(l(dz - 0.5, 4.05, dz + 0.5, 4.05, 'l-dim'));
  sh.add(l(dz, 4.05, -8, 4.05, 'l-dim', 'stroke-dasharray="2 3"'));
  sh.add(t(dz - 0.8, (SEA + 4.05) / 2, '38.05 m', 't-dim', 'end'));
  sh.add(l(-9.5, 9.4, -4, 9.4, 'l-dim'));
  sh.add(l(-9.5, 9.0, -9.5, 9.8, 'l-dim'));
  sh.add(l(-4, 9.0, -4, 9.8, 'l-dim'));
  sh.add(t(-6.75, 10.1, '5.50 cantilever', 't-dim'));
  // rooms
  sh.add(t(2, 5.4, 'Living'));
  sh.add(t(4, 1.6, 'Bedroom'));
  sh.add(t(-6.1, 3.0, 'Terrace', 't-dim'));
  sh.add(t(-52, SEA + 4, 'Open sea', 't-dim'));
  sh.add(t(18, 2.2, 'Court', 't-dim'));
  sh.add(t(Z1 - 1, Y1 - 1.6, 'Section A–A', 't-dim', 'end'));
  return sh.svg('Section A–A through the house and the cliff');
}
