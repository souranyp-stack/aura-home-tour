import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { MAP_W, MAP_D, HOUSE, GROVE, ROAD_POINTS, heightAt, coastAt, groveMask, roadAt } from './coast.js';

// A relief model of the coast, drawn like a chart at night. The height field
// lives in a texture and the shader reads it per pixel, so the hill shading and
// contour lines stay sharp at any zoom, and finer contours appear as the camera
// comes down. The camera follows the road in from above the whole coast.

const EXAGGERATE = 3.4; // the land is 3.4 times as tall as life, so the cliffs read
const lift = (h) => (Math.max(h, 0) / 1000) * EXAGGERATE;
const st = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D tHeight;
  uniform vec2 uTexel;
  uniform vec2 uMetres;
  uniform vec2 uHead;
  uniform float uDetail;
  uniform float uLamp;
  varying vec2 vUv;
  varying vec3 vWorld;

  float heightOf(vec2 uv) { return texture2D(tHeight, uv).r; }

  // one family of contour lines, fading out when they would crowd together
  float contour(float h, float step, float width) {
    float v = h / step;
    float w = fwidth(v);
    float a = abs(fract(v - 0.5) - 0.5) / max(w, 1e-5);
    return (1.0 - smoothstep(width - 0.6, width + 0.6, a)) * (1.0 - smoothstep(0.1, 0.34, w));
  }

  void main() {
    float h = heightOf(vUv);
    float hx = heightOf(vUv + vec2(uTexel.x, 0.0)) - heightOf(vUv - vec2(uTexel.x, 0.0));
    float hz = heightOf(vUv + vec2(0.0, uTexel.y)) - heightOf(vUv - vec2(0.0, uTexel.y));
    vec3 n = normalize(vec3(-hx * 1.7, uMetres.x * uTexel.x * 2.0, -hz * 1.7));
    float light = clamp(dot(n, normalize(vec3(-0.62, 0.58, -0.52))), 0.0, 1.0);

    // a pool of light moves with the road's head, sized to the view
    float near = exp(-dot(vWorld.xz - uHead, vWorld.xz - uHead) / uLamp);

    // land: warm stone, lit from the north-west as a relief map always is
    vec3 land = mix(vec3(0.128, 0.117, 0.102), vec3(0.262, 0.238, 0.205), clamp(h / 300.0, 0.0, 1.0));
    land *= 0.5 + 1.55 * light;
    land += vec3(0.012, 0.018, 0.024) * (1.0 - light);
    land += vec3(0.17, 0.135, 0.095) * near * (0.07 + 0.36 * light);
    vec3 ink = vec3(0.93, 0.87, 0.74);
    float reach = 0.55 + 0.75 * near;
    land = mix(land, ink, 0.085 * reach * contour(h, 5.0, 0.55));
    land = mix(land, ink, 0.15 * reach * contour(h, 20.0, 0.6));
    land = mix(land, vec3(0.86, 0.68, 0.44), 0.40 * reach * contour(h, 100.0, 0.8));

    // sea: charted by depth
    float depth = clamp(-h / 105.0, 0.0, 1.0);
    vec3 sea = mix(vec3(0.075, 0.170, 0.215), vec3(0.028, 0.052, 0.078), sqrt(depth));
    sea += vec3(0.02, 0.05, 0.07) * near * 0.6;
    vec3 chart = vec3(0.55, 0.76, 0.86);
    sea = mix(sea, chart, 0.17 * contour(h, 20.0, 0.6));
    sea = mix(sea, chart, 0.10 * contour(h, 5.0, 0.55) * (1.0 - smoothstep(-22.0, -8.0, -abs(h))) );

    float fw = max(fwidth(h), 1e-4);
    vec3 col = mix(sea, land, smoothstep(-fw, fw, h));
    // the shoreline, with two faint lines of surf
    float shore = 1.0 - smoothstep(0.7, 1.7, abs(h) / fw);
    col = mix(col, vec3(0.95, 0.90, 0.80), 0.82 * shore);
    float surf = (1.0 - smoothstep(0.5, 1.2, abs(h + 3.4) / fw)) + 0.6 * (1.0 - smoothstep(0.5, 1.2, abs(h + 5.2) / fw));
    col = mix(col, chart, 0.3 * surf * (1.0 - step(0.0, h)));

    // a one-kilometre grid of small crosses, as on a chart
    vec2 km = abs(fract(vWorld.xz - 0.5) - 0.5);
    vec2 kw = fwidth(vWorld.xz);
    float cross = max(
      (1.0 - smoothstep(0.5, 1.2, km.x / kw.x)) * step(km.y, 0.035),
      (1.0 - smoothstep(0.5, 1.2, km.y / kw.y)) * step(km.x, 0.035));
    col = mix(col, ink, 0.2 * cross * (1.0 - uDetail));

    // the chart fades into the page at its edges
    vec2 e = min(vUv, 1.0 - vUv);
    float edge = smoothstep(0.0, 0.11, e.x) * smoothstep(0.0, 0.13, e.y);
    gl_FragColor = vec4(mix(vec3(0.043, 0.039, 0.035), col, edge), 1.0);
  }`;

// ---------------------------------------------------------------- camera route
// where the camera is at each signposted distance:
// km, height above the road (km), tilt from straight down, heading, look ahead (km)
const SHOTS = [
  [0, 9.6, 14, 0, 0],
  [0.5, 6.4, 24, -5, 0.3],
  [2.4, 4.1, 34, 4, 0.3],
  [4.6, 3.0, 42, 8, 0.05],
  [5.9, 2.0, 54, -2, 0.2],
  [6.2, 1.22, 60, -16, 0],
];
function shotAt(km) {
  let i = 0;
  while (i < SHOTS.length - 2 && km > SHOTS[i + 1][0]) i++;
  const a = SHOTS[i], b = SHOTS[i + 1];
  const t = st(km, a[0], b[0]);
  return { dist: mix(a[1], b[1], t), tilt: mix(a[2], b[2], t), yaw: mix(a[3], b[3], t), ahead: mix(a[4], b[4], t) };
}

function roundSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function glowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.28)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createCoastMap(canvas, labelHost, { labels }) {
  const small = innerWidth <= 900;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0b0a09);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  scene.add(new THREE.HemisphereLight(0xfff2de, 0x20242b, 1.5));
  const sun = new THREE.DirectionalLight(0xffe4bd, 2.4);
  sun.position.set(-4, 5, -3);
  scene.add(sun);

  // ---------------------------------------------------------------- height field, built a few rows at a time
  const GW = small ? 960 : 1200, GD = Math.round((GW * MAP_D) / MAP_W);
  const texels = new Uint16Array(GW * GD);
  const heights = new Float32Array(GW * GD);
  const uniforms = {
    tHeight: { value: null },
    uTexel: { value: new THREE.Vector2(1 / GW, 1 / GD) },
    uMetres: { value: new THREE.Vector2(MAP_W * 1000, MAP_D * 1000) },
    uHead: { value: new THREE.Vector2() },
    uDetail: { value: 0 },
    uLamp: { value: 1 },
  };
  const terrainMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  terrainMat.extensions = { derivatives: true };

  const bake = async () => {
    for (let j = 0; j < GD; j++) {
      const z = (j / (GD - 1)) * MAP_D;
      for (let i = 0; i < GW; i++) {
        const h = heightAt((i / (GW - 1)) * MAP_W, z);
        heights[j * GW + i] = h;
        texels[j * GW + i] = THREE.DataUtils.toHalfFloat(h);
      }
      if (j % 40 === 39) await new Promise((r) => setTimeout(r));
    }
    const tex = new THREE.DataTexture(texels, GW, GD, THREE.RedFormat, THREE.HalfFloatType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    uniforms.tHeight.value = tex;

    const MW = small ? 320 : 640, MD = Math.round((MW * MAP_D) / MAP_W);
    const pos = new Float32Array((MW + 1) * (MD + 1) * 3), uv = new Float32Array((MW + 1) * (MD + 1) * 2);
    const index = [];
    for (let j = 0; j <= MD; j++) {
      for (let i = 0; i <= MW; i++) {
        const u = i / MW, v = j / MD, a = j * (MW + 1) + i;
        const gi = Math.round(u * (GW - 1)), gj = Math.round(v * (GD - 1));
        pos.set([u * MAP_W, lift(heights[gj * GW + gi]), v * MAP_D], a * 3);
        uv.set([u, v], a * 2);
        if (i < MW && j < MD) index.push(a, a + MW + 1, a + 1, a + 1, a + MW + 1, a + MW + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    scene.add(new THREE.Mesh(geo, terrainMat));
  };

  const groundY = (x, z) => lift(heightAt(x, z));

  // ---------------------------------------------------------------- the road
  const road = ROAD_POINTS.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, groundY(x, z) + 0.006, z]);
  const flatRoad = road.flat();
  const lineGeo = () => { const g = new LineGeometry(); g.setPositions(flatRoad); return g; };
  const dashMat = new LineMaterial({ color: 0xf1e6d2, linewidth: 1.1, transparent: true, opacity: 0.55, dashed: true, dashSize: 0.045, gapSize: 0.05 });
  const glowMat = new LineMaterial({ color: 0xf0b56a, linewidth: 9, transparent: true, opacity: 0.2, depthWrite: false });
  const doneMat = new LineMaterial({ color: 0xffe7c2, linewidth: 2.4 });
  const dashed = new Line2(lineGeo(), dashMat);
  dashed.computeLineDistances();
  const glow = new Line2(lineGeo(), glowMat);
  const done = new Line2(lineGeo(), doneMat);
  scene.add(dashed, glow, done);
  const lineMats = [dashMat, glowMat, doneMat];

  // ---------------------------------------------------------------- what stands on the land
  const dummy = new THREE.Object3D();
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // the harbour village thins out along the road to the last houses
  const houses = [];
  for (let n = 0; n < 900 && houses.length < 150; n++) {
    const km = 0.02 + rnd() ** 1.7 * 2.35;
    const p = roadAt(km);
    const side = (rnd() - 0.5) * (0.5 - km * 0.12);
    const x = p.x + side * 0.5 + (rnd() - 0.5) * 0.08, z = p.z + side;
    if (heightAt(x, z) < 1.5) continue;
    houses.push([x, z, 0.016 + rnd() * 0.016, 0.012 + rnd() * 0.012, rnd() * 3]);
  }
  const village = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xe3d8c4 }), houses.length);
  houses.forEach(([x, z, w, tall, a], i) => {
    dummy.position.set(x, groundY(x, z) + tall / 2, z);
    dummy.scale.set(w, tall, w * 0.7);
    dummy.rotation.y = a;
    dummy.updateMatrix();
    village.setMatrixAt(i, dummy.matrix);
  });
  scene.add(village);

  // the quay
  const harbour = roadAt(0);
  const quay = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.17), new THREE.MeshLambertMaterial({ color: 0xcfc4b0 }));
  quay.position.set(harbour.x + 0.05, 0.008, coastAt(harbour.x + 0.05) + 0.07);
  quay.rotation.y = 0.35;
  scene.add(quay);

  // olives, in rows along the terraces
  const olives = [];
  for (let n = 0; n < (small ? 5000 : 14000) && olives.length < (small ? 900 : 2200); n++) {
    const x = GROVE.x + (rnd() - 0.5) * GROVE.r * 2.5, z = GROVE.z + (rnd() - 0.5) * GROVE.r * 2.1;
    if (rnd() > groveMask(x, z)) continue;
    const h = heightAt(x, z);
    if (h < 8) continue;
    olives.push(x, lift(h) + 0.01, z);
  }
  const oliveGeo = new THREE.BufferGeometry();
  oliveGeo.setAttribute('position', new THREE.Float32BufferAttribute(olives, 3));
  scene.add(new THREE.Points(oliveGeo, new THREE.PointsMaterial({ color: 0xa4ad68, size: 0.03, sizeAttenuation: true, map: roundSprite(), transparent: true, alphaTest: 0.25, depthWrite: false })));

  // the dry-stone wall and the bronze gate, square across the road
  const gate = roadAt(5.9), ahead = roadAt(5.95);
  const gateAngle = Math.atan2(ahead.z - gate.z, ahead.x - gate.x);
  const across = [Math.sin(gateAngle), -Math.cos(gateAngle)];
  // it runs out from the gate either way and stops where the ground falls to the cliff
  const stones = [];
  [-1, 1].forEach((sign) => {
    for (let t = 0.02; t <= 0.56; t += 0.0098) {
      const x = gate.x + across[0] * t * sign, z = gate.z + across[1] * t * sign;
      if (heightAt(x, z) < 22) break;
      stones.push([x, z]);
    }
  });
  const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xb9ad98 }), stones.length);
  stones.forEach(([x, z], i) => {
    dummy.scale.set(0.0092, 0.0085, 0.0055);
    dummy.position.set(x, groundY(x, z) + 0.004, z);
    dummy.rotation.y = -gateAngle + Math.PI / 2;
    dummy.updateMatrix();
    wall.setMatrixAt(i, dummy.matrix);
  });
  scene.add(wall);
  const bronze = new THREE.MeshLambertMaterial({ color: 0xd9a763, emissive: 0x6b4318 });
  [-1, 1].forEach((sign) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.032, 0.008), bronze);
    const x = gate.x + across[0] * 0.02 * sign, z = gate.z + across[1] * 0.02 * sign;
    post.position.set(x, groundY(x, z) + 0.016, z);
    scene.add(post);
  });

  // the house, a little larger than scale so it can be found
  const model = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0xcdc2ad });
  const box = (w, h, d, x, y, z, m = stone) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    model.add(b);
    return b;
  };
  box(0.062, 0.012, 0.026, 0.002, 0.006, -0.003);
  box(0.072, 0.0028, 0.04, -0.002, 0.0135, 0.002);
  box(0.058, 0.0085, 0.024, -0.002, 0.0195, -0.004, new THREE.MeshBasicMaterial({ color: 0xffcf8f }));
  box(0.078, 0.0028, 0.044, -0.002, 0.0248, 0.002, new THREE.MeshLambertMaterial({ color: 0x8f7b5e }));
  box(0.0045, 0.03, 0.074, -0.03, 0.015, 0.0, stone);
  model.position.set(HOUSE.x, groundY(HOUSE.x, HOUSE.z), HOUSE.z - 0.008);
  model.rotation.y = 0.1;
  scene.add(model);
  const lantern = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xffb867, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  lantern.position.set(HOUSE.x, model.position.y + 0.024, HOUSE.z);
  lantern.scale.setScalar(0.3);
  scene.add(lantern);

  // ---------------------------------------------------------------- labels sit on the page, always sharp and upright
  const tags = labels.map((l) => {
    const el = document.createElement('div');
    el.className = `cmap__tag cmap__tag--${l.kind}`;
    el.innerHTML = l.html;
    labelHost.appendChild(el);
    const y = l.y ?? groundY(l.x, l.z);
    return { ...l, el, at: new THREE.Vector3(l.x, y, l.z) };
  });

  // ---------------------------------------------------------------- framing
  let vw = 1, vh = 1, phone = false;
  const v = new THREE.Vector3();
  const target = new THREE.Vector3();

  function resize() {
    vw = canvas.clientWidth || innerWidth;
    vh = canvas.clientHeight || innerHeight;
    phone = vw / vh < 0.9;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2, Math.sqrt(6e6 / (vw * vh))));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    lineMats.forEach((m) => m.resolution.set(vw, vh));
  }
  resize();

  function render(km, headOn) {
    const shot = shotAt(km);
    const head = roadAt(km);
    const look = roadAt(km + shot.ahead);
    const lead = 1 - st(km, 0, 0.5);
    // the first view holds the whole coast, then it settles onto the road
    target.set(mix(look.x, phone ? 4.15 : 4.6, lead), groundY(look.x, look.z), mix(look.z, 3.5, lead));
    const fit = phone ? Math.max(1, 1.05 / camera.aspect) : Math.max(1, 1.5 / camera.aspect);
    const dist = shot.dist * fit * (phone ? 1 + 0.1 * lead : 1);
    const tilt = THREE.MathUtils.degToRad(shot.tilt), yaw = THREE.MathUtils.degToRad(shot.yaw);
    camera.position.set(
      target.x + dist * Math.sin(tilt) * Math.sin(yaw),
      target.y + dist * Math.cos(tilt),
      target.z + dist * Math.sin(tilt) * Math.cos(yaw),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    // the route panel covers the bottom of the screen, so the road rides above it
    camera.setViewOffset(vw, vh, 0, vh * (phone ? 0.14 : 0.13), vw, vh);
    camera.updateMatrixWorld();

    uniforms.uHead.value.set(head.x, head.z);
    uniforms.uDetail.value = st(km, 4.6, 6.2);
    uniforms.uLamp.value = (shot.dist * 0.42) ** 2;

    const count = Math.max(0, Math.floor((head.index / (ROAD_POINTS.length - 1)) * (road.length - 1)));
    done.geometry.instanceCount = glow.geometry.instanceCount = count;
    done.visible = glow.visible = count > 0;
    lantern.material.opacity = 0.1 + 0.26 * st(km, 5.6, 6.2);

    renderer.render(scene, camera);

    // labels
    tags.forEach((tag) => {
      v.copy(tag.at).project(camera);
      const x = (v.x * 0.5 + 0.5) * vw, y = (-v.y * 0.5 + 0.5) * vh;
      // labels fade before they reach the route panel
      const shown = (tag.show ? tag.show(km) : 1) * (1 - st(y, vh * (phone ? 0.6 : 0.64), vh * (phone ? 0.68 : 0.72)));
      if (shown <= 0.003) { if (tag.el.style.opacity !== '0') tag.el.style.opacity = '0'; return; }
      tag.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      tag.el.style.opacity = shown.toFixed(3);
    });
    // the moving marker
    v.set(head.x, groundY(head.x, head.z) + 0.006, head.z).project(camera);
    headOn((v.x * 0.5 + 0.5) * vw, (-v.y * 0.5 + 0.5) * vh, yaw);
  }

  return { render, resize, ready: bake() };
}

