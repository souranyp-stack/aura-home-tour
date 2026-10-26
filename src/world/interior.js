import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { metricUV } from './materials.js';
import { FL } from './house.js';
import { mergeStatic } from '../core/merge.js';

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

// A slab bent along a side profile: the profile curve lives in the y-z plane,
// the slab's local z runs along it and local y becomes the offset from it.
function bentSlab(w, t, profile, r = 0.03) {
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

// A loose cushion: rounded block with a soft crown on top.
function cushion(w, h, d, crown = 0.03, r = 0.06) {
  const g = new RoundedBoxGeometry(w, h, d, 5, r);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > 0) {
      const fx = 1 - Math.pow((2 * x) / w, 2), fz = 1 - Math.pow((2 * z) / d, 2);
      pos.setY(i, y + crown * Math.max(0, fx) * Math.max(0, fz));
    }
  }
  g.computeVertexNormals();
  return metricUV(g);
}

function tube(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.1);
  return new THREE.TubeGeometry(curve, Math.max(24, points.length * 14), radius, 10, false);
}

function sofa(M) {
  const g = new THREE.Group();
  // recessed walnut plinth so the upholstery appears to float
  g.add(mesh(rbox(3.16, 0.1, 0.86, 0.015), M.walnut, 0, 0.05, 0.02));
  g.add(mesh(cushion(3.36, 0.2, 1.04, 0.0, 0.07), M.boucle, 0, 0.2, 0));
  g.add(mesh(cushion(1.6, 0.17, 0.78, 0.035, 0.08), M.boucle, -0.81, 0.385, -0.08));
  g.add(mesh(cushion(1.6, 0.17, 0.78, 0.035, 0.08), M.boucle, 0.81, 0.385, -0.08));
  g.add(mesh(cushion(3.36, 0.44, 0.2, 0.0, 0.09), M.boucle, 0, 0.5, 0.42));
  const backL = mesh(cushion(1.55, 0.44, 0.2, 0.03, 0.09), M.boucle, -0.82, 0.62, 0.27);
  backL.rotation.x = -0.12;
  const backR = mesh(cushion(1.55, 0.44, 0.2, 0.03, 0.09), M.boucle, 0.82, 0.62, 0.27);
  backR.rotation.x = -0.12;
  g.add(backL, backR);
  g.add(mesh(cushion(0.2, 0.3, 1.04, 0.0, 0.09), M.boucle, -1.68, 0.45, 0));
  g.add(mesh(cushion(0.2, 0.3, 1.04, 0.0, 0.09), M.boucle, 1.68, 0.45, 0));
  const throwPillow = mesh(cushion(0.5, 0.42, 0.13, 0.04, 0.06), M.wool, -1.15, 0.64, 0.16);
  throwPillow.rotation.set(-0.2, 0.15, 0.05);
  g.add(throwPillow);
  return g;
}

