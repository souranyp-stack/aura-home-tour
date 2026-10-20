import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedural Mediterranean planting: Italian cypress, stone pine, olive and
// low maquis shrubs. Trunks are merged tubes; all foliage is one instanced
// mesh of alpha-cut leaf cards with canopy-spherical normals for soft light.

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const SPECIES = {
  cypress: { tint: [0.34, 0.42, 0.27], cards: 300, card: 0.95 },
  pine: { tint: [0.46, 0.54, 0.34], cards: 420, card: 1.35 },
  olive: { tint: [0.66, 0.70, 0.56], cards: 260, card: 0.8 },
  shrub: { tint: [0.46, 0.50, 0.33], cards: 26, card: 0.7 },
};

function branch(points, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segs = Math.max(4, points.length * 4);
  const geo = new THREE.TubeGeometry(curve, segs, 1, 7, false);
  // taper the tube from r0 to r1
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const center = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 8);
    const t = ring / segs;
    curve.getPointAt(Math.min(1, t), center);
    const r = THREE.MathUtils.lerp(r0, r1, t);
    pos.setXYZ(i, center.x + nrm.getX(i) * r, center.y + nrm.getY(i) * r, center.z + nrm.getZ(i) * r);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createVegetation(M, plantings) {
  const trunks = [];
  const cards = []; // {pos, quat, scale, normal, tint}
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();

  const pushCard = (r, center, p, size, tint, upBias = 0.3) => {
    const n = p.clone().sub(center).normalize();
    n.y += upBias;
    n.normalize();
    tmpE.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
    tmpQ.setFromEuler(tmpE);
    const v = 0.85 + r() * 0.3;
    cards.push({ p, q: tmpQ.clone(), s: size * (0.75 + r() * 0.5), n, c: tint.map((x) => x * v) });
  };

  for (const pl of plantings) {
    const r = rng(pl.seed ?? Math.floor(pl.x * 131 + pl.z * 17));
    const sp = SPECIES[pl.type];
    const s = pl.scale ?? 1;
    const base = new THREE.Vector3(pl.x, pl.y, pl.z);

    if (pl.type === 'cypress') {
      const h = (9 + r() * 4) * s;
      trunks.push(branch([base.clone(), base.clone().add(new THREE.Vector3(0, h * 0.5, 0))], 0.22 * s, 0.1 * s));
      const center = base.clone().add(new THREE.Vector3(0, h * 0.55, 0));
      for (let i = 0; i < sp.cards * s; i++) {
        const t = r();
        const y = 0.6 + t * (h - 0.6);
        const prof = Math.pow(Math.sin(Math.PI * Math.min(1, (t * 0.92 + 0.04))), 0.75);
        const rad = (0.95 * s) * prof * (0.55 + r() * 0.5);
        const a = r() * Math.PI * 2;
        const p = new THREE.Vector3(pl.x + Math.cos(a) * rad, pl.y + y, pl.z + Math.sin(a) * rad);
        pushCard(r, new THREE.Vector3(pl.x, pl.y + y, pl.z), p, sp.card * s, sp.tint, 0.15);
      }
    } else if (pl.type === 'pine' || pl.type === 'olive') {
      const isPine = pl.type === 'pine';
      const h = (isPine ? 8 + r() * 3 : 2.4 + r() * 0.8) * s;
      const lean = new THREE.Vector3((r() - 0.5) * (isPine ? 2.6 : 0.9), 0, (r() - 0.5) * (isPine ? 2.6 : 0.9)).multiplyScalar(s);
      const top = base.clone().add(new THREE.Vector3(lean.x, h, lean.z));
      const mid = base.clone().lerp(top, 0.5).add(new THREE.Vector3((r() - 0.5) * 0.6 * s, 0, (r() - 0.5) * 0.6 * s));
      trunks.push(branch([base.clone().add(new THREE.Vector3(0, -0.3, 0)), mid, top], (isPine ? 0.32 : 0.26) * s, (isPine ? 0.14 : 0.1) * s));
      const crownR = (isPine ? 4.8 : 2.4) * s;
      const crownH = (isPine ? 1.9 : 2.0) * s;
      const crownC = top.clone().add(new THREE.Vector3(0, isPine ? 0.6 * s : 0.9 * s, 0));
      const nBranch = isPine ? 7 : 6;
      const tips = [];
      for (let b = 0; b < nBranch; b++) {
        const a = (b / nBranch) * Math.PI * 2 + r() * 0.6;
        const rr = crownR * (0.45 + r() * 0.4);
        const tip = crownC.clone().add(new THREE.Vector3(Math.cos(a) * rr, (r() - 0.3) * crownH * 0.6, Math.sin(a) * rr));
        const knee = top.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, crownH * 0.25, 0));
        trunks.push(branch([top.clone().add(new THREE.Vector3(0, -0.4 * s, 0)), knee, tip], (isPine ? 0.13 : 0.09) * s, 0.03 * s));
        tips.push(tip);
      }
      for (let i = 0; i < sp.cards * s; i++) {
        const tip = tips[Math.floor(r() * tips.length)];
        const u = new THREE.Vector3(r() * 2 - 1, (r() * 2 - 1) * 0.5, r() * 2 - 1);
        const p = tip.clone().add(u.multiplyScalar(crownR * 0.42));
        // keep pine crowns flat-topped like umbrellas
        if (isPine) p.y = Math.min(p.y, crownC.y + crownH * 0.5) - r() * crownH * 0.4;
        pushCard(r, crownC.clone().add(new THREE.Vector3(0, -crownH, 0)), p, sp.card * s, sp.tint, isPine ? 0.6 : 0.3);
      }
    } else if (pl.type === 'shrub') {
      const rad = 0.75 * s;
      const c = base.clone().add(new THREE.Vector3(0, -0.1, 0));
      const tint = sp.tint.map((x, i) => x * (0.85 + r() * 0.3) * (i === 1 ? 1 + (r() - 0.5) * 0.2 : 1));
      for (let i = 0; i < sp.cards; i++) {
        const u = new THREE.Vector3(r() * 2 - 1, r() * 0.9, r() * 2 - 1).normalize().multiplyScalar(rad * Math.cbrt(r()));
        pushCard(r, c, c.clone().add(u), sp.card * s, tint, 0.5);
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'vegetation';

  if (trunks.length) {
    const g = mergeGeometries(trunks.map((t) => t.deleteAttribute('uv') && t), false);
    // re-add simple uvs so the bark normal map has coordinates
    const n = g.attributes.position.count;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv[i * 2] = g.attributes.position.getX(i) + g.attributes.position.getZ(i); uv[i * 2 + 1] = g.attributes.position.getY(i); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const trunkMesh = new THREE.Mesh(g, M.bark);
    trunkMesh.castShadow = trunkMesh.receiveShadow = true;
    group.add(trunkMesh);
  }

  // Foliage is split by distance: only planting near the house can fall inside
  // the sun's shadow frustum, so only that set renders into the shadow map.
  const near = cards.filter((c) => Math.hypot(c.p.x - 3, c.p.z - 4) < 46);
  const far = cards.filter((c) => Math.hypot(c.p.x - 3, c.p.z - 4) >= 46);
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  for (const [set, shadows] of [[near, true], [far, false]]) {
    if (!set.length) continue;
    const cardGeo = new THREE.PlaneGeometry(1, 1);
    const leaves = new THREE.InstancedMesh(cardGeo, M.leaves, set.length);
    const canopyN = new Float32Array(set.length * 3);
    set.forEach((c, i) => {
      mtx.compose(c.p, c.q, new THREE.Vector3(c.s, c.s, c.s));
      leaves.setMatrixAt(i, mtx);
      leaves.setColorAt(i, col.setRGB(c.c[0], c.c[1], c.c[2]));
      canopyN.set([c.n.x, c.n.y, c.n.z], i * 3);
    });
    cardGeo.setAttribute('aCanopyN', new THREE.InstancedBufferAttribute(canopyN, 3));
    leaves.castShadow = shadows;
    leaves.receiveShadow = true;
    leaves.computeBoundingSphere();
    group.add(leaves);
  }

  return group;
}

// Adds canopy normals and a gentle wind sway to the shared leaf material.
export function patchLeaves(mat) {
  const prev = mat.onBeforeCompile;
  mat.customProgramCacheKey = () => 'aura-leaves';
  mat.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aCanopyN;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  float sway = sin(uTime * 1.4 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.21);
  transformed.x += sway * 0.05 * (uv.y + 0.3);
  transformed.z += cos(uTime * 1.1 + instanceMatrix[3].y) * 0.03 * uv.y;
#endif`
      )
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\ntransformedNormal = normalize(normalMatrix * aCanopyN);');
  };
}
