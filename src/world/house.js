import * as THREE from 'three';
import { metricUV } from './materials.js';

// The residence is nine masses. Each has a "sculpture" pose (an abstract
// composition floating in the void) and a "built" pose. Scroll interpolates
// between them with staggered windows so the house assembles mass by mass.
//
// Datum: upper floor level FL = 4.05 m above the headland plateau (y = 0).
// The cliff edge runs along z ≈ -3; the sea lies toward -z.

export const FL = 4.05;

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = metricUV(new THREE.BoxGeometry(w, h, d));
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
      spin: sculpt.spin ?? 1,
    });
  };

  // 1 — Plinth: the stone ground floor (bedrooms), a long horizontal window band to the sea.
  {
    const g = new THREE.Group();
    g.add(box(28, 3.6, 12, M.limestone));
    g.add(box(20, 1.35, 0.1, M.glassDark, 1.5, 0.25, -6.02));
    g.add(box(20.2, 0.07, 0.16, M.bronze, 1.5, 0.96, -6.04));
    g.add(box(20.2, 0.07, 0.16, M.bronze, 1.5, -0.46, -6.04));
    for (let i = 0; i <= 8; i++) g.add(box(0.05, 1.35, 0.14, M.bronze, -8.5 + i * 2.5, 0.25, -6.05));
    add('plinth', g, new THREE.Vector3(1, 1.8, 4),
      { pos: new THREE.Vector3(3, -2.2, 2), quat: q(0, 16, 0), spin: 0.6 }, [0.0, 0.42]);
  }

  // 2 — Spine: a limestone blade that anchors into the cliff and runs past the edge.
  {
    const g = new THREE.Group();
    g.add(box(1.2, 16, 26, M.limestone));
    add('spine', g, new THREE.Vector3(-9.6, 1.5, 2),
      { pos: new THREE.Vector3(-3.5, 7.5, 4), quat: q(-38, 28, 6), spin: 1 }, [0.04, 0.5]);
  }

  // 3 — East fin: a second, shorter blade that carries the roof's far end.
  {
    const g = new THREE.Group();
    g.add(box(0.8, 7.5, 6, M.limestone));
    add('fin', g, new THREE.Vector3(17.1, 3.75, 4),
      { pos: new THREE.Vector3(12.5, 4.5, -3), quat: q(84, -20, 0), spin: 1.3 }, [0.1, 0.54]);
  }

  // 4 — Hearth mass: the chimney that rises through the roof.
  {
    const g = new THREE.Group();
    g.add(box(1.8, 6.15, 2.5, M.limestone));
    add('hearth', g, new THREE.Vector3(-8.1, 7.125, 5.75),
      { pos: new THREE.Vector3(9, 0.5, 7.5), quat: q(12, 40, -24), spin: 1.6 }, [0.16, 0.6]);
  }

  // 5 — Floor plate: the upper level and its 5 m terrace over the cliff.
  {
    const g = new THREE.Group();
    const mats = [M.travertine, M.travertine, M.travertine, M.render, M.travertine, M.travertine];
    // Two parts leave the opening the pool hangs in (x 3.5…16, z -8…-4.4).
    const a = new THREE.Mesh(metricUV(new THREE.BoxGeometry(26, 0.45, 14.4)), mats);
    a.position.set(0, 0, 1.8);
    const b = new THREE.Mesh(metricUV(new THREE.BoxGeometry(13.5, 0.45, 3.6)), mats);
    b.position.set(-6.25, 0, -7.2);
    for (const s of [a, b]) { s.castShadow = s.receiveShadow = true; g.add(s); }
    add('slab', g, new THREE.Vector3(3, FL - 0.225, 1),
      { pos: new THREE.Vector3(5, 4.2, 0), quat: q(0, -12, 24), spin: 0.8 }, [0.24, 0.68]);
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
      if (k === 4) door = pane;
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
      { pos: new THREE.Vector3(3.5, 8.5, 1.5), quat: q(14, 45, -8), spin: 1.2 }, [0.34, 0.78]);
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
      { pos: new THREE.Vector3(10, 13.5, -1), quat: q(-20, -30, 16), spin: 1.4 }, [0.42, 0.86]);
  }

  // 8 — Entry court at grade on the landward side.
  {
    const g = new THREE.Group();
    g.add(box(24, 0.24, 6, M.travertine));
    add('court', g, new THREE.Vector3(3, 0.12, 13),
      { pos: new THREE.Vector3(-6, 14.5, 7), quat: q(28, 10, -14), spin: 0.9 }, [0.3, 0.74]);
  }

  // 9 — Roof plate: thin, deep overhang, bronze edge, oak soffit. It lands last.
  {
    const g = new THREE.Group();
    const roof = new THREE.Mesh(metricUV(new THREE.BoxGeometry(27.5, 0.55, 19.5)),
      [M.bronze, M.bronze, M.render, M.oak, M.bronze, M.bronze]);
    roof.castShadow = roof.receiveShadow = true;
    g.add(roof);
    add('roof', g, new THREE.Vector3(3.75, FL + H + 0.275, 0.25),
      { pos: new THREE.Vector3(4, 15.5, 3), quat: q(-14, -22, 10), spin: 0.7 }, [0.55, 1.0]);
  }

  // Sculpture-state pivot: the whole composition slowly turns about this point.
  const pivot = new THREE.Vector3(3, 6, 2);

  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _spin = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /**
   * @param assemble 0 = sculpture, 1 = built
   * @param time seconds, for the idle drift of the sculpture
   */
  function update(assemble, time) {
    const idle = 1 - THREE.MathUtils.smoothstep(assemble, 0, 0.35);
    for (const p of pieces) {
      const [a, b] = p.win;
      const t = THREE.MathUtils.clamp((assemble - a) / (b - a), 0, 1);
      const e = ease(t);
      // sculpture pose with slow turn and float
      const ang = (time * 0.05 * p.spin + 0.0) * idle;
      _spin.setFromAxisAngle(up, ang * 0.25);
      _p.copy(p.sculptPos).sub(pivot).applyQuaternion(_spin).add(pivot);
      _p.y += Math.sin(time * 0.6 + p.spin * 4) * 0.25 * idle;
      _q.copy(_spin).multiply(p.sculptQuat);
      // interpolate to built pose along a gentle lifted arc
      p.group.position.lerpVectors(_p, p.buildPos, e);
      p.group.position.y += Math.sin(Math.PI * e) * 1.6;
      p.group.quaternion.slerpQuaternions(_q, p.buildQuat, e);
    }
  }

  return { root, pieces, update, door, poolWater, pavilion: pav };
}
