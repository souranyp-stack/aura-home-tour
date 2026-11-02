import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mesh, boxG, rbox, cushion, tube, piping, leg, loungeChair, vase } from './interior.js';
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

function bed(root, M, c) {
  const z = 3.2; // the head is against the wall, the foot toward the sea
  // a full-width walnut wall behind the bed, with an upholstered head
  root.add(mesh(boxG(4.1, 2.4, 0.06), M.walnut, c, 1.2, 4.46));
  root.add(mesh(cushion(2.3, 0.72, 0.09, 0.012, 0.03), M.boucleDark, c, 0.98, 4.39));
  root.add(mesh(rbox(1.84, 0.2, 2.02, 0.012), M.walnut, c, 0.12, z, quiet));
  root.add(mesh(cushion(1.9, 0.26, 2.08, 0.015, 0.05), M.outdoorFabric, c, 0.35, z, quiet));
  root.add(mesh(cushion(1.98, 0.11, 1.5, 0.02, 0.045), M.boucle, c, 0.5, z - 0.32, quiet));
  root.add(mesh(cushion(1.98, 0.035, 0.62, 0.006, 0.014), M.wool, c, 0.575, z - 0.68, quiet));
  for (const sx of [-1, 1]) {
    const back = mesh(cushion(0.78, 0.46, 0.14, 0.03, 0.06), M.outdoorFabric, c + sx * 0.46, 0.73, 4.17, quiet);
    back.rotation.x = -0.28;
    const front = mesh(cushion(0.56, 0.32, 0.12, 0.03, 0.05), M.boucle, c + sx * 0.46, 0.66, 3.99, quiet);
    front.rotation.x = -0.34;
    root.add(back, front);
    // bedside table and a lamp
    const n = c + sx * 1.32;
    root.add(mesh(rbox(0.52, 0.04, 0.42, 0.006), M.walnut, n, 0.5, 4.18, quiet));
    root.add(mesh(rbox(0.5, 0.2, 0.4, 0.006), M.walnut, n, 0.37, 4.18, quiet));
    root.add(mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.36, 16), M.bronzeInterior, n, 0.7, 4.18, quiet));
    root.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.17, 32, 1, true), M.pendantShade, n, 0.94, 4.18, quiet));
  }
  // rug, and a leather bench at the foot
  root.add(mesh(boxG(3.5, 0.015, 3), M.wool, c, 0.03, 2.3, quiet));
  root.add(mesh(cushion(1.46, 0.09, 0.44, 0.012, 0.03), M.cognac, c, 0.42, 1.74, quiet));
  for (const [dx, dz] of [[-0.64, -0.16], [0.64, -0.16], [-0.64, 0.16], [0.64, 0.16]]) {
    const l = leg(M.walnut, dx, dz, 0.37, 0.016, 0.011, 0.03);
    l.position.x += c; l.position.z += 1.74;
    root.add(l);
  }
}

