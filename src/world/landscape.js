import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { auraPatch } from './materials.js';

// A limestone headland. The plateau sits at y = 0, the sea at SEA = -34.
// The house occupies x -10…18, z -9…16 and cantilevers past the cliff edge
// (z ≈ -3.5). The coast bends back on both sides so the house reads as the
// point of a promontory from the water.

export const SEA = -34;
const simplex = new SimplexNoise({ random: mulberry(7) });
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n2 = (x, y) => simplex.noise(x, y);
function fbm(x, y, o = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < o; i++) { s += a * n2(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function edgeZ(x) {
  const d = Math.max(0, Math.abs(x - 3) - 15);
  return -3.5 + 92 * (1 - Math.exp(-(d * d) / 3200)) + fbm(x * 0.012, 3.1, 4) * 14 * smooth(0, 25, d) + 30 * Math.sin((x - 3) * 0.004);
}

export function heightAt(x, z) {
  const dHouse = Math.hypot(x - 3, z - 3);
  // plateau: flat around the house, rising gently inland into low hills
  let top = 0;
  const away = smooth(28, 90, dHouse);
  top += away * (fbm(x * 0.008, z * 0.008, 5) * 9 + 3);
  top += smooth(60, 520, z) * 70 * (0.7 + 0.3 * fbm(x * 0.004, 9.3, 3));
  top -= smooth(16, 26, dHouse) * 0 ;
  // cliff
  const ez = edgeZ(x);
  const ragged = fbm(x * 0.05, z * 0.05, 4) * (1.4 + 4.5 * smooth(16, 40, Math.abs(x - 3))) + fbm(x * 0.17, z * 0.17, 3) * 1.2;
  const o = ez - z + ragged;
  if (o <= 0) return top;
  const face = Math.pow(smooth(0, 11, o), 0.85);
  let h = THREE.MathUtils.lerp(top, SEA - 12, face);
  // strata ledges on the face and a rocky shelf at the waterline
  h += Math.sin((h - SEA) * 0.55 + fbm(x * 0.02, z * 0.02, 2) * 3) * 0.9 * face * (1 - face);
  h += smooth(9, 16, o) * (1 - smooth(16, 40, o)) * (8 + fbm(x * 0.05, z * 0.05, 4) * 6);
  h += fbm(x * 0.03 + 4, z * 0.03, 3) * 3 * smooth(14, 30, o);
  return h;
}

const TRIPLANAR_PARS = /* glsl */ `
uniform sampler2D tRock; uniform sampler2D tRockN; uniform sampler2D tGround; uniform sampler2D tGroundN;
varying vec3 vWN;
`;

const TRIPLANAR_COLOR = /* glsl */ `
vec3 wn = normalize(vWN);
vec3 bw = pow(abs(wn), vec3(5.0)); bw /= dot(bw, vec3(1.0));
vec3 P = vAuraWP;
const float RS = 1.0 / 24.0;
vec3 rock = texture2D(tRock, P.zy * RS).rgb * bw.x + texture2D(tRock, P.xz * RS).rgb * bw.y + texture2D(tRock, P.xy * RS).rgb * bw.z;
float macro = auraFbm(P * 0.012) ;
float macro2 = auraFbm(P * 0.045 + 7.0);
rock *= mix(0.78, 1.12, macro) * mix(0.9, 1.06, macro2);
rock = mix(rock, rock * vec3(1.05, 0.95, 0.85), smoothstep(0.55, 0.75, macro2) * 0.6);
vec3 gr = texture2D(tGround, P.xz / 8.0).rgb * mix(vec3(1.0), texture2D(tGround, P.xz / 61.0).rgb * 1.7, 0.5);
float flatness = smoothstep(0.62, 0.88, wn.y);
float plateau = smoothstep(-9.0, -2.0, P.y);
float g = flatness * mix(0.35, 1.0, plateau);
float wet = 1.0 - smoothstep(${SEA.toFixed(1)} - 0.5, ${SEA.toFixed(1)} + 2.5, P.y);
vec3 terr = mix(rock, gr, g);
terr *= mix(1.0, 0.45, wet);
diffuseColor.rgb = terr;
vec3 tnX = texture2D(tRockN, P.zy * RS).xyz * 2.0 - 1.0;
vec3 tnY = mix(texture2D(tRockN, P.xz * RS).xyz, texture2D(tGroundN, P.xz / 8.0).xyz, g) * 2.0 - 1.0;
vec3 tnZ = texture2D(tRockN, P.xy * RS).xyz * 2.0 - 1.0;
tnX = vec3(tnX.xy + wn.zy, abs(tnX.z) * wn.x);
tnY = vec3(tnY.xy + wn.xz, abs(tnY.z) * wn.y);
tnZ = vec3(tnZ.xy + wn.xy, abs(tnZ.z) * wn.z);
vec3 triN = normalize(tnX.zyx * bw.x + tnY.xzy * bw.y + tnZ.xyz * bw.z);
float terrRough = mix(0.92, 0.98, g) - wet * 0.5;
`;

export function triplanarMaterial(M) {
  const mat = auraPatch(new THREE.MeshStandardMaterial({ roughness: 0.95 }), { mode: 'world' });
  const prev = mat.onBeforeCompile;
  mat.customProgramCacheKey = () => 'aura-terrain';
  mat.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.tRock = { value: M.textures.rock.map };
    sh.uniforms.tRockN = { value: M.textures.rock.normalMap };
    sh.uniforms.tGround = { value: M.textures.ground.map };
    sh.uniforms.tGroundN = { value: M.textures.ground.normalMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
vec3 wnI = objectNormal;
#ifdef USE_INSTANCING
  wnI = mat3(instanceMatrix) * wnI;
#endif
vWN = normalize(mat3(modelMatrix) * wnI);`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TRIPLANAR_PARS)
      .replace('float auraM = 1.0;', TRIPLANAR_COLOR + '\nfloat auraM = 1.0;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = terrRough;')
      .replace(
        'normal = normalize(mix(auraN0, normal, auraM));',
        'normal = normalize(mix(auraN0, normal, auraM));\nnormal = normalize((viewMatrix * vec4(triN, 0.0)).xyz);'
      );
  };
  return mat;
}

function terrainGeometry() {
  const N = 360;
  const R = 760;
  const cx = 3, cz = 4;
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 2.0) * R;
  const pos = new Float32Array((N + 1) * (N + 1) * 3);
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = cx + warp(i / N * 2 - 1);
      const z = cz + warp(j / N * 2 - 1);
      const k = (j * (N + 1) + i) * 3;
      pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
    }
  }
  const idx = new Uint32Array(N * N * 6);
  let t = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i, b = a + 1, c = a + (N + 1), d = c + 1;
      idx[t++] = a; idx[t++] = c; idx[t++] = b;
      idx[t++] = b; idx[t++] = c; idx[t++] = d;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

function boulderGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + fbm(v.x * 1.3 + seed, v.y * 1.3 + v.z * 0.7, 4) * 0.45;
    v.multiplyScalar(d);
    v.y *= 0.62;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createLandscape(M) {
  const group = new THREE.Group();
  group.name = 'landscape';
  const terrainMat = triplanarMaterial(M);
  const terrain = new THREE.Mesh(terrainGeometry(), terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = false;
  group.add(terrain);

  // boulders: at the waterline and scattered on the cliff top
  const r = mulberry(21);
  const bGeo = boulderGeometry(3);
  const spots = [];
  for (let i = 0; i < 900 && spots.length < 140; i++) {
    const x = 3 + (r() - 0.5) * 420;
    const ez = edgeZ(x);
    const z = ez - 4 - r() * 26;
    const y = heightAt(x, z);
    if (y < SEA - 3 || y > SEA + 7) continue;
    const s = 1.2 + Math.pow(r(), 2) * 4.5;
    spots.push([x, y + s * 0.15, z, s]);
  }
  for (let i = 0; i < 400 && spots.length < 190; i++) {
    const x = 3 + (r() - 0.5) * 240;
    const z = 4 + r() * 120;
    if (Math.hypot(x - 3, z - 4) < 26) continue;
    const y = heightAt(x, z);
    if (z < edgeZ(x) + 1) continue;
    const s = 0.4 + r() * 1.2;
    spots.push([x, y + s * 0.1, z, s]);
  }
  const boulders = new THREE.InstancedMesh(bGeo, terrainMat, spots.length);
  const m4 = new THREE.Matrix4();
  const qq = new THREE.Quaternion();
  spots.forEach(([x, y, z, s], i) => {
    qq.setFromEuler(new THREE.Euler(r() * 0.4, r() * Math.PI * 2, r() * 0.4));
    m4.compose(new THREE.Vector3(x, y, z), qq, new THREE.Vector3(s, s * (0.7 + r() * 0.6), s * (0.8 + r() * 0.4)));
    boulders.setMatrixAt(i, m4);
  });
  boulders.castShadow = true;
  boulders.receiveShadow = true;
  group.add(boulders);

  // planting list for vegetation.js
  const plantings = [];
  // a garden olive in the entry court and a cypress line along the drive
  plantings.push({ type: 'olive', x: 9.5, y: 0.24, z: 13.2, scale: 1.35, seed: 4 });
  for (let i = 0; i < 6; i++) plantings.push({ type: 'cypress', x: -16 - i * 0.2, y: heightAt(-16, 14 + i * 4.2), z: 14 + i * 4.2, scale: 0.9 + (i % 2) * 0.12, seed: 30 + i });
  for (let i = 0; i < 4; i++) plantings.push({ type: 'cypress', x: 22 + (i % 2) * 1.5, y: heightAt(22, 18 + i * 5), z: 18 + i * 5, scale: 0.85 + (i % 3) * 0.1, seed: 50 + i });
  // stone pines framing the headland
  for (const [x, z, s] of [[-30, 12, 1.1], [-44, 30, 1.25], [34, 9, 1.0], [48, 34, 1.2], [-18, 46, 1.0], [28, 52, 1.15], [-70, 60, 1.3], [74, 66, 1.2]]) {
    if (z < edgeZ(x) + 4) continue;
    plantings.push({ type: 'pine', x, y: heightAt(x, z), z, scale: s, seed: Math.floor(x * 7 + z) });
  }
  // maquis on the plateau, denser away from the house and near the edge
  for (let i = 0; i < 2600 && plantings.length < 560; i++) {
    const x = 3 + (r() - 0.5) * 300;
    const z = -10 + r() * 220;
    const dh = Math.hypot(x - 3, z - 6);
    if (dh < 20) continue;
    const ez = edgeZ(x);
    if (z < ez + 1.5) continue;
    const density = 0.35 + 0.65 * Math.exp(-(z - ez) / 25);
    if (r() > density) continue;
    plantings.push({ type: 'shrub', x, y: heightAt(x, z), z, scale: 0.6 + r() * 1.1, seed: i });
  }

  return { group, terrain, plantings, terrainMat };
}
