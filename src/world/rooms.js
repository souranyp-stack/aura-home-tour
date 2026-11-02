import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mesh, boxG, rbox, cushion, tube, leg, loungeChair, vase, rod, bar, stitches, reeded } from './interior.js';
import { FL } from './house.js';
import { LOWER_ROOMS, LOWER, INSIDE_STAIR } from './walkPlan.js';

// The rooms that make it a house to live in: the kitchen on the upper level, and
// below it, inside the stone plinth, four bedrooms along the sea with their
// bathrooms behind them and a gallery against the hill. The layout itself is in
// walkPlan.js, so the walls here and the walls you walk into cannot disagree.

const quiet = { cast: false };

function stool(M) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) g.add(leg(M.walnut, x, z, 0.64, 0.013, 0.01, 0.05));
  for (const [w, d, x, z] of [[0.3, 0.012, 0, -0.14], [0.3, 0.012, 0, 0.14], [0.012, 0.3, -0.14, 0], [0.012, 0.3, 0.14, 0]])
    g.add(mesh(rbox(w, 0.012, d, 0.003), M.bronzeInterior, x, 0.24, z, quiet));
  g.add(mesh(cushion(0.38, 0.05, 0.36, 0.012, 0.02), M.cognac, 0, 0.665, 0));
  return g;
}

function pendant(M, x, y, z) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 32, 1, true), M.pendantShade, x, y, z, quiet));
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, FL + 3.45 - y, 6), M.bronzeInterior, x, (y + FL + 3.45) / 2, z, quiet));
  return g;
}

export function buildKitchen(root, M) {
  const y = FL;
  // ---- the wall: a walnut bank with two tall columns and a stone-lined niche
  const backZ = 7.675, depth = 0.65;
  const fronts = (x0, x1, y0, y1, count) => {
    root.add(mesh(rbox(x1 - x0, y1 - y0, depth, 0.008), M.walnut, (x0 + x1) / 2, y + (y0 + y1) / 2, backZ));
    const w = (x1 - x0) / count;
    for (let i = 1; i < count; i++) root.add(mesh(boxG(0.006, y1 - y0 - 0.02, 0.008), M.basalt, x0 + i * w, y + (y0 + y1) / 2, backZ - depth / 2 - 0.001, quiet));
  };
  fronts(6.6, 8.0, 0.02, 3.0, 2); // tall columns, one holding the oven
  fronts(8.0, 11.0, 0.02, 0.88, 4); // base units
  fronts(8.0, 11.0, 1.62, 3.0, 4); // wall units to the ceiling line
  // bronze pulls
  for (let i = 0; i < 4; i++) root.add(mesh(rbox(0.3, 0.014, 0.018, 0.004), M.bronzeInterior, 8.375 + i * 0.75, y + 0.8, backZ - depth / 2 - 0.012, quiet));
  for (const x of [6.95, 7.65]) root.add(mesh(rbox(0.014, 0.6, 0.018, 0.004), M.bronzeInterior, x + (x < 7.3 ? 0.28 : -0.28), y + 1.1, backZ - depth / 2 - 0.012, quiet));
  // oven: blackened steel and glass, set into the second column
  root.add(mesh(rbox(0.6, 0.6, 0.012, 0.004), M.steel, 7.65, y + 1.42, backZ - depth / 2 - 0.004, quiet));
  root.add(mesh(boxG(0.5, 0.36, 0.006), M.soot, 7.65, y + 1.38, backZ - depth / 2 - 0.012, quiet));
  root.add(mesh(rbox(0.5, 0.012, 0.02, 0.004), M.bronzeInterior, 7.65, y + 1.62, backZ - depth / 2 - 0.02, quiet));
  // worktop and splashback in one run of travertine, lit from under the wall units
  root.add(mesh(rbox(3.0, 0.04, 0.67, 0.006), M.travertine, 9.5, y + 0.9, backZ - 0.01));
  root.add(mesh(boxG(3.0, 0.7, 0.02), M.wallTravertine, 9.5, y + 1.27, 7.98, quiet));
  root.add(mesh(boxG(2.9, 0.012, 0.02), M.lightStrip, 9.5, y + 1.612, 7.62, { cast: false, receive: false }));
  // induction hob
  root.add(mesh(rbox(0.72, 0.006, 0.48, 0.002), M.soot, 9.5, y + 0.922, backZ - 0.03, quiet));
  // on the worktop: oil and salt, a board, a stack of bowls
  root.add(mesh(rbox(0.42, 0.024, 0.28, 0.006), M.oak, 10.45, y + 0.932, 7.72, quiet));
  const jar = vase(M, M.ceramicDark, 0.2, 0.05); jar.position.set(8.5, y + 0.92, 7.78); root.add(jar);
  const jar2 = vase(M, M.ceramic, 0.14, 0.06); jar2.position.set(8.72, y + 0.92, 7.8); root.add(jar2);

  // ---- the island: a travertine waterfall around a walnut core
  const ix = 8.7, iz = 6.15, iw = 3.0, id = 0.9, top = 0.92;
  root.add(mesh(rbox(iw - 0.2, top - 0.1, id - 0.14, 0.008), M.walnut, ix, y + (top - 0.04) / 2 + 0.02, iz));
  root.add(mesh(rbox(iw, 0.05, id, 0.008), M.travertine, ix, y + top, iz));
  for (const sx of [-1, 1]) root.add(mesh(rbox(0.05, top, id, 0.008), M.travertine, ix + (sx * (iw - 0.05)) / 2, y + top / 2, iz));
  // sink and arched bronze tap, on the side that faces the wall
  root.add(mesh(boxG(0.62, 0.006, 0.38), M.soot, ix + 0.55, y + top + 0.024, iz + 0.12, quiet));
  root.add(mesh(tube([[0, 0, 0], [0, 0.22, 0], [0.02, 0.33, 0.04], [0.07, 0.36, 0.13], [0.1, 0.3, 0.18]], 0.009), M.bronzeInterior, ix + 0.55, y + top + 0.025, iz - 0.2, quiet));
  // a bowl of lemons
  const bowl = vase(M, M.ceramic, 0.08, 0.17); bowl.position.set(ix - 0.75, y + top + 0.025, iz); root.add(bowl);
  for (const [dx, dz, dy] of [[-0.05, 0.03, 0.09], [0.06, -0.02, 0.09], [0, -0.06, 0.1], [0.02, 0.06, 0.12]])
    root.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), M.terracotta, ix - 0.75 + dx, y + top + 0.025 + dy, iz + dz, quiet));
  // stools along the side that faces the room
  for (const x of [7.9, 8.7, 9.5]) {
    const s = stool(M);
    s.position.set(x, y, 5.42);
    root.add(s);
  }
  root.add(pendant(M, 8.0, y + 1.85, iz), pendant(M, 9.4, y + 1.85, iz));
}

