import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { metricUV } from './materials.js';
import { mergeStatic } from '../core/merge.js';

// The residence is nine masses. Each has a "sculpture" pose (an abstract
// composition floating in the void) and a "built" pose. Scroll interpolates
// between them with staggered windows so the house assembles mass by mass.
//
// Datum: upper floor level FL = 4.05 m above the headland plateau (y = 0).
// The cliff edge runs along z ≈ -3; the sea lies toward -z.

export const FL = 4.05;

// Every block gets a small eased arris (as cut stone and folded metal have),
// so edges catch a highlight instead of meeting at a CG-perfect corner.
function bevelled(w, h, d, r) {
  const radius = Math.min(r ?? 0.025, Math.min(w, h, d) * 0.22);
  return metricUV(new RoundedBoxGeometry(w, h, d, 2, radius));
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, r) {
  const g = bevelled(w, h, d, r);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const deg = THREE.MathUtils.degToRad;
const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(x), deg(y), deg(z), 'YXZ'));

export function createHouse(M) {
  const root = new THREE.Group();
  root.name = 'house';
  const pieces = [];

  const add = (name, group, build, sculpt, win) => {
    group.name = name;
    root.add(group);
    pieces.push({
      name, group, win,
      buildPos: build.clone(), buildQuat: new THREE.Quaternion(),
      sculptPos: sculpt.pos, sculptQuat: sculpt.quat,
      spin: sculpt.spin ?? 1, orbit: !!sculpt.orbit, angle: 0,
    });
  };

  // 1 — Plinth: the stone ground floor (bedrooms). The window band is a true
  // opening: a 300 mm stone skin around it, glass set back in deep reveals.
  {
    const g = new THREE.Group();
    const bx0 = -8.5, bx1 = 11.5, by0 = -0.425, by1 = 0.925; // band, local coords
    // hollow since the rooms were built: in local coords the rooms run x -10…13.4,
    // z -5.7…5.4, under a stone lid; only the block west of the spine stays solid
    g.add(box(4, 3.6, 11.7, M.limestone, -12, 0, 0.15)); // west of the spine
    g.add(box(0.6, 3.6, 11.7, M.limestone, 13.7, 0, 0.15)); // east wall
    const northZ = 5.7; // the north wall, with the front door in it at x 1.2…2.8
    g.add(box(11.2, 3.6, 0.6, M.limestone, -4.4, 0, northZ));
    g.add(box(10.6, 3.6, 0.6, M.limestone, 8.1, 0, northZ));
    g.add(box(1.6, 1.2, 0.6, M.limestone, 2, 1.2, northZ));
    // the lid, 300 mm thick, with the opening for the inside stair at x -7.6…-1.66, z 3…4
    const lidY = 1.65;
    g.add(box(23.4, 0.3, 8.7, M.limestone, 1.7, lidY, -1.35));
    g.add(box(23.4, 0.3, 1.4, M.limestone, 1.7, lidY, 4.7));
    g.add(box(2.4, 0.3, 1, M.limestone, -8.8, lidY, 3.5));
    g.add(box(15.06, 0.3, 1, M.limestone, 5.87, lidY, 3.5));
    g.add(box(28, by0 + 1.8, 0.3, M.limestone, 0, (-1.8 + by0) / 2, -5.85));
    g.add(box(28, 1.8 - by1, 0.3, M.limestone, 0, (by1 + 1.8) / 2, -5.85));
    g.add(box(bx0 + 14, by1 - by0, 0.3, M.limestone, (-14 + bx0) / 2, (by0 + by1) / 2, -5.85));
    g.add(box(14 - bx1, by1 - by0, 0.3, M.limestone, (bx1 + 14) / 2, (by0 + by1) / 2, -5.85));
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, bw = bx1 - bx0, bh = by1 - by0;
    g.add(box(bw, bh, 0.04, M.glassDark, cx, cy, -5.72, 0.004));
    g.add(box(bw, 0.05, 0.1, M.bronze, cx, by1 - 0.025, -5.76, 0.006));
    g.add(box(bw, 0.05, 0.1, M.bronze, cx, by0 + 0.025, -5.76, 0.006));
    for (let i = 0; i <= 8; i++) g.add(box(0.05, bh, 0.09, M.bronze, bx0 + i * 2.5, cy, -5.77, 0.006));
    add('plinth', g, new THREE.Vector3(1, 1.8, 4),
      { pos: new THREE.Vector3(3, -1.2, 2), quat: q(0, 12, 0), spin: 0.35 }, [0.08, 0.42]);
  }

  // 2 — Spine: a limestone blade that anchors into the cliff and runs past the edge.
  {
    const g = new THREE.Group();
    g.add(box(1.2, 16, 26, M.limestone));
    add('spine', g, new THREE.Vector3(-9.6, 1.5, 2),
      { pos: new THREE.Vector3(-8, 6, 30), quat: q(0, -40, 0), spin: 0 }, [0.5, 0.86]);
  }

  // 3 — East fin: a second, shorter blade that carries the roof's far end.
  {
    const g = new THREE.Group();
    g.add(box(0.8, 7.5, 6, M.limestone));
    add('fin', g, new THREE.Vector3(17.1, 3.75, 4),
      { pos: new THREE.Vector3(3, 5.65, 2), quat: q(0, 30, 0), spin: 0.9 }, [0.02, 0.32]);
  }

  // 4 — Hearth mass: the chimney that rises through the roof.
  {
    const g = new THREE.Group();
    g.add(box(1.8, 6.15, 2.5, M.limestone));
    add('hearth', g, new THREE.Vector3(-8.1, 7.125, 5.75),
      { pos: new THREE.Vector3(3, 20.15, 2), quat: q(0, -20, 0), spin: 1.1 }, [0.74, 1.0]);
  }

  // 5 — Floor plate: the upper level and its 5 m terrace over the cliff.
  {
    const g = new THREE.Group();
    const mats = [M.travertine, M.travertine, M.travertine, M.render, M.travertine, M.travertine];
    // Two parts leave the opening the pool hangs in (x 3.5…16, z -8…-4.4).
    // The main plate is cut around the inside stair (local x -9.6…-3.66, z 6…7).
    const plate = (w, d, x, z) => {
      const s = new THREE.Mesh(bevelled(w, 0.45, d, 0.03), mats);
      s.position.set(x, 0, z);
      s.castShadow = s.receiveShadow = true;
      g.add(s);
    };
    plate(26, 11.4, 0, 0.3);
    plate(26, 2, 0, 8);
    plate(3.4, 1, -11.3, 6.5);
    plate(16.66, 1, 4.67, 6.5);
    plate(13.5, 3.6, -6.25, -7.2);
    // frameless low-iron balustrade along the terrace edge, bronze shoe and cap
    const rail = (len, x, z, alongX) => {
      const [w, d] = alongX ? [len, 0.016] : [0.016, len];
      const pane = box(w, 1.0, d, M.glass, x, 0.225 + 0.52, z, 0.004);
      pane.castShadow = false;
      g.add(pane);
      g.add(box(alongX ? len : 0.05, 0.03, alongX ? 0.05 : len, M.bronze, x, 0.225 + 1.035, z, 0.008));
      g.add(box(alongX ? len : 0.08, 0.05, alongX ? 0.08 : len, M.bronze, x, 0.225 + 0.025, z, 0.008));
    };
    rail(13.3, -6.25, -8.9, true);
    // external stair from the east deck down to the court: 22 solid stone steps
    // rising from grade, in slab coordinates (world x - 3, y - (FL - 0.225), z - 1)
    {
      const STEPS = 22, rise = (FL - 0.24) / STEPS, run = 6.4 / STEPS, top = 0.225;
      for (let i = 0; i < STEPS; i++) {
        const y = top - i * rise;
        const bottom = -FL + 0.225 + 0.24;
        const h = y - bottom;
        g.add(box(1.6, h - 0.05, run, M.limestone, 10, y - 0.05 - (h - 0.05) / 2, 9 + run * (i + 0.5)));
        g.add(box(1.68, 0.05, run + 0.02, M.travertine, 10, y - 0.025, 9 + run * (i + 0.5)));
      }
      const slope = Math.hypot(6.4, FL - 0.24);
      for (const x of [9.14, 10.86]) {
        const handrail = box(0.04, 0.04, slope, M.bronze, x, top + 0.86 - (FL - 0.24) / 2, 9 + 3.2);
        handrail.rotation.x = Math.atan2(FL - 0.24, 6.4);
        g.add(handrail);
        for (const t of [0.08, 0.5, 0.92]) g.add(box(0.025, 0.86, 0.025, M.bronze, x, top - t * (FL - 0.24) + 0.43, 9 + t * 6.4));
      }
    }
    add('slab', g, new THREE.Vector3(3, FL - 0.225, 1),
      { pos: new THREE.Vector3(3, 9.85, 2), quat: q(0, 22, 0), spin: 0.55 }, [0.3, 0.62]);
  }

  // 6 — Glass pavilion: mullion cage, glazing, and the travertine back wall.
  const pav = new THREE.Group();
  const H = 3.45;
  let door = null;
  {
    // front (sea) elevation, z = -4 relative to world; group centre (1, FL + H/2, 2)
    const zF = -6, x0 = -10;
    for (let k = 0; k < 8; k++) {
      const pane = box(2.46, H - 0.12, 0.03, M.glass, x0 + 1.25 + k * 2.5, 0, zF);
      pane.castShadow = false;
      if (k === 4) {
        door = pane;
        // a bronze pull, so it reads as a door you can slide
        door.add(box(0.022, 0.95, 0.022, M.bronze, -1.08, -0.32, -0.05, 0.004));
      }
      pav.add(pane);
    }
    for (let k = 0; k <= 8; k++) pav.add(box(0.06, H, 0.12, M.bronze, x0 + k * 2.5, 0, zF));
    pav.add(box(20.1, 0.08, 0.16, M.bronze, 0, H / 2 - 0.04, zF));
    pav.add(box(20.1, 0.05, 0.16, M.bronze, 0, -H / 2 + 0.025, zF));
    // east elevation, x = 11 world → 10 relative
    for (let k = 0; k < 4; k++) {
      const pane = box(0.03, H - 0.12, 2.96, M.glass, 10, 0, -6 + 1.5 + k * 3);
      pane.castShadow = false;
      pav.add(pane);
    }
    for (let k = 1; k <= 4; k++) pav.add(box(0.12, H, 0.06, M.bronze, 10, 0, -6 + k * 3));
    pav.add(box(0.16, 0.08, 12, M.bronze, 10, H / 2 - 0.04, 0));
    // back wall, interior face travertine
    pav.add(box(20, H, 0.35, M.travertine, 0, 0, 6.175));
    add('pavilion', pav, new THREE.Vector3(1, FL + H / 2, 2),
      { pos: new THREE.Vector3(3, 12.125, 2), quat: q(0, -8, 0), spin: -0.5 }, [0.4, 0.72]);
  }

  // 7 — Infinity pool, hung under the terrace with its vanishing edge to the sea.
  const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(12.9, 3.2), M.poolWater);
  {
    const g = new THREE.Group();
    g.add(box(13.5, 1.3, 3.6, M.travertine, 0, -0.1, 0));
    g.add(box(0.3, 0.2, 3.6, M.travertine, -6.6, 0.65, 0));
    g.add(box(0.3, 0.2, 3.6, M.travertine, 6.6, 0.65, 0));
    g.add(box(13.5, 0.2, 0.3, M.travertine, 0, 0.65, 1.65));
    g.add(box(13.5, 0.12, 0.2, M.travertine, 0, 0.6, -1.7));
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(0, 0.7, -0.05);
    poolWater.receiveShadow = true;
    g.add(poolWater);
    add('pool', g, new THREE.Vector3(10.25, FL - 0.75, -6.2),
      { pos: new THREE.Vector3(3, 15.0, 2), quat: q(0, 35, 0), spin: 0.8 }, [0.48, 0.8]);
  }

  // 8 — Entry court at grade on the landward side.
  {
    const g = new THREE.Group();
    g.add(box(24, 0.24, 6, M.travertine));
    add('court', g, new THREE.Vector3(3, 0.12, 13),
      { pos: new THREE.Vector3(3, 1.4, 2), quat: q(0, -18, 0), spin: -0.7 }, [0.0, 0.3]);
  }

  // 9 — Roof plate: thin, deep overhang, bronze edge, oak soffit. It lands last.
  {
    const g = new THREE.Group();
    // a 450 mm plate held 120 mm behind a 220 mm bronze fascia: from the
    // ground the roof reads as one thin bronze line over a band of shadow
    const W = 27.5, D = 19.5, T = 0.55;
    const core = new THREE.Mesh(bevelled(W - 0.24, 0.45, D - 0.24, 0.02),
      [M.render, M.render, M.render, M.oak, M.render, M.render]);
    core.position.y = -T / 2 + 0.225;
    core.castShadow = core.receiveShadow = true;
    g.add(core);
    const fy = T / 2 - 0.11;
    g.add(box(W, 0.22, 0.03, M.bronze, 0, fy, -D / 2 + 0.015, 0.006));
    g.add(box(W, 0.22, 0.03, M.bronze, 0, fy, D / 2 - 0.015, 0.006));
    g.add(box(0.03, 0.22, D, M.bronze, -W / 2 + 0.015, fy, 0, 0.006));
    g.add(box(0.03, 0.22, D, M.bronze, W / 2 - 0.015, fy, 0, 0.006));
    // the 86 m² photovoltaic field sits inside the fascia, invisible from below
    for (let i = 0; i < 10; i++)
      for (let j = 0; j < 5; j++)
        g.add(box(1.68, 0.04, 1.0, M.pv, -8.6 + i * 1.78 + 1.2, T / 2 - 0.08, -3.2 + j * 1.08 + 0.6, 0.006));
    add('roof', g, new THREE.Vector3(3.75, FL + H + 0.275, 0.25),
      { pos: new THREE.Vector3(3, 16.4, 2), quat: q(0, -14, 0), spin: -0.3 }, [0.6, 0.92]);
  }

  // one draw per material per mass; the sliding door stays separate so it can move
  for (const p of pieces) mergeStatic(p.group, p.name === 'pavilion' ? [door] : []);

  // Sculpture: an exploded axonometric of the house itself. Every mass keeps
  // its true plan position and is lifted apart in layers, joined to where it
  // will land by bronze projection lines, the way an architect draws one.
  // Assembly is the layers coming straight down those lines.
  const EXPLODE = {
    court: { d: [0, -3.4, 0], win: [0.0, 0.32] },
    plinth: { d: [0, 0, 0], win: [0.0, 0.2] },
    spine: { d: [-9, 4, 0], win: [0.06, 0.44] },
    fin: { d: [7.5, 5, 0], win: [0.1, 0.48] },
    slab: { d: [0, 5, 0], win: [0.18, 0.56] },
    pool: { d: [0, 2.2, -6.5], win: [0.3, 0.66] },
    pavilion: { d: [0, 8.6, 0], win: [0.38, 0.76] },
    hearth: { d: [0, 13.2, 0], win: [0.52, 0.88] },
    roof: { d: [0, 18.5, 0], win: [0.6, 1.0] },
  };
  for (const p of pieces) {
    const e = EXPLODE[p.name];
    p.sculptPos = p.buildPos.clone().add(new THREE.Vector3(...e.d));
    p.sculptQuat = new THREE.Quaternion();
    p.win = e.win;
    p.drift = pieces.indexOf(p) * 0.9;
  }
  const pivot = new THREE.Vector3(3, 8.5, 2);

  // projection lines: each lifted layer's corners, down to where they land
  const footprints = {
    court: [-9, 10, 15, 16, 0.24],
    slab: [-10, -8, 16, 10, 4.05],
    pavilion: [-9, -4, 11, 8, 7.5],
    hearth: [-9, 4.5, -7.2, 7, 10.2],
    roof: [-10, -9.5, 17.5, 10, 8.05],
    pool: [3.5, -8, 17, -4.4, 4.05],
  };
  const seg = [];
  for (const [name, [x0, z0, x1, z1, y]] of Object.entries(footprints)) {
    const d = EXPLODE[name].d;
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) seg.push(x, y, z, x + d[0], y + d[1], z + d[2]);
  }
  for (const [name, x, y0, z] of [['spine', -9.6, 9.5, -11], ['spine', -9.6, 9.5, 15], ['fin', 17.1, 7.5, 1], ['fin', 17.1, 7.5, 7]]) {
    const d = EXPLODE[name].d;
    seg.push(x, y0, z, x + d[0], y0 + d[1], z + d[2]);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const lineMat = new THREE.LineDashedMaterial({ color: 0xe0bd84, dashSize: 0.34, gapSize: 0.24, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.computeLineDistances();
  lines.frustumCulled = false;
  const lineRig = new THREE.Group();
  lineRig.position.copy(pivot);
  lines.position.copy(pivot).multiplyScalar(-1);
  lineRig.add(lines);
  root.add(lineRig);

  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _sway = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /**
   * @param assemble 0 = exploded, 1 = built
   * @param time seconds, for the slow sway and the breathing of the layers
   */
  function update(assemble, time) {
    const idle = 1 - THREE.MathUtils.smoothstep(assemble, 0, 0.14);
    const sway = 0.36 * Math.sin(time * 0.1) * idle;
    _sway.setFromAxisAngle(up, sway);
    for (const p of pieces) {
      const [a, b] = p.win;
      const t = THREE.MathUtils.clamp((assemble - a) / (b - a), 0, 1);
      const e = ease(t);
      _p.copy(p.sculptPos).sub(pivot).applyQuaternion(_sway).add(pivot);
      _p.y += Math.sin(time * 0.55 + p.drift) * 0.16 * idle;
      _q.copy(_sway);
      p.group.position.lerpVectors(_p, p.buildPos, e);
      p.group.quaternion.slerpQuaternions(_q, p.buildQuat, e);
    }
    lineRig.quaternion.copy(_sway);
    lineMat.opacity = 0.85 * (1 - THREE.MathUtils.smoothstep(assemble, 0.02, 0.3));
    lines.visible = lineMat.opacity > 0.01;
  }

  // The masses rising out of the drawing: each is squashed onto a plane and grows
  // back to full height. Call after update; level(i) is 0 flat, 1 standing.
  let risen = true;
  function rise(plane, level) {
    risen = false;
    pieces.forEach((p, i) => {
      const k = level(i);
      p.group.visible = k > 0.004;
      p.group.position.y = plane + (p.group.position.y - plane) * k;
      p.group.scale.y = Math.max(0.004, k);
    });
  }
  function stand() {
    if (risen) return;
    risen = true;
    for (const p of pieces) { p.group.scale.y = 1; p.group.visible = true; }
  }

  return { root, pieces, update, rise, stand, door, poolWater, pavilion: pav };
}
