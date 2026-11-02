import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { paperSheet } from '../ui/drawings.js';

// Sheet A-101 as a real roll of paper on a table. The sheet is one continuous
// strip: the part already unrolled lies flat, the rest follows an Archimedean
// spiral measured by arc length, so the paper never stretches and the roll
// shrinks as it travels. The drawing is on the inside of the roll.

const W = 16, H = 10; // sheet size in table units
const T = 0.07, R0 = 0.3; // paper spacing per turn, radius of the innermost turn
const A = T / (2 * Math.PI);
const COLS = 720;
const FOV = 28;
const TAN = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const st = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;
// how many radians of spiral a length of paper wound from the core takes up
const thetaOf = (len) => (-R0 + Math.sqrt(R0 * R0 + 2 * A * len)) / A;
const R_FULL = R0 + A * thetaOf(W);

// ---------------------------------------------------------------- baking the drawing
const SHAPES = 'line, rect, polyline, polygon, circle, ellipse, path';
const STROKE = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'];

// An SVG drawn to a canvas cannot see the page's stylesheet or webfonts. So the
// computed paint is written onto every shape, and text is lifted out and set
// with the canvas, which can use the fonts the page has already loaded.
function dissect() {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-300vw;top:0;width:1600px;height:1000px;visibility:hidden;pointer-events:none';
  host.innerHTML = paperSheet();
  document.body.appendChild(host);
  const root = host.firstElementChild;
  root.setAttribute('width', 1600);
  root.setAttribute('height', 1000);

  root.querySelectorAll(SHAPES).forEach((n) => {
    const cs = getComputedStyle(n);
    const paint = STROKE.map((k) => `${k}:${cs.getPropertyValue(k).replace(/url\("?[^#")]*(#[^")]+)"?\)/, 'url($1)')}`).join(';');
    n.setAttribute('style', paint);
  });
  const inverse = root.getScreenCTM().inverse();
  const words = [...root.querySelectorAll('text')].map((n) => {
    const cs = getComputedStyle(n);
    const m = inverse.multiply(n.getScreenCTM());
    const upper = cs.textTransform === 'uppercase';
    return {
      text: upper ? n.textContent.toUpperCase() : n.textContent,
      font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      fill: cs.fill,
      opacity: +cs.opacity,
      spacing: parseFloat(cs.letterSpacing) || 0,
      anchor: cs.textAnchor,
      x: +n.getAttribute('x') || 0,
      y: +n.getAttribute('y') || 0,
      m: [m.a, m.b, m.c, m.d, m.e, m.f],
      notes: !!n.closest('.notes'),
    };
  });
  root.querySelectorAll('text').forEach((n) => n.remove());
  const notes = root.querySelector('.notes');
  const drawing = root.cloneNode(true);
  drawing.querySelector('.notes').remove();
  const pencil = root.cloneNode(false);
  pencil.appendChild(notes);
  host.remove();
  return { drawing, pencil, words };
}

function svgImage(svg) {
  svg.removeAttribute('class');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  return img.decode().then(() => { URL.revokeObjectURL(url); return img; });
}