// ---------------------------------------------------------------- lower level
function wall(root, M, mat, x0, z0, x1, z1, y0 = 0, y1 = LOWER.ceiling) {
  root.add(mesh(boxG(Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0)), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
}

// A modern bedroom: one wall of reeded walnut, a bed that floats on a line of light,
// pendants instead of table lamps, and a linen window seat under the long view.
function bedroom(root, M, r) {
  const c = r.bedAt, z = 3.22, C = LOWER.ceiling, wallZ = LOWER.wallA[0];
  const x0 = r.pass[1], x1 = r.x1 - (r.n < 4 ? 0.08 : 0.02), wide = x1 - x0;

  // the wall behind the bed, floor to ceiling
  const reeds = mesh(reeded(wide, C, 0.042, 0.011), M.walnut, (x0 + x1) / 2, C / 2, wallZ - 0.012, quiet);
  reeds.rotation.y = Math.PI;
  root.add(reeds);
  root.add(mesh(boxG(wide, C, 0.01), M.basalt, (x0 + x1) / 2, C / 2, wallZ - 0.006, quiet));
  // light washing down the reeds from a slot in the ceiling
  root.add(mesh(boxG(wide - 0.1, 0.012, 0.03), M.roomGlow, (x0 + x1) / 2, C - 0.028, wallZ - 0.09, { cast: false, receive: false }));

  // headboard: three horizontal channels of boucle, wider than the bed
  for (let i = 0; i < 3; i++) {
    const strip = mesh(cushion(3.5, 0.095, 0.3, 0.018, 0.042, { wrinkle: 0.0012 }), M.boucleDark, c, 0.56 + i * 0.3, 4.37, quiet);
    strip.rotation.x = -Math.PI / 2;
    root.add(strip);
  }

  // the bed floats: a walnut platform on a dark recess, with light under its edge
  root.add(mesh(rbox(1.7, 0.1, 1.86, 0.006), M.soot, c, 0.075, z - 0.02, quiet));
  root.add(mesh(rbox(2.16, 0.13, 2.28, 0.012), M.walnut, c, 0.19, z, quiet));
  for (const [w, d, dx, dz] of [[1.8, 0.02, 0, -0.96], [0.02, 1.9, -0.88, -0.02], [0.02, 1.9, 0.88, -0.02]])
    root.add(mesh(boxG(w, 0.012, d), M.roomGlow, c + dx, 0.042, z + dz, { cast: false, receive: false }));
  root.add(mesh(cushion(1.96, 0.24, 2.1, 0.012, 0.05, { wrinkle: 0.001 }), M.linenSheet, c, 0.38, z, quiet));
  // duvet in washed linen, turned back at the top, softly uneven
  root.add(mesh(cushion(2.06, 0.11, 1.62, 0.03, 0.05, { wrinkle: 0.0065, puff: 0.012 }), M.linenSheet, c, 0.54, z - 0.26, quiet));
  root.add(mesh(cushion(2.08, 0.05, 0.34, 0.012, 0.024, { wrinkle: 0.004 }), M.linenSheet, c, 0.615, z + 0.42, quiet));
  // a charcoal throw across the foot, falling over the sides
  root.add(mesh(cushion(2.12, 0.028, 0.62, 0.004, 0.012, { wrinkle: 0.0035 }), M.linenCharcoal, c, 0.615, z - 0.64, quiet));
  for (const sx of [-1, 1]) root.add(mesh(cushion(0.028, 0.3, 0.62, 0.002, 0.012, { wrinkle: 0.002, puff: 0.003 }), M.linenCharcoal, c + sx * 1.06, 0.47, z - 0.64, quiet));
  // pillows: sleeping pillows, then square linen, then one long leather bolster
  const pillow = (w, d, mat, x, y, zz, rx, ry = 0, rz = 0, t = 0.15) => {
    const p = mesh(cushion(w, t, d, 0.055, 0.06, { wrinkle: 0.003 }), mat, x, y, zz, quiet);
    p.rotation.set(rx, ry, rz);
    root.add(p);
  };
  for (const sx of [-1, 1]) {
    pillow(0.76, 0.5, M.linenSheet, c + sx * 0.47, 0.76, 4.1, 1.28, 0, sx * 0.02);
    pillow(0.52, 0.52, M.linenClay, c + sx * 0.5, 0.74, 3.94, 1.12, 0, sx * -0.04);
  }
  pillow(0.72, 0.26, M.cognac, c, 0.68, 3.74, 1.05, 0, 0, 0.13);

  for (const sx of [-1, 1]) {
    const n = c + sx * 1.36;
    // a walnut shelf hung off the wall, with a drawer and a bronze edge
    root.add(mesh(rbox(0.56, 0.11, 0.38, 0.006), M.walnut, n, 0.46, 4.27, quiet));
    root.add(mesh(rbox(0.58, 0.016, 0.4, 0.004), M.bronzeInterior, n, 0.523, 4.27, quiet));
    root.add(mesh(rbox(0.2, 0.024, 0.14, 0.004), M.linenClay, n - 0.06, 0.543, 4.25, quiet));
    root.add(mesh(rbox(0.18, 0.018, 0.13, 0.004), M.linenCharcoal, n - 0.06, 0.564, 4.25, quiet));
    // a glass globe on a bronze stem, dropped from the ceiling
    root.add(rod(M.bronzeInterior, [n, C, 4.25], [n, 1.44, 4.25], 0.004, 0.004, quiet));
    root.add(mesh(new THREE.SphereGeometry(0.095, 32, 24), M.roomShade, n, 1.35, 4.25, { cast: false, receive: false }));
    root.add(mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.03, 16), M.bronzeInterior, n, 1.45, 4.25, quiet));
  }

  // rug, and a long bench with a stitched channelled top on a bronze frame
  root.add(mesh(rbox(3.8, 0.02, 3.2, 0.008), M.wool, c, 0.03, 2.05, quiet));
  const bx = c, bz = 1.62;
  for (let i = 0; i < 6; i++) root.add(mesh(cushion(0.262, 0.085, 0.44, 0.014, 0.03, { wrinkle: 0.001, puff: 0.001 }), M.cognac, bx - 0.655 + i * 0.262, 0.43, bz, quiet));
  stitches(root, [bx - 0.75, 0.466, bz - 0.2], [bx + 0.75, 0.466, bz - 0.2], M.thread);
  for (const sx of [-1, 1]) {
    root.add(bar(M.bronzeInterior, [bx + sx * 0.72, 0.03, bz - 0.19], [bx + sx * 0.72, 0.385, bz - 0.19], 0.014, quiet));
    root.add(bar(M.bronzeInterior, [bx + sx * 0.72, 0.03, bz + 0.19], [bx + sx * 0.72, 0.385, bz + 0.19], 0.014, quiet));
    root.add(bar(M.bronzeInterior, [bx + sx * 0.72, 0.385, bz - 0.2], [bx + sx * 0.72, 0.385, bz + 0.2], 0.014, quiet));
  }
  root.add(bar(M.bronzeInterior, [bx - 0.73, 0.385, bz], [bx + 0.73, 0.385, bz], 0.014, quiet));

  // ---- the sea wall: plaster around the window, a stone sill, a linen window seat
  const sill0 = 1.375, head = 2.725, zS = -1.69;
  root.add(mesh(boxG(r.x1 - r.x0 - 0.02, sill0, 0.012), M.plaster, (r.x0 + r.x1) / 2, sill0 / 2, zS, quiet));
  root.add(mesh(boxG(r.x1 - r.x0 - 0.02, C - head, 0.012), M.plaster, (r.x0 + r.x1) / 2, (C + head) / 2, zS, quiet));
  const b0 = Math.max(r.x0, -7.5), b1 = Math.min(r.x1, 12.5);
  if (b0 > r.x0) root.add(mesh(boxG(b0 - r.x0, head - sill0, 0.012), M.plaster, (r.x0 + b0) / 2, (head + sill0) / 2, zS, quiet));
  if (b1 < r.x1) root.add(mesh(boxG(r.x1 - b1, head - sill0, 0.012), M.plaster, (b1 + r.x1) / 2, (head + sill0) / 2, zS, quiet));
  root.add(mesh(rbox(b1 - b0, 0.03, 0.2, 0.006), M.travertine, (b0 + b1) / 2, sill0 + 0.005, -1.62, quiet));
  root.add(mesh(boxG(r.x1 - r.x0 - 0.1, 0.012, 0.03), M.roomGlow, (r.x0 + r.x1) / 2, C - 0.028, -1.6, { cast: false, receive: false }));

  const s0 = r.x0 + 1.85, s1 = r.x1 - 0.1, sc = (s0 + s1) / 2;
  root.add(mesh(rbox(s1 - s0, 0.36, 0.52, 0.008), M.walnut, sc, 0.22, -1.43, quiet));
  root.add(mesh(boxG(s1 - s0 - 0.04, 0.012, 0.015), M.roomGlow, sc, 0.044, -1.165, { cast: false, receive: false }));
  root.add(mesh(cushion(s1 - s0, 0.1, 0.54, 0.018, 0.035, { wrinkle: 0.0018 }), M.linenClay, sc, 0.45, -1.42, quiet));
  const seatPillow = (x, mat) => {
    const p = mesh(cushion(0.46, 0.12, 0.46, 0.05, 0.05, { wrinkle: 0.003 }), mat, x, 0.72, -1.55, quiet);
    p.rotation.x = Math.PI / 2 - 0.22;
    root.add(p);
  };
  seatPillow(s1 - 0.4, M.linenSheet);
  seatPillow(s1 - 0.82, M.linenCharcoal);

  // ---- the reading corner: lounge chair, a round table, a slim standing lamp
  const chair = loungeChair(M);
  chair.position.set(r.chairAt, 0.02, -0.45);
  chair.rotation.y = -0.72;
  chair.traverse((o) => { o.castShadow = false; });
  root.add(chair);
  const tx = r.chairAt + 0.02, tz = 0.5;
  root.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.018, 48), M.travertine, tx, 0.47, tz, quiet));
  root.add(rod(M.bronzeInterior, [tx, 0.03, tz], [tx, 0.46, tz], 0.008, 0.008, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.012, 32), M.bronzeInterior, tx, 0.034, tz, quiet));
  const lx = r.x0 + 0.34, lz = -1.3;
  root.add(rod(M.bronzeInterior, [lx, 0.03, lz], [lx, 1.56, lz], 0.006, 0.006, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.012, 32), M.bronzeInterior, lx, 0.034, lz, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 40, 1, true), M.roomShade, lx, 1.62, lz, { cast: false, receive: false }));

  // ---- a large canvas on the side wall, slim-framed
  const cz = 1.3, side = r.x1 - (r.n < 4 ? 0.085 : 0.03);
  root.add(mesh(boxG(0.03, 1.2, 1.9), M.art, side - 0.02, 1.62, cz, quiet));
  root.add(mesh(boxG(0.022, 1.24, 1.94), M.bronzeInterior, side - 0.012, 1.62, cz, quiet));

  // recessed downlights
  for (const [ldx, ldz] of [[-1.2, 0.8], [1.2, 0.8]]) {
    root.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.006, 24), M.roomGlow, c + ldx, C - 0.026, ldz, { cast: false, receive: false }));
    root.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.004, 32), M.bronzeInterior, c + ldx, C - 0.024, ldz, quiet));
  }
}