// Lounge chair: one continuous bronze tube per side traces foot, seat rail
// and back post; a leather sling is slung between, with loose cushions.
function loungeChair(M) {
  const g = new THREE.Group();
  const W = 0.74;
  for (const sx of [-W / 2, W / 2]) {
    g.add(mesh(tube([
      [sx, 0.0, -0.36], [sx, 0.12, -0.34], [sx, 0.3, -0.3], [sx, 0.34, -0.1],
      [sx, 0.33, 0.18], [sx, 0.42, 0.34], [sx, 0.74, 0.48], [sx, 0.78, 0.5],
    ], 0.014), M.bronzeInterior, 0, 0, 0));
    g.add(mesh(tube([[sx, 0.0, 0.42], [sx, 0.2, 0.37], [sx, 0.34, 0.3]], 0.014), M.bronzeInterior, 0, 0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.022, 12, 8), M.bronzeInterior, sx, 0.008, -0.36));
    g.add(mesh(new THREE.SphereGeometry(0.022, 12, 8), M.bronzeInterior, sx, 0.008, 0.42));
    // arm: a walnut rail laid on the frame
    g.add(mesh(rbox(0.07, 0.03, 0.56, 0.012), M.walnut, sx, 0.52, 0.02));
    g.add(mesh(tube([[sx, 0.34, -0.22], [sx, 0.5, -0.24]], 0.01), M.bronzeInterior, 0, 0, 0));
  }
  g.add(mesh(tube([[-W / 2, 0.3, -0.3], [W / 2, 0.3, -0.3]], 0.012), M.bronzeInterior, 0, 0, 0));
  g.add(mesh(tube([[-W / 2, 0.42, 0.34], [W / 2, 0.42, 0.34]], 0.012), M.bronzeInterior, 0, 0, 0));
  // leather sling: seat and back in one curved piece
  g.add(mesh(bentSlab(W - 0.04, 0.018, [[0.33, -0.3], [0.31, -0.05], [0.31, 0.2], [0.4, 0.34], [0.72, 0.47]], 0.008), M.cognac, 0, 0, 0));
  // loose seat and back cushions in the same leather
  const seat = mesh(cushion(W - 0.1, 0.09, 0.54, 0.025, 0.04), M.cognac, 0, 0.375, -0.05);
  seat.rotation.x = 0.04;
  const back = mesh(cushion(W - 0.12, 0.075, 0.42, 0.02, 0.035), M.cognac, 0, 0.58, 0.39);
  back.rotation.x = -1.18;
  g.add(seat, back);
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
  // coffee table: two honed travertine slabs on a recessed plinth, offset like a step
  root.add(mesh(rbox(1.2, 0.2, 0.62, 0.01), M.travertine, -3.15, FL + 0.1, 2.42));
  root.add(mesh(rbox(1.7, 0.07, 0.9, 0.012), M.travertine, -3.0, FL + 0.27, 2.4));
  root.add(mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.42, 64), M.basalt, -1.75, FL + 0.21, 2.95));
  const books = [[0.36, 0.05, 0.26, M.cognac], [0.32, 0.04, 0.24, M.ceramic], [0.3, 0.035, 0.22, M.basalt]];
  let by = FL + 0.305;
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
  root.add(mesh(rbox(4.6, 0.5, 0.48, 0.01), M.walnut, -1.4, FL + 0.31, 7.72));
  root.add(mesh(boxG(4.4, 0.06, 0.4), M.basalt, -1.4, FL + 0.03, 7.74));
  for (let i = 1; i < 4; i++) root.add(mesh(boxG(0.006, 0.44, 0.01), M.basalt, -1.4 - 2.3 + i * 1.15, FL + 0.31, 7.475, { cast: false }));
  for (let i = 0; i < 4; i++) root.add(mesh(boxG(0.12, 0.012, 0.012), M.bronzeInterior, -1.4 - 2.3 + 0.575 + i * 1.15, FL + 0.5, 7.47, { cast: false }));
  root.add(mesh(boxG(2.4, 1.6, 0.04), M.art, -1.4, FL + 1.92, 7.93));
  root.add(mesh(boxG(2.5, 1.7, 0.015), M.basalt, -1.4, FL + 1.92, 7.985, { cast: false }));
  for (const [w, h, x, y] of [[2.5, 0.012, 0, 0.85], [2.5, 0.012, 0, -0.85], [0.012, 1.7, 1.25, 0], [0.012, 1.7, -1.25, 0]])
    root.add(mesh(boxG(w, h, 0.06), M.walnut, -1.4 + x, FL + 1.92 + y, 7.96, { cast: false }));
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

  // furniture is static: collapse ~120 parts into one draw per material
  mergeStatic(root, [...flames, curtain]);

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
    curtain.scale.y = Math.max(0.001, env.veil);
    curtain.visible = env.veil > 0.01;
  }

  return { root, update, outdoorOlivePos, flames };
}