function setText(ctx, words, scale) {
  for (const w of words) {
    ctx.setTransform(w.m[0] * scale, w.m[1] * scale, w.m[2] * scale, w.m[3] * scale, w.m[4] * scale, w.m[5] * scale);
    ctx.font = w.font;
    ctx.fillStyle = w.fill;
    ctx.globalAlpha = w.opacity;
    ctx.textAlign = 'left';
    const chars = w.spacing ? [...w.text] : [w.text];
    const widths = chars.map((c) => ctx.measureText(c).width + w.spacing);
    const total = widths.reduce((a, b) => a + b, 0) - (w.spacing ? w.spacing : 0);
    let x = w.x - (w.anchor === 'middle' ? total / 2 : w.anchor === 'end' ? total : 0);
    chars.forEach((c, i) => { ctx.fillText(c, x, w.y); x += widths[i]; });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

function paperBase(ctx, cw, ch, tone) {
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, cw, ch);
  // cotton paper is never one flat colour
  for (let i = 0; i < 14; i++) {
    const x = (((i * 61) % 100) / 100) * cw, y = (((i * 37) % 100) / 100) * ch, r = cw * (0.12 + ((i * 13) % 10) / 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = i % 2 ? '120, 96, 60' : '255, 250, 238';
    g.addColorStop(0, `rgba(${c}, ${i % 2 ? 0.035 : 0.05})`);
    g.addColorStop(1, `rgba(${c}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
  }
}

async function bakeDrawing(cw) {
  const { drawing, pencil, words } = dissect();
  await Promise.all([...new Set(words.map((w) => w.font))].map((f) => document.fonts.load(f, 'AURA').catch(() => {})));
  const [art, marks] = await Promise.all([svgImage(drawing), svgImage(pencil)]);
  const ch = Math.round((cw * H) / W), scale = cw / 1600;
  const canvas = (fn) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    fn(c.getContext('2d'));
    return c;
  };
  return {
    front: canvas((ctx) => {
      paperBase(ctx, cw, ch, '#efe8d8');
      ctx.drawImage(art, 0, 0, cw, ch);
      setText(ctx, words.filter((w) => !w.notes), scale);
    }),
    notes: canvas((ctx) => {
      ctx.drawImage(marks, 0, 0, cw, ch);
      setText(ctx, words.filter((w) => w.notes), scale);
    }),
  };
}

// the outside of the roll: blank stock, with the sheet number stamped where the
// closed roll shows it on top
function bakeBack() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1280;
  const ctx = c.getContext('2d');
  paperBase(ctx, c.width, c.height, '#e6dece');
  const u = (x) => (x / W) * c.width;
  ctx.translate(u(Math.PI * R_FULL), c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.scale(1, -1);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(138, 63, 34, 0.86)';
  ctx.font = '400 54px "Cormorant Garamond", serif';
  [...'AURA'].forEach((l, i) => ctx.fillText(l, (i - 1.5) * 62, -6));
  ctx.font = '500 13px Manrope, sans-serif';
  [...'A-101  ·  UPPER LEVEL'].forEach((l, i, all) => ctx.fillText(l, (i - (all.length - 1) / 2) * 13.5, 24));
  ctx.strokeStyle = 'rgba(138, 63, 34, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-150, -62, 300, 104);
  return c;
}

function noiseTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 60 + (Math.random() < 0.02 ? 60 : 0);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softTexture(paint) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  paint(c.getContext('2d'), 256);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- the scene
export function createPlanRoll(canvas) {
  const small = innerWidth <= 900;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0b0a09);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.16;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 220);

  const key = new THREE.SpotLight(0xfff0dc, 2600, 0, 0.72, 1, 2);
  key.position.set(-9, 26, -7);
  key.target.position.set(0, 0, 1);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(small ? 1024 : 2048);
  key.shadow.camera.near = 8;
  key.shadow.camera.far = 60;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.022;
  scene.add(key, key.target);

  // the table
  const grain = noiseTexture();
  const tableGrain = grain.clone();
  tableGrain.repeat.set(26, 26);
  tableGrain.needsUpdate = true;
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.62, metalness: 0, bumpMap: tableGrain, bumpScale: 0.5 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  // everything on the sheet is measured from its left edge
  const sheet = new THREE.Group();
  sheet.position.set(-W / 2, 0.014, 0);
  scene.add(sheet);

  // one strip of paper, two columns of vertices per position along it
  const positions = new Float32Array((COLS + 1) * 2 * 3);
  const normals = new Float32Array((COLS + 1) * 2 * 3);
  const uvs = new Float32Array((COLS + 1) * 2 * 2);
  const index = [];
  for (let i = 0; i <= COLS; i++) {
    const s = i / COLS;
    uvs.set([s, 1, s, 0], i * 4);
    positions[i * 6 + 2] = -H / 2;
    positions[i * 6 + 5] = H / 2;
    if (i < COLS) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  // The strip is drawn in parts that share its vertices: the flat paper takes real
  // shadows; the wound paper is shaded by how deep in the roll it is, because a
  // shadow map cannot resolve gaps this fine and breaks them into teeth.
  const positionAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const normalAttr = new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage);
  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  const shadeFront = new Float32Array((COLS + 1) * 2 * 3);
  const shadeBack = new Float32Array((COLS + 1) * 2 * 3);
  const strip = (shade) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', positionAttr);
    g.setAttribute('normal', normalAttr);
    g.setAttribute('uv', uvAttr);
    g.setAttribute('color', shade);
    g.setIndex(index);
    return g;
  };
  const frontColors = new THREE.BufferAttribute(shadeFront, 3).setUsage(THREE.DynamicDrawUsage);
  const backColors = new THREE.BufferAttribute(shadeBack, 3).setUsage(THREE.DynamicDrawUsage);
  const flatGeo = strip(frontColors), woundGeo = strip(frontColors), backGeo = strip(backColors);

  const paperGrain = grain.clone();
  paperGrain.repeat.set(10, 6.25);
  paperGrain.needsUpdate = true;
  const frontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, bumpMap: paperGrain, bumpScale: 0.12, vertexColors: true, side: THREE.FrontSide });
  const backTex = new THREE.CanvasTexture(bakeBack());
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.94, bumpMap: paperGrain, bumpScale: 0.12, vertexColors: true, side: THREE.BackSide, shadowSide: THREE.DoubleSide });
  frontMat.color.set(0xefe8d8); // blank stock until the drawing has baked
  const flat = new THREE.Mesh(flatGeo, frontMat);
  const wound = new THREE.Mesh(woundGeo, frontMat);
  const back = new THREE.Mesh(backGeo, backMat);
  back.castShadow = true;
  flat.receiveShadow = true;
  flat.frustumCulled = wound.frustumCulled = back.frustumCulled = false;
  sheet.add(flat, wound, back);

  // the cut edge of the paper, which draws the spiral at the end of the roll
  const edgePositions = new Float32Array((COLS + 1) * 3);
  const edgeGeo = new THREE.BufferGeometry();
  const edgeAttr = new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage);
  edgeGeo.setAttribute('position', edgeAttr);
  const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({ color: 0xcfc6b2 }));
  edge.frustumCulled = false;
  sheet.add(edge);

  // the soft shadow of the flat paper on the table
  const dropMat = new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, color: 0x000000,
    // shadowBlur rather than a canvas filter, which Safari does not have
    map: softTexture((g, s) => {
      g.shadowColor = '#fff';
      g.shadowBlur = 26;
      g.shadowOffsetX = s * 2;
      g.fillRect(30 - s * 2, 30, s - 60, s - 60);
    }),
  });
  const drop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dropMat);
  drop.rotation.x = -Math.PI / 2;
  drop.position.y = -0.008;
  sheet.add(drop);

  // the dark line where the roll presses on the paper
  const contactMat = new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, color: 0x090604,
    alphaMap: softTexture((g, s) => {
      const l = g.createLinearGradient(0, 0, s, 0);
      l.addColorStop(0, '#000');
      l.addColorStop(0.32, '#3a3a3a');
      l.addColorStop(0.5, '#fff');
      l.addColorStop(0.58, '#555');
      l.addColorStop(1, '#000');
      g.fillStyle = l;
      g.fillRect(0, 0, s, s);
    }),
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.4, H), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.006;
  sheet.add(contact);

  // the bronze band that keeps the roll closed
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(R_FULL + 0.016, R_FULL + 0.016, 0.4, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd0a468, metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 9 }),
  );
  band.castShadow = true;
  sheet.add(band);

  // pencil notes: written across the sheet, left to right, once it lies open
  const noteClip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const notes = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.9, clippingPlanes: [noteClip] }),
  );
  notes.rotation.x = -Math.PI / 2;
  notes.position.set(W / 2, 0.004, 0);
  notes.visible = false;
  sheet.add(notes);

  // ---------------------------------------------------------------- the strip's shape
  function layPaper(U) {
    const u = U * W;
    const thetaOut = thetaOf(W - u);
    const Rout = R0 + A * thetaOut;
    const settle = 1 - st(U, 0.62, 0.97);
    for (let i = 0; i <= COLS; i++) {
      const s = (i / COLS) * W;
      let x, y, nx, ny, inner = 1, outer = 1;
      if (s <= u) {
        // the free edge remembers being rolled and stays up off the table until the sheet relaxes
        const near = Math.max(0, 1 - s / 1.9);
        const reach = Math.min(1, u / 1.2);
        x = s;
        y = 0.3 * settle * reach * near * near;
        const slope = -0.6 * settle * reach * near / 1.9;
        const n = Math.hypot(slope, 1);
        nx = -slope / n;
        ny = 1 / n;
      } else {
        const theta = thetaOf(W - s);
        const phi = thetaOut - theta;
        const r = R0 + A * theta;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        x = u + r * sp;
        y = Rout - r * cp;
        nx = -sp;
        ny = cp;
        // the outermost turn sees the room; everything inside it sits in the dark of the roll
        outer = 1 - 0.8 * st(phi, Math.PI * 2 - 0.25, Math.PI * 2 + 0.25);
        inner = 1 - 0.8 * st(phi, 0, 0.5);
      }
      const a = i * 6;
      positions[a] = positions[a + 3] = x;
      positions[a + 1] = positions[a + 4] = y;
      normals[a] = normals[a + 3] = nx;
      normals[a + 1] = normals[a + 4] = ny;
      for (let k = 0; k < 6; k++) { shadeFront[a + k] = inner; shadeBack[a + k] = outer; }
      edgePositions[i * 3] = x;
      edgePositions[i * 3 + 1] = y;
      edgePositions[i * 3 + 2] = H / 2;
    }
    positionAttr.needsUpdate = normalAttr.needsUpdate = frontColors.needsUpdate = backColors.needsUpdate = edgeAttr.needsUpdate = true;
    const split = Math.ceil(U * COLS) * 6;
    flatGeo.setDrawRange(0, split);
    woundGeo.setDrawRange(split, index.length - split);
    edgeGeo.setDrawRange(Math.ceil(U * COLS), COLS + 1);
    return { u, Rout };
  }

  // ---------------------------------------------------------------- framing
  let vw = 1, vh = 1, phone = false;
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const fitDistance = () => {
    const aspect = vw / vh;
    const [across, down] = phone ? [H, W] : [W, H];
    return Math.max(down / TAN, across / (TAN * aspect)) * 1.07;
  };

  function resize() {
    vw = canvas.clientWidth || innerWidth;
    vh = canvas.clientHeight || innerHeight;
    phone = vw / vh < 0.9;
    // a budget rather than a flat cap, so very large screens stay smooth
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2, Math.sqrt(6e6 / (vw * vh))));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.up.set(...(phone ? [-1, 0, 0] : [0, 0, -1]));
  }
  resize();

  function render(p) {
    // the band comes off first, then the sheet opens
    const U = st(p, 0.13, 0.86);
    const { u, Rout } = layPaper(U);
    const open = st(p, 0.1, 0.8);

    const out = st(p, 0.015, 0.1), tip = st(p, 0.09, 0.145);
    // it slides off the near end, tips over and comes to rest beside the roll
    band.position.set(mix(0, -1.3, tip), mix(Rout, 0.21, tip), mix(2.15, H / 2 + (phone ? 2.8 : 0.95), out));
    band.rotation.set(Math.PI / 2 + (Math.PI / 2) * tip, 0, 0);

    drop.visible = u > 0.01;
    drop.scale.set(u + 2.6, H + 2.6, 1);
    drop.position.set(u / 2 + 0.08, -0.008, 0.12);
    dropMat.opacity = 0.6;
    contact.position.x = u;
    contactMat.opacity = 0.5 * (1 - st(U, 0.97, 1));

    const write = st(p, 0.86, 0.985);
    notes.visible = write > 0 && !!notes.material.map;
    noteClip.constant = -W / 2 + W * write;

    // low raking light on the closed roll; even, reading light on the open sheet
    key.intensity = mix(1750, 3500, open);

    // the camera starts low on the closed roll, then rises to look straight down
    const fit = fitDistance();
    const closed = phone ? fit * 0.92 : Math.max(23, fit * 0.85);
    const dist = mix(mix(closed, fit * 1.14, open), fit, st(p, 0.82, 1));
    const polar = THREE.MathUtils.degToRad(mix(phone ? 50 : 58, 0, open));
    const az = THREE.MathUtils.degToRad(mix(phone ? 16 : -24, 0, open));
    const sinP = Math.sin(polar);
    if (phone) dir.set(sinP * Math.cos(az), Math.cos(polar), sinP * Math.sin(az));
    else dir.set(sinP * Math.sin(az), Math.cos(polar), sinP * Math.cos(az));
    target.set(mix(-W / 2 + (phone ? 0.5 : 1.2), 0, st(p, 0.1, 0.76)), mix(Rout, 0, open), (phone ? 0 : 0.7) * (1 - open));
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    // closed, the roll sits clear of the copy
    const away = 1 - st(p, 0.1, 0.66);
    camera.setViewOffset(vw, vh, phone ? 0 : -vw * 0.15 * away, phone ? -vh * 0.09 * away : 0, vw, vh);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- the drawing arrives when it is baked
  const ready = bakeDrawing(small ? 2800 : Math.min(4096, renderer.capabilities.maxTextureSize)).then(({ front: art, notes: marks }) => {
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const map = new THREE.CanvasTexture(art);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = aniso;
    frontMat.map = map;
    frontMat.color.set(0xffffff);
    frontMat.needsUpdate = true;
    const pen = new THREE.CanvasTexture(marks);
    pen.colorSpace = THREE.SRGBColorSpace;
    pen.anisotropy = aniso;
    notes.material.map = pen;
    notes.material.needsUpdate = true;
  });

  return { render, resize, ready };
}
