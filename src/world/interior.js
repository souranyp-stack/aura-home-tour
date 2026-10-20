import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { metricUV } from './materials.js';
import { FL } from './house.js';

// Living pavilion interior: x -9…11, z -4…8, floor FL, ceiling FL + 3.45.
// Every material here uses 'reveal' mode, so it prints in behind the sweep.

const CEIL = FL + 3.45;

function mesh(geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
const boxG = (w, h, d) => metricUV(new THREE.BoxGeometry(w, h, d));
const rbox = (w, h, d, r = 0.06) => metricUV(new RoundedBoxGeometry(w, h, d, 4, r));

function sofa(M) {
  const g = new THREE.Group();
  g.add(mesh(boxG(3.4, 0.12, 1.02), M.walnut, 0, 0.06, 0));
  g.add(mesh(rbox(3.3, 0.24, 0.98, 0.08), M.boucle, 0, 0.24, 0));
  g.add(mesh(rbox(1.62, 0.16, 0.8, 0.07), M.boucle, -0.83, 0.43, -0.07));
  g.add(mesh(rbox(1.62, 0.16, 0.8, 0.07), M.boucle, 0.83, 0.43, -0.07));
  g.add(mesh(rbox(3.3, 0.42, 0.24, 0.1), M.boucle, 0, 0.6, 0.38));
  g.add(mesh(rbox(0.22, 0.34, 0.98, 0.09), M.boucle, -1.62, 0.5, 0));
  g.add(mesh(rbox(0.22, 0.34, 0.98, 0.09), M.boucle, 1.62, 0.5, 0));
  g.add(mesh(rbox(0.5, 0.4, 0.14, 0.06), M.wool, -1.1, 0.68, 0.22));
  return g;
}

function loungeChair(M) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.78, 0.14, 0.78, 0.06), M.cognac, 0, 0.32, 0));
  const back = mesh(rbox(0.78, 0.66, 0.12, 0.05), M.cognac, 0, 0.66, 0.36);
  back.rotation.x = -0.28;
  g.add(back);
  for (const sx of [-0.4, 0.4]) {
    g.add(mesh(boxG(0.03, 0.03, 0.86), M.bronzeInterior, sx, 0.22, 0));
    g.add(mesh(boxG(0.03, 0.26, 0.03), M.bronzeInterior, sx, 0.11, -0.4));
    g.add(mesh(boxG(0.03, 0.62, 0.03), M.bronzeInterior, sx, 0.3, 0.42));
    g.add(mesh(boxG(0.03, 0.03, 0.5), M.bronzeInterior, sx, 0.55, 0.12));
  }
  return g;
}

function diningChair(M) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.48, 0.06, 0.48, 0.02), M.walnut, 0, 0.45, 0));
  g.add(mesh(rbox(0.46, 0.05, 0.42, 0.02), M.boucle, 0, 0.5, 0.01));
  g.add(mesh(rbox(0.48, 0.32, 0.04, 0.015), M.walnut, 0, 0.78, 0.22));
  for (const [x, z] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]])
    g.add(mesh(boxG(0.035, 0.45, 0.035), M.walnut, x, 0.225, z));
  return g;
}

function lounger(M) {
  const g = new THREE.Group();
  g.add(mesh(boxG(0.76, 0.22, 2.0), M.teak, 0, 0.14, 0));
  g.add(mesh(rbox(0.72, 0.1, 1.4, 0.04), M.outdoorFabric, 0, 0.3, 0.28));
  const back = mesh(rbox(0.72, 0.1, 0.66, 0.04), M.outdoorFabric, 0, 0.47, -0.66);
  back.rotation.x = -0.6;
  g.add(back);
  return g;
}