// A modern bathroom: quiet honed slabs on the walls and a dark stone floor, a glowing
// panel of backlit stone behind the tub, a floating reeded vanity and a round mirror.
function bathroom(root, M, r) {
  const [a, b] = r.bath;
  const z0 = LOWER.wallA[1], z1 = LOWER.wallB[0], C = LOWER.ceiling;
  const cx = (a + b) / 2, cz = (z0 + z1) / 2;
  const [d0, d1] = LOWER.bathDoor;
  root.add(mesh(boxG(b - a, 0.012, z1 - z0), M.slabDark, cx, 0.036, cz, quiet));
  root.add(mesh(boxG(b - a, C, 0.012), M.slab, cx, C / 2, z0 + 0.007, quiet));
  root.add(mesh(boxG(b - a, C, 0.012), M.slab, cx, C / 2, z1 - 0.007, quiet));
  root.add(mesh(boxG(0.012, C, z1 - z0), M.slab, b - 0.06, C / 2, cz, quiet));
  root.add(mesh(boxG(0.012, C, d0 - z0), M.slab, a + 0.007, C / 2, (z0 + d0) / 2, quiet));
  root.add(mesh(boxG(0.012, C, z1 - d1), M.slab, a + 0.007, C / 2, (d1 + z1) / 2, quiet));
  root.add(mesh(boxG(0.012, C - LOWER.doorHead, d1 - d0), M.slab, a + 0.007, (C + LOWER.doorHead) / 2, (d0 + d1) / 2, quiet));
  // ceiling slot of light around the room
  root.add(mesh(boxG(b - a - 0.2, 0.01, 0.024), M.roomGlow, cx, C - 0.028, z0 + 0.07, { cast: false, receive: false }));
  root.add(mesh(boxG(b - a - 0.2, 0.01, 0.024), M.roomGlow, cx, C - 0.028, z1 - 0.07, { cast: false, receive: false }));

  // the backlit stone: one panel, bronze-edged, glowing behind the tub
  const px = a + 2;
  root.add(mesh(boxG(2.3, 1.72, 0.016), M.backlit, px, 1.3, z0 + 0.02, { cast: false, receive: false }));
  for (const [w, h, dx, dy] of [[2.34, 0.018, 0, 0.87], [2.34, 0.018, 0, -0.87], [0.018, 1.76, 1.16, 0], [0.018, 1.76, -1.16, 0]])
    root.add(mesh(boxG(w, h, 0.03), M.bronzeInterior, px + dx, 1.3 + dy, z0 + 0.024, quiet));

  // a slim oval tub with a thin rim, and a bronze filler rising from the floor
  const profile = [[0, 0.045], [0.3, 0.045], [0.355, 0.1], [0.395, 0.34], [0.408, 0.585], [0.4, 0.598], [0.385, 0.59], [0.365, 0.34], [0.31, 0.15], [0.24, 0.11], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const tub = mesh(new THREE.LatheGeometry(profile, 64), M.solid, a + 2, 0, 5.2, quiet);
  tub.scale.set(2.2, 1, 1);
  root.add(tub);
  const fx = a + 3.02;
  root.add(mesh(tube([[0, 0, 0], [0, 0.82, 0], [-0.02, 0.92, 0], [-0.1, 0.97, 0], [-0.22, 0.95, 0], [-0.26, 0.88, 0]], 0.0105), M.bronzeInterior, fx, 0.036, 5.2, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.012, 24), M.bronzeInterior, fx, 0.048, 5.2, quiet));
  // folded towels on a small walnut stool
  const sx0 = a + 0.5, sz0 = 5;
  root.add(mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.38, 40), M.walnut, sx0, 0.23, sz0, quiet));
  for (let i = 0; i < 3; i++) root.add(mesh(cushion(0.34 - i * 0.012, 0.045, 0.26 - i * 0.008, 0.01, 0.02, { wrinkle: 0.0012 }), M.towel, sx0, 0.445 + i * 0.05, sz0, quiet));

  // floating vanity: reeded walnut, a stone top, a thin basin, a wall-set tap
  const vx = a + 2, vz = z1 - 0.26;
  root.add(mesh(rbox(1.7, 0.3, 0.48, 0.006), M.walnut, vx, 0.64, vz, quiet));
  const fr = mesh(reeded(1.68, 0.29, 0.026, 0.007), M.walnut, vx, 0.64, vz - 0.242, quiet);
  fr.rotation.y = Math.PI;
  root.add(fr);
  root.add(mesh(rbox(1.76, 0.035, 0.52, 0.006), M.slab, vx, 0.81, vz, quiet));
  root.add(mesh(boxG(1.6, 0.01, 0.015), M.roomGlow, vx, 0.48, vz - 0.14, { cast: false, receive: false }));
  const basinProfile = [[0, 0.82], [0.13, 0.82], [0.18, 0.86], [0.21, 0.925], [0.205, 0.93], [0.19, 0.925], [0.16, 0.87], [0.1, 0.845], [0, 0.84]].map(([x, y]) => new THREE.Vector2(x, y));
  root.add(mesh(new THREE.LatheGeometry(basinProfile, 48), M.solid, vx, 0, vz + 0.02, quiet));
  root.add(rod(M.bronzeInterior, [vx, 1.03, z1 - 0.01], [vx, 1.03, vz + 0.1], 0.0085, 0.0085, quiet));
  for (const sx of [-1, 1]) root.add(rod(M.bronzeInterior, [vx + sx * 0.18, 1.03, z1 - 0.01], [vx + sx * 0.18, 1.03, z1 - 0.06], 0.012, 0.012, quiet));
  // round mirror with a halo of light behind it (the true reflection is in buildLowerLevel)
  const disc = mesh(new THREE.CircleGeometry(0.5, 64), M.mirror, vx, 1.68, z1 - 0.024, { cast: false, receive: false });
  disc.rotation.y = Math.PI;
  root.add(disc);
  root.add(mesh(new THREE.TorusGeometry(0.512, 0.009, 10, 80), M.roomGlow, vx, 1.68, z1 - 0.022, { cast: false, receive: false }));

  // wall-hung WC against a stone panel, with a bronze flush plate
  const tx = a + 0.46;
  root.add(mesh(rbox(0.46, 1.1, 0.14, 0.006), M.slab, tx, 0.55, z1 - 0.085, quiet));
  root.add(mesh(rbox(0.18, 0.1, 0.008, 0.002), M.bronzeInterior, tx, 0.98, z1 - 0.158, quiet));
  root.add(mesh(cushion(0.35, 0.26, 0.5, 0.008, 0.11, { wrinkle: 0, puff: 0.012 }), M.solid, tx, 0.36, z1 - 0.39, quiet));
  root.add(mesh(cushion(0.355, 0.024, 0.46, 0.003, 0.011, { wrinkle: 0 }), M.solid, tx, 0.505, z1 - 0.37, quiet));

  // walk-in shower: a bronze-framed pane, a stone bench, a square rain head, a line of light
  const sx = a + 3;
  if (b - sx > 0.6) {
    root.add(mesh(boxG(0.01, 2.2, 1.34), M.glass, sx + 0.05, 1.14, z0 + 0.69, quiet));
    root.add(mesh(boxG(0.022, 0.022, 1.36), M.bronzeInterior, sx + 0.05, 2.25, z0 + 0.69, quiet));
    root.add(mesh(boxG(0.022, 2.24, 0.022), M.bronzeInterior, sx + 0.05, 1.13, z0 + 1.37, quiet));
    const bench = b - sx - 0.1;
    root.add(mesh(rbox(bench, 0.44, 0.42, 0.008), M.slab, sx + 0.04 + bench / 2, 0.25, z1 - 0.23, quiet));
    root.add(mesh(rbox(0.3, 0.008, 0.3, 0.002), M.bronzeInterior, (sx + b) / 2 + 0.03, 2.42, cz - 0.2, quiet));
    root.add(rod(M.bronzeInterior, [(sx + b) / 2 + 0.03, 2.42, cz - 0.2], [(sx + b) / 2 + 0.03, C, cz - 0.2], 0.008, 0.008, quiet));
    root.add(mesh(boxG(0.012, 2.1, 0.022), M.roomGlow, b - 0.07, 1.2, z0 + 0.04, { cast: false, receive: false }));
    root.add(mesh(boxG(b - sx - 0.16, 0.006, 0.05), M.bronzeInterior, (sx + b) / 2 + 0.03, 0.044, z0 + 0.1, quiet));
  }
}