function bathroom(root, M, r) {
  const [a, b] = r.bath;
  const z0 = LOWER.wallA[1], z1 = LOWER.wallB[0];
  const cx = (a + b) / 2, cz = (z0 + z1) / 2;
  // honed stone on the floor and every wall
  root.add(mesh(boxG(b - a, 0.012, z1 - z0), M.wallTravertine, cx, 0.036, cz, quiet));
  root.add(mesh(boxG(b - a, LOWER.ceiling, 0.012), M.wallTravertine, cx, LOWER.ceiling / 2, z0 + 0.007, quiet));
  root.add(mesh(boxG(b - a, LOWER.ceiling, 0.012), M.wallTravertine, cx, LOWER.ceiling / 2, z1 - 0.007, quiet));
  root.add(mesh(boxG(0.012, LOWER.ceiling, z1 - z0), M.wallTravertine, b - 0.06, LOWER.ceiling / 2, cz, quiet));

  // a hollow oval tub, turned on a lathe and stretched
  const profile = [[0, 0.04], [0.33, 0.04], [0.38, 0.14], [0.4, 0.58], [0.385, 0.6], [0.35, 0.58], [0.33, 0.2], [0.28, 0.12], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const tub = mesh(new THREE.LatheGeometry(profile, 48), M.ceramic, a + 2, 0, 5.15, quiet);
  tub.scale.set(2.25, 1, 1);
  root.add(tub);
  root.add(mesh(tube([[0, 0, 0], [0, 0.72, 0], [0.06, 0.86, 0], [0.2, 0.86, 0], [0.26, 0.8, 0]], 0.011), M.bronzeInterior, a + 2.95, 0.03, 5.15, quiet));

  // a floating walnut vanity with a stone top and a backlit mirror
  const vx = a + 2, vz = z1 - 0.25;
  root.add(mesh(rbox(1.5, 0.3, 0.46, 0.008), M.walnut, vx, 0.66, vz, quiet));
  root.add(mesh(rbox(1.56, 0.04, 0.5, 0.006), M.travertine, vx, 0.83, vz, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.1, 40), M.ceramic, vx, 0.9, vz, quiet));
  root.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.004, 32), M.ceramicDark, vx, 0.952, vz, quiet));
  root.add(mesh(tube([[0, 0, 0], [0, 0.2, 0], [0, 0.26, -0.04], [0, 0.24, -0.12]], 0.008), M.bronzeInterior, vx, 0.85, vz + 0.19, quiet));
  root.add(mesh(boxG(1.34, 1.04, 0.012), M.mirror, vx, 1.62, z1 - 0.024, { cast: false, receive: false }));
  for (const [w, h, dx, dy] of [[1.4, 0.012, 0, 0.525], [1.4, 0.012, 0, -0.525], [0.012, 1.06, 0.675, 0], [0.012, 1.06, -0.675, 0]])
    root.add(mesh(boxG(w, h, 0.012), M.lightStrip, vx + dx, 1.62 + dy, z1 - 0.028, { cast: false, receive: false }));

  // wall-hung WC beside the door
  const tx = a + 0.5;
  root.add(mesh(rbox(0.4, 1.05, 0.14, 0.01), M.wallTravertine, tx, 0.525, z1 - 0.08, quiet));
  root.add(mesh(rbox(0.36, 0.3, 0.54, 0.09), M.ceramic, tx, 0.4, z1 - 0.38, quiet));
  root.add(mesh(rbox(0.38, 0.03, 0.52, 0.015), M.ceramic, tx, 0.565, z1 - 0.38, quiet));

  // walk-in shower at the far end, a single pane of glass and a rain head
  const sx = a + 3;
  if (b - sx > 0.7) {
    const pane = mesh(boxG(0.012, 2.2, 1.3), M.glass, sx + 0.05, 1.13, z0 + 0.67, quiet);
    root.add(pane);
    root.add(mesh(rbox(0.024, 0.024, 1.3, 0.004), M.bronzeInterior, sx + 0.05, 2.24, z0 + 0.67, quiet));
    root.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32), M.bronzeInterior, (sx + b) / 2 + 0.05, 2.32, cz, quiet));
    root.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, LOWER.ceiling - 2.32, 8), M.bronzeInterior, (sx + b) / 2 + 0.05, (LOWER.ceiling + 2.32) / 2, cz, quiet));
  }
  // towels on a bronze rail
  root.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 8), M.bronzeInterior, a + 2, 1.3, z0 + 0.05, quiet).rotateZ(Math.PI / 2));
  root.add(mesh(rbox(0.5, 0.62, 0.035, 0.012), M.towel, a + 2, 1.02, z0 + 0.055, quiet));
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

    const c = r.bedAt;
    bed(root, M, c);
    // a chair by the window, turned to the view
    const chair = loungeChair(M);
    chair.position.set(r.chairAt, floorY, -0.45);
    chair.rotation.y = -0.6;
    chair.traverse((o) => { o.castShadow = false; });
    root.add(chair);
    // the lobby's wardrobe: flush walnut doors along the bathroom wall
    root.add(mesh(boxG(0.05, 2.14, 1.32), M.walnut, r.pass[1] - 0.03, 1.09, 5.32 - 0.02 - 0.34, quiet));
    root.add(mesh(rbox(0.012, 0.5, 0.018, 0.003), M.bronzeInterior, r.pass[1] - 0.062, 1.15, 5.0, quiet));
    bathroom(root, M, r);
    // recessed lights
    for (const [lx, lz] of [[c - 1.2, 1], [c + 1.2, 1], [r.x0 + 0.8, 5.8], [(r.bath[0] + r.bath[1]) / 2, 5.8]])
      root.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 24), M.lightStrip, lx, C - 0.026, lz, { cast: false, receive: false }));
  });

  // ---- the gallery corridor, along the hill
  root.add(mesh(boxG(22.8, 0.012, 0.05), M.lightStrip, 2.7, C - 0.026, 8.95, { cast: false, receive: false }));
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
  const mirror = new Reflector(new THREE.PlaneGeometry(1.34, 1.04), {
    textureWidth: 768, textureHeight: 600, clipBias: 0.003, color: 0xc9c6bf, multisample: 2,
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
    if (bath) mirror.position.set(bath.bath[0] + 2, 1.62, LOWER.wallB[0] - 0.034);
    const k = 1 - Math.exp(-dt * 6);
    const glow = inside ? 9 + 14 * env.interior : 0;
    near.intensity += (glow - near.intensity) * k;
    fill.intensity += ((inside ? 2.5 : 0) - fill.intensity) * k;
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