function vase(M, mat, h, r) {
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
  float body = (1.0 - uv.y) * (0.55 + tongues * 0.95) - 0.22;
  float f = smoothstep(0.0, 0.55, body);
  f *= smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x);
  vec3 col = mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.72, 0.36), smoothstep(0.35, 0.95, f));
  gl_FragColor = vec4(col * f * uIntensity * 2.4, 1.0);
}`;

export function createInterior(M) {
  const root = new THREE.Group();
  root.name = 'interior';

  // floor and ceiling light lines
  root.add(mesh(boxG(19.9, 0.02, 11.8), M.floorOak, 1, FL + 0.01, 2, { cast: false }));
  const strips = [];
  for (const z of [0.4, 5.4]) {
    const s = mesh(boxG(17, 0.02, 0.05), M.lightStrip, 1.2, CEIL - 0.02, z, { cast: false, receive: false });
    strips.push(s);
    root.add(s);
  }

  // hearth: firebox on the east face of the chimney mass (x = -7.2)
  const fireX = -7.2, fireZ = 5.75;
  root.add(mesh(boxG(0.04, 0.62, 1.7), M.basalt, fireX + 0.02, FL + 0.82, fireZ, { cast: false }));
  root.add(mesh(boxG(0.5, 0.36, 2.9), M.wallTravertine, fireX + 0.25, FL + 0.18, fireZ));
  const fireUniforms = { uTime: { value: 0 }, uIntensity: { value: 0 } };
  const fireMat = new THREE.ShaderMaterial({
    uniforms: fireUniforms, vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), fireMat);
    f.position.set(fireX + 0.06 + i * 0.04, FL + 0.78, fireZ);
    f.rotation.y = Math.PI / 2 + (i - 1) * 0.12;
    flames.push(f);
    root.add(f);
  }
  const fireLight = new THREE.PointLight(0xff9a50, 0, 9, 2);
  fireLight.position.set(fireX + 0.7, FL + 0.9, fireZ);
  root.add(fireLight);

  // living group
  const rug = mesh(boxG(5.2, 0.015, 4.0), M.wool, -3, FL + 0.03, 2.3, { cast: false });
  root.add(rug);
  const s = sofa(M);
  s.position.set(-3, FL, 4.1);
  root.add(s);
  const c1 = loungeChair(M);
  c1.position.set(-5.4, FL, 1.0);
  c1.rotation.y = Math.PI * 0.82;
  root.add(c1);
  const c2 = loungeChair(M);
  c2.position.set(-0.6, FL, 0.9);
  c2.rotation.y = -Math.PI * 0.82;
  root.add(c2);
  root.add(mesh(boxG(1.7, 0.3, 0.9), M.travertine, -3, FL + 0.15, 2.4));
  root.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.42, 48), M.basalt, -1.8, FL + 0.21, 2.9));
  const books = [[0.36, 0.05, 0.26, M.cognac], [0.32, 0.04, 0.24, M.ceramic], [0.3, 0.035, 0.22, M.basalt]];
  let by = FL + 0.3;
  for (const [w, h, d, mt] of books) {
    const b = mesh(boxG(w, h, d), mt, -3.4, by + h / 2, 2.25);
    b.rotation.y = (Math.random() - 0.5) * 0.3;
    by += h;
    root.add(b);
  }
  const bowl = vase(M, M.ceramicDark, 0.12, 0.16);
  bowl.position.set(-2.6, FL + 0.3, 2.5);
  root.add(bowl);

  // credenza and artwork on the travertine back wall
  root.add(mesh(boxG(4.6, 0.55, 0.5), M.walnut, -1.4, FL + 0.275, 7.72));
  root.add(mesh(boxG(2.7, 1.75, 0.05), M.art, -1.4, FL + 1.95, 7.97, { cast: false }));
  root.add(mesh(boxG(2.8, 1.85, 0.03), M.bronzeInterior, -1.4, FL + 1.95, 7.99, { cast: false }));
  const v1 = vase(M, M.ceramic, 0.62, 0.15); v1.position.set(-3.1, FL + 0.55, 7.7); root.add(v1);
  const v2 = vase(M, M.ceramicDark, 0.38, 0.12); v2.position.set(-2.75, FL + 0.55, 7.68); root.add(v2);
  const v3 = vase(M, M.terracotta, 0.3, 0.16); v3.position.set(0.3, FL + 0.55, 7.72); root.add(v3);

  // dining
  root.add(mesh(rbox(3.2, 0.06, 1.1, 0.02), M.oak, 6.5, FL + 0.74, 3.0));
  root.add(mesh(boxG(0.12, 0.7, 0.9), M.walnut, 5.3, FL + 0.36, 3.0));
  root.add(mesh(boxG(0.12, 0.7, 0.9), M.walnut, 7.7, FL + 0.36, 3.0));
  for (const [x, z, r] of [[5.4, 2.2, 0], [6.5, 2.2, 0], [7.6, 2.2, 0], [5.4, 3.8, Math.PI], [6.5, 3.8, Math.PI], [7.6, 3.8, Math.PI]]) {
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
  const livingLight = new THREE.PointLight(0xffd2a0, 0, 12, 2);
  livingLight.position.set(-3, CEIL - 0.6, 2.6);
  root.add(livingLight);

  // potted olive inside the glass corner and a tall plant by the west glazing
  const pot = vase(M, M.terracotta, 0.62, 0.36);
  pot.position.set(9.5, FL, -2.7);
  root.add(pot);

  // sheer curtains along the sea glazing; scale.y = how far they are drawn down
  const cg = new THREE.PlaneGeometry(19.6, 3.36, 260, 1);
  const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin(x * 7.3) * 0.05 + Math.sin(x * 2.1 + 1.0) * 0.025);
  }
  cg.computeVertexNormals();
  cg.translate(0, -1.68, 0);
  const curtain = mesh(cg, M.linen, 1, CEIL - 0.03, -3.78, { cast: false, receive: true });
  curtain.scale.y = 0.001;
  root.add(curtain);

  // terrace loungers facing the sea
  for (const x of [-6.2, -4.0]) {
    const l = lounger(M);
    l.position.set(x, FL, -6.1);
    l.rotation.y = Math.PI;
    root.add(l);
  }

  const outdoorOlivePos = new THREE.Vector3(9.5, FL + 0.6, -2.7);

  function update(env, time) {
    fireUniforms.uTime.value = time;
    const flick = 0.85 + 0.15 * Math.sin(time * 11.0) * Math.sin(time * 7.3 + 1.0);
    fireUniforms.uIntensity.value = env.fire;
    fireLight.intensity = env.fire * 14 * flick;
    const lux = env.interior;
    livingLight.intensity = lux * 22;
    pendantLight.intensity = lux * 14;
    M.lightStrip.emissiveIntensity = lux * 3.2;
    M.pendantShade.emissiveIntensity = lux * 1.4;
    curtain.scale.y = Math.max(0.001, env.veil);
    curtain.visible = env.veil > 0.01;
  }

  return { root, update, outdoorOlivePos, flames };
}