export function buildLowerLevel(root, M) {
  const C = LOWER.ceiling, floorY = 0.02;
  const x0 = -9, x1 = 14.4, zS = -1.7, zN = 9.4;
  // floor and ceiling, each stopping at the stair opening
  const S = INSIDE_STAIR;
  for (const [mat, y] of [[M.floorOak, floorY], [M.ceiling, C - 0.012]]) {
    root.add(mesh(boxG(x1 - x0, 0.02, S.z0 - zS), mat, (x0 + x1) / 2, y, (zS + S.z0) / 2, quiet));
    root.add(mesh(boxG(x1 - x0, 0.02, zN - S.z1), mat, (x0 + x1) / 2, y, (S.z1 + zN) / 2, quiet));
    root.add(mesh(boxG(S.x0 - x0, 0.02, S.z1 - S.z0), mat, (x0 + S.x0) / 2, y, (S.z0 + S.z1) / 2, quiet));
    root.add(mesh(boxG(x1 - S.x1, 0.02, S.z1 - S.z0), mat, (S.x1 + x1) / 2, y, (S.z0 + S.z1) / 2, quiet));
  }
  // the floor runs under the stair too
  root.add(mesh(boxG(S.x1 - S.x0, 0.02, S.z1 - S.z0), M.floorOak, (S.x0 + S.x1) / 2, floorY, (S.z0 + S.z1) / 2, quiet));

  // plaster over the stone where the rooms need it
  root.add(mesh(boxG(0.02, C, zN - zS), M.plaster, x1 - 0.012, C / 2, (zS + zN) / 2, quiet));
  // ...including the north wall, around the front door
  const [d0, d1] = LOWER.door;
  root.add(mesh(boxG(d0 - x0, C, 0.02), M.plaster, (x0 + d0) / 2, C / 2, zN - 0.012, quiet));
  root.add(mesh(boxG(x1 - d1, C, 0.02), M.plaster, (d1 + x1) / 2, C / 2, zN - 0.012, quiet));
  root.add(mesh(boxG(d1 - d0, C - 2.4, 0.02), M.plaster, (d0 + d1) / 2, (C + 2.4) / 2, zN - 0.012, quiet));

  const doorGap = (r) => [r.pass[0] + 0.25, r.pass[0] + 1.25];
  const [aS, aN] = LOWER.wallA, [bS, bN] = LOWER.wallB;
  // the two long walls, with a door to each room's lobby
  for (const [zA, zB] of [[aS, aN], [bS, bN]]) {
    let from = x0;
    for (const r of LOWER_ROOMS) {
      const [d0, d1] = doorGap(r);
      if (d0 > from) wall(root, M, M.plaster, from, zA, d0, zB);
      wall(root, M, M.plaster, d0, zA, d1, zB, LOWER.doorHead, C);
      root.add(mesh(boxG(d1 - d0 + 0.08, 0.04, zB - zA + 0.04), M.bronzeInterior, (d0 + d1) / 2, LOWER.doorHead + 0.02, (zA + zB) / 2, quiet));
      from = d1;
    }
    wall(root, M, M.plaster, from, zA, x1, zB);
  }

  LOWER_ROOMS.forEach((r, i) => {
    // between one room and the next, from the sea back to the corridor
    if (i > 0) wall(root, M, M.plaster, r.x0 - 0.08, zS, r.x0 + 0.08, aS);
    if (i > 0) wall(root, M, M.plaster, r.x0 - 0.05, aN, r.x0 + 0.05, bS);
    // the bathroom wall off the lobby, with its door
    const w0 = r.pass[1], w1 = r.bath[0];
    wall(root, M, M.plaster, w0, aN, w1, LOWER.bathDoor[0]);
    wall(root, M, M.plaster, w0, LOWER.bathDoor[1], w1, bS);
    wall(root, M, M.plaster, w0, LOWER.bathDoor[0], w1, LOWER.bathDoor[1], LOWER.doorHead, C);

    bedroom(root, M, r);
    // the lobby's wardrobe: flush walnut doors along the bathroom wall
    root.add(mesh(boxG(0.05, 2.14, 1.32), M.walnut, r.pass[1] - 0.03, 1.09, 5.32 - 0.02 - 0.34, quiet));
    root.add(mesh(rbox(0.012, 0.5, 0.018, 0.003), M.bronzeInterior, r.pass[1] - 0.062, 1.15, 5.0, quiet));
    bathroom(root, M, r);
    // the lobby's own light
    root.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.006, 24), M.roomGlow, r.x0 + 0.8, C - 0.026, 5.8, { cast: false, receive: false }));
  });

  // ---- the gallery corridor, along the hill
  root.add(mesh(boxG(22.8, 0.012, 0.05), M.roomGlow, 2.7, C - 0.026, 8.95, { cast: false, receive: false }));
  const hang = (x, w, h) => {
    root.add(mesh(boxG(w, h, 0.03), M.art, x, 1.55, 9.36, quiet));
    root.add(mesh(boxG(w + 0.07, h + 0.07, 0.012), M.basalt, x, 1.55, 9.38, quiet));
  };
  hang(-5.6, 2.2, 1.3); hang(-1.2, 1.1, 1.5); hang(6.4, 2.4, 1.4); hang(11, 1.5, 1.5);
  // a long walnut bench under the art
  root.add(mesh(rbox(2.4, 0.04, 0.42, 0.008), M.walnut, -1.9, 0.44, 9.1, quiet));
  for (const dx of [-1.05, 1.05]) root.add(mesh(rbox(0.05, 0.42, 0.36, 0.006), M.walnut, -1.9 + dx, 0.23, 9.1, quiet));

  // ---- the front door: an opening in the north wall, its glass leaf slid aside
  const { door } = LOWER;
  root.add(mesh(boxG(door[1] - door[0], 0.04, 0.68), M.travertine, (door[0] + door[1]) / 2, 0.04, 9.7, quiet));
  for (const x of door) root.add(mesh(rbox(0.05, 2.42, 0.1, 0.006), M.bronzeInterior, x, 1.21, 9.96));
  root.add(mesh(rbox(door[1] - door[0] + 0.05, 0.05, 0.1, 0.006), M.bronzeInterior, (door[0] + door[1]) / 2, 2.42, 9.96));
  root.add(mesh(boxG(door[1] - door[0], 2.34, 0.012), M.glass, door[1] + 0.82, 1.2, 9.36, quiet));

  // ---- the inside stair: 22 oak treads on a steel spine, up from the corridor to
  // the living room, with glass around the opening at the top
  const steps = 22, run = (S.x1 - S.x0) / steps, rise = (FL - floorY) / steps;
  const midZ = (S.z0 + S.z1) / 2;
  for (let i = 0; i < steps; i++) {
    root.add(mesh(rbox(run + 0.03, 0.05, S.z1 - S.z0 - 0.06, 0.008), M.oak, S.x0 + (i + 0.5) * run, floorY + (i + 1) * rise - 0.025, midZ));
  }
  const slope = Math.hypot(S.x1 - S.x0, FL - floorY);
  const spine = mesh(boxG(slope, 0.2, 0.12), M.steel, (S.x0 + S.x1) / 2, (floorY + FL) / 2 - 0.13, midZ);
  spine.rotation.z = Math.atan2(FL - floorY, S.x1 - S.x0);
  root.add(spine);
  const glassRail = (x0, z0, x1, z1) => {
    const horizontal = Math.abs(z1 - z0) < 0.01;
    const w = horizontal ? x1 - x0 : 0.014, d = horizontal ? 0.014 : z1 - z0;
    root.add(mesh(boxG(w, 1.02, d), M.glass, (x0 + x1) / 2, FL + 0.53, (z0 + z1) / 2, quiet));
    root.add(mesh(rbox(horizontal ? w : 0.05, 0.03, horizontal ? 0.05 : d, 0.006), M.bronzeInterior, (x0 + x1) / 2, FL + 1.05, (z0 + z1) / 2, quiet));
  };
  glassRail(S.x0, S.z0, S.x1, S.z0);
  glassRail(S.x0, S.z0, S.x0, S.z1);

  // Two lights that travel with the visitor: the rooms are lit where you stand.
  // A fixed number of lights keeps every material's shader the same all the time.
  const near = new THREE.PointLight(0xffdcb4, 0, 16, 1.25);
  const fill = new THREE.PointLight(0xffe4c4, 0, 6, 1.6);
  near.position.set(0, -20, 0);
  fill.position.set(0, -20, 0);
  root.add(near, fill);
  const roomLight = new THREE.Vector3(), target = new THREE.Vector3();

  // One true mirror, carried to whichever bathroom you are in, so it costs nothing
  // anywhere else. The other rooms are smoked bronze glass until you walk in.
  const mirror = new Reflector(new THREE.CircleGeometry(0.5, 64), {
    textureWidth: 720, textureHeight: 720, clipBias: 0.003, color: 0xc9c6bf, multisample: 2,
  });
  mirror.rotation.y = Math.PI;
  mirror.visible = false;
  mirror.userData.noAO = true;
  root.add(mirror);
  // what lies outside the walls has no place in the reflection, and it is the costly part
  let outside = [];
  const reflect = mirror.onBeforeRender;
  mirror.onBeforeRender = (...args) => {
    const was = outside.map((o) => o.visible);
    outside.forEach((o) => { o.visible = false; });
    reflect.apply(mirror, args);
    outside.forEach((o, i) => { o.visible = was[i]; });
  };

  function update(state, env, dt) {
    const inside = state && (state.level === 'lower' || (state.level === 'inside' && state.x < -3));
    const bath = inside && state.level === 'lower' && state.z > LOWER.wallA[1] && state.z < LOWER.wallB[0]
      ? LOWER_ROOMS.find((q) => state.x >= q.bath[0] && state.x <= q.bath[1]) : null;
    mirror.visible = !!bath;
    if (bath) mirror.position.set(bath.bath[0] + 2, 1.68, LOWER.wallB[0] - 0.03);
    const k = 1 - Math.exp(-dt * 6);
    const glow = inside ? 8 + 9 * env.interior : 0;
    near.intensity += (glow - near.intensity) * k;
    fill.intensity += ((inside ? 2.5 : 0) - fill.intensity) * k;
    const on = inside ? 1 : 0;
    M.roomGlow.emissiveIntensity += (on * 3.4 - M.roomGlow.emissiveIntensity) * k;
    M.roomShade.emissiveIntensity += (on * 1.5 - M.roomShade.emissiveIntensity) * k;
    M.backlit.emissiveIntensity += (on * 0.62 - M.backlit.emissiveIntensity) * k;
    if (!inside) return;
    // the middle of whichever room you are in
    let cx = state.x, cz = 8.4;
    if (state.z < LOWER.wallA[0]) {
      const r = LOWER_ROOMS.find((q) => state.x <= q.x1) || LOWER_ROOMS[3];
      cx = (r.x0 + r.x1) / 2; cz = 1.4;
    } else if (state.z < LOWER.wallB[0]) {
      const r = LOWER_ROOMS.find((q) => state.x <= q.x1) || LOWER_ROOMS[3];
      cx = state.x > r.pass[1] ? (r.bath[0] + r.bath[1]) / 2 : (r.pass[0] + r.pass[1]) / 2; cz = 5.8;
    }
    target.set(cx, C - 0.5, cz);
    roomLight.lerp(target, 1 - Math.exp(-dt * 8));
    near.position.copy(roomLight);
    fill.position.set(state.x, 2.3, state.z);
  }
  return { update, mirror, setOutside: (list) => { outside = list; } };
}
