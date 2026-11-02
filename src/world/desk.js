import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bakeSurface } from '../core/bake.js';
import * as S from '../core/surfaces.js';
import { upperPlan, lowerPlan, sectionAA } from '../ui/drawings.js';

// The opening shot: the plans on a walnut desk, seen from above. The desk is scaled
// so the plan on the sheet lies exactly under the real house, so scrolling can raise
// the actual masses out of the paper: they extrude to the finished building, float
// apart into the sculpture, and the desk dissolves into the gallery. One camera, one
// house, no cut. The desk's scene has its own lights; the house is lent to it.

const SW = 0.841, SH = 0.594; // an A1 sheet, in metres
const FOV = 28;
const st = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;

// ---------------------------------------------------------------- the blueprint
const SHAPES = 'line, rect, polyline, polygon, circle, ellipse, path';
const PAINT = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'];

// An SVG drawn to a canvas can't see the page's stylesheet or webfonts, so the
// computed paint goes onto each shape and text is set with the canvas instead.
async function drawSvg(ctx, markup, x, y, w, mirror = false) {
  const host = document.createElement('div');
  host.className = 'blue-svg';
  host.style.cssText = `position:fixed;left:-300vw;top:0;width:${w}px;visibility:hidden;pointer-events:none`;
  host.innerHTML = markup;
  document.body.appendChild(host);
  const root = host.firstElementChild;
  const [, , vw, vh] = root.getAttribute('viewBox').split(' ').map(Number);
  const h = (w * vh) / vw;
  root.setAttribute('width', w);
  root.setAttribute('height', h);
  root.querySelectorAll(SHAPES).forEach((n) => {
    const cs = getComputedStyle(n);
    n.setAttribute('style', PAINT.map((k) => `${k}:${cs.getPropertyValue(k).replace(/url\("?[^#")]*(#[^")]+)"?\)/, 'url($1)')}`).join(';'));
  });
  const inverse = root.getScreenCTM().inverse();
  const words = [...root.querySelectorAll('text')].map((n) => {
    const cs = getComputedStyle(n);
    const m = inverse.multiply(n.getScreenCTM());
    return {
      text: cs.textTransform === 'uppercase' ? n.textContent.toUpperCase() : n.textContent,
      font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      fill: cs.fill, opacity: +cs.opacity, spacing: parseFloat(cs.letterSpacing) || 0, anchor: cs.textAnchor,
      x: +n.getAttribute('x') || 0, y: +n.getAttribute('y') || 0, m,
    };
  });
  root.querySelectorAll('text').forEach((n) => n.remove());
  root.removeAttribute('class');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
  host.remove();
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  ctx.save();
  if (mirror) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); } else ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  await Promise.all([...new Set(words.map((t) => t.font))].map((f) => document.fonts.load(f, 'A').catch(() => {})));
  for (const t of words) {
    // a mirrored drawing keeps its words readable, where they belong
    const px = t.m.a * t.x + t.m.c * t.y + t.m.e, py = t.m.b * t.x + t.m.d * t.y + t.m.f;
    if (mirror) ctx.setTransform(t.m.a, -t.m.b, -t.m.c, t.m.d, x + w - px, y + py);
    else ctx.setTransform(t.m.a, t.m.b, t.m.c, t.m.d, x + px, y + py);
    ctx.font = t.font;
    ctx.fillStyle = t.fill;
    ctx.globalAlpha = t.opacity;
    const chars = t.spacing ? [...t.text] : [t.text];
    const widths = chars.map((c) => ctx.measureText(c).width + t.spacing);
    const total = widths.reduce((a, b) => a + b, 0) - t.spacing;
    const anchor = mirror ? (t.anchor === 'end' ? 'start' : t.anchor === 'middle' ? 'middle' : 'end') : t.anchor;
    let cx = -(anchor === 'middle' ? total / 2 : anchor === 'end' ? total : 0);
    chars.forEach((c, i) => { ctx.fillText(c, cx, 0); cx += widths[i]; });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  return { w, h, vw, vh };
}

async function blueprint(cw) {
  const ch = Math.round((cw * SH) / SW);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  const u = cw / 2400;
  // cyanotype: deep blue, slightly uneven, a little darker at the edges
  const base = g.createRadialGradient(cw * 0.48, ch * 0.46, cw * 0.1, cw * 0.5, ch * 0.5, cw * 0.72);
  base.addColorStop(0, '#1b4f8d'); base.addColorStop(1, '#113769');
  g.fillStyle = base; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 3400; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,10,40'},${Math.random() * 0.016})`;
    const s = (6 + Math.random() * 90) * u;
    g.fillRect(Math.random() * cw, Math.random() * ch, s, s * (0.2 + Math.random()));
  }
  g.strokeStyle = 'rgba(190,220,255,0.06)'; g.lineWidth = 1.1 * u;
  for (let x = 60 * u; x < cw; x += 60 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }
  for (let y = 60 * u; y < ch; y += 60 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
  const m = 56 * u;
  g.strokeStyle = 'rgba(232,242,255,0.86)'; g.lineWidth = 3 * u; g.strokeRect(m, m, cw - 2 * m, ch - 2 * m);
  g.lineWidth = 1 * u; g.strokeRect(m + 12 * u, m + 12 * u, cw - 2 * m - 24 * u, ch - 2 * m - 24 * u);

  // the upper level, large and true to the model (seen from above, sea at the bottom)
  const px = 96 * u, py = 92 * u, pw = 1540 * u;
  const main = await drawSvg(g, upperPlan(), px, py, pw, true);
  const col = px + main.w + 52 * u, colW = cw - col - 96 * u;
  const low = await drawSvg(g, lowerPlan(), col, 96 * u, colW, true);
  const label = (text, x, y) => { g.font = `500 ${15 * u}px Manrope, sans-serif`; g.fillStyle = 'rgba(232,242,255,0.8)'; g.fillText(text.toUpperCase().split('').join(' '), x, y); };
  label('Lower level', col, 96 * u + low.h + 26 * u);
  const secY = 96 * u + low.h + 52 * u;
  const sec = await drawSvg(g, sectionAA(), col, secY, colW);
  label('Section A-A', col, secY + sec.h + 26 * u);
  const tbY = ch - m - 250 * u, tbX = col;
  g.strokeStyle = 'rgba(232,242,255,0.7)'; g.lineWidth = 1.6 * u; g.strokeRect(tbX, tbY, colW, 226 * u);
  await document.fonts.load(`400 ${64 * u}px "Cormorant Garamond"`).catch(() => {});
  g.fillStyle = '#eef5ff'; g.font = `400 ${70 * u}px "Cormorant Garamond", serif`;
  g.fillText('A U R A', tbX + 30 * u, tbY + 86 * u);
  g.font = `italic 300 ${32 * u}px "Cormorant Garamond", serif`;
  g.fillText('The living sanctuary', tbX + 30 * u, tbY + 128 * u);
  label('Sheet A-101 · Upper level plan · 1:100', tbX + 30 * u, tbY + 180 * u);
  // it has been folded and carried: faint creases
  for (const [x0, y0, x1, y1] of [[cw / 2, 0, cw / 2, ch], [cw / 4, 0, cw / 4, ch], [cw * 0.75, 0, cw * 0.75, ch], [0, ch / 2, cw, ch / 2]]) {
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(0,12,40,0.16)'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(x0 + 2 * u, y0 + (y0 === y1 ? 2 * u : 0)); g.lineTo(x1 + 2 * u, y1 + (y0 === y1 ? 2 * u : 0)); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  // the plan's own frame on the sheet, to line the desk up with the model
  return { tex, plan: { u0: px / cw, u1: (px + main.w) / cw, v0: py / ch, v1: (py + main.h) / ch } };
}

// ---------------------------------------------------------------- small textures
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const softDisc = () => canvasTexture(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,0.85)'); r.addColorStop(0.55, 'rgba(0,0,0,0.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const paperGrain = () => {
  const t = canvasTexture(256, 256, (g, w) => {
    const d = g.createImageData(w, w);
    for (let i = 0; i < d.data.length; i += 4) { const v = 118 + Math.random() * 20; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 5);
  return t;
};
// fine scratches running one way, for brushed metal
const brushed = () => {
  const t = canvasTexture(512, 512, (g, w) => {
    g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 1500; i++) { const y = Math.random() * w, v = 110 + Math.random() * 90; g.strokeStyle = `rgba(${v},${v},${v},0.2)`; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (Math.random() - 0.5) * 3); g.stroke(); }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
// a steel rule: millimetre ticks and numbers
const ruleFace = () => canvasTexture(2048, 180, (g, w, h) => {
  g.fillStyle = '#c7c9ca'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2400; i++) { const v = 170 + Math.random() * 60; g.fillStyle = `rgba(${v},${v},${v},0.12)`; g.fillRect(Math.random() * w, Math.random() * h, 60 + Math.random() * 200, 1); }
  g.fillStyle = '#1a1b1d';
  for (let mm = 0; mm <= 300; mm++) {
    const x = 16 + mm * ((w - 32) / 300), len = mm % 10 === 0 ? 52 : mm % 5 === 0 ? 36 : 22;
    g.fillRect(x, 0, mm % 10 === 0 ? 2.6 : 1.6, len);
    if (mm % 10 === 0 && mm > 0 && mm < 300) { g.font = '26px Manrope, sans-serif'; g.textAlign = 'center'; g.fillText(String(mm / 10), x, 86); }
  }
});
const coffeeTop = () => canvasTexture(256, 256, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w / 2);
  r.addColorStop(0, '#22100a'); r.addColorStop(0.72, '#2a140b'); r.addColorStop(0.9, '#6d4326'); r.addColorStop(1, '#9a6c3f');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});

// ---------------------------------------------------------------- small things
const lathe = (pts, mat, x, y, z, seg = 64) => {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const rod = (a, b, r, mat, seg = 16) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true;
  return m;
};
function pencil(mats, len = 0.175) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0037, 0.0037, len, 6), mats.lead);
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.0037, 0.0012, 0.017, 6), mats.cedar);
  wood.position.y = len / 2 + 0.0085;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.004, 8), mats.graphite);
  lead.position.y = len / 2 + 0.019;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0039, 0.0039, 0.011, 16), mats.brass);
  ferrule.position.y = -len / 2 - 0.0055;
  const rubber = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.008, 16), mats.rubber);
  rubber.position.y = -len / 2 - 0.015;
  g.add(body, wood, lead, ferrule, rubber);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
const lay = (obj, x, z, ry, y = 0.0042) => { obj.rotation.set(0, ry, Math.PI / 2); obj.position.set(x, y, z); return obj; };

// ---------------------------------------------------------------- the scene
export async function createDesk(renderer, M, house, { mobile }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a09);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  pm.dispose();

  const hi = mobile ? 1024 : 2048;
  const wood = bakeSurface(renderer, S.DESK_WALNUT, { size: hi, depth: 0.0016 });
  [wood.map, wood.normalMap, wood.roughnessMap].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });
  const scratch = brushed();
  const leather = M.textures.leather;
  const mats = {
    desk: new THREE.MeshPhysicalMaterial({ map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.7, 0.7), clearcoat: 0.22, clearcoatRoughness: 0.42, envMapIntensity: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a062, metalness: 1, roughness: 0.34, roughnessMap: scratch, envMapIntensity: 3 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x141517, metalness: 0.15, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 1.4, side: THREE.DoubleSide }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.5, side: THREE.BackSide, emissive: 0xffd6a4, emissiveIntensity: 0.55 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xe9e3d6, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 1.5, side: THREE.DoubleSide }),
    stoneware: new THREE.MeshPhysicalMaterial({ color: 0x2c2926, roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 1.3, side: THREE.DoubleSide }),
    coffee: new THREE.MeshStandardMaterial({ map: coffeeTop(), roughness: 0.1, envMapIntensity: 2.2 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.92 }),
    cover: new THREE.MeshStandardMaterial({ map: leather.map, normalMap: leather.normalMap, roughnessMap: leather.roughnessMap, roughness: 1, color: 0x6a4a35, envMapIntensity: 1.1 }),
    elastic: new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ map: ruleFace(), metalness: 0.85, roughness: 0.42, envMapIntensity: 1.8 }),
    steelEdge: new THREE.MeshStandardMaterial({ color: 0xb4b6b8, metalness: 1, roughness: 0.34, envMapIntensity: 2 }),
    lead: new THREE.MeshPhysicalMaterial({ color: 0x20262b, roughness: 0.32, clearcoat: 0.6, envMapIntensity: 1.5 }),
    cedar: new THREE.MeshStandardMaterial({ color: 0xcfa679, roughness: 0.82 }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x24262a, metalness: 0.6, roughness: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0xb9786a, roughness: 0.9 }),
    shadow: new THREE.MeshBasicMaterial({ map: softDisc(), color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  };

  // the group is in metres on the desk; it's scaled and turned below to meet the model
  const desk = new THREE.Group();
  scene.add(desk);
  const contact = (x, z, rx, rz, a = 0.8, y = 0.0006) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), a === 1 ? mats.shadow : mats.shadow.clone());
    m.material.opacity = a;
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.renderOrder = 2;
    desk.add(m);
  };

  const topGeo = new THREE.PlaneGeometry(9, 7);
  topGeo.rotateX(-Math.PI / 2);
  const tp = topGeo.attributes.position, tuv = topGeo.attributes.uv;
  for (let i = 0; i < tp.count; i++) tuv.setXY(i, tp.getX(i) / 2.2 + 0.31, tp.getZ(i) / 1.2 + 0.18);
  const top = new THREE.Mesh(topGeo, mats.desk);
  top.receiveShadow = true;
  desk.add(top);

  // the sheet: paper lifts a little at its edges and along its folds
  const { tex, plan } = await blueprint(mobile ? 1500 : 2400);
  const sheetGeo = new THREE.PlaneGeometry(SW, SH, 84, 60);
  sheetGeo.rotateX(-Math.PI / 2);
  const sp = sheetGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i), ex = Math.abs(x) / (SW / 2), ez = Math.abs(z) / (SH / 2);
    const lift = Math.pow(Math.max(ex, ez), 8) * 0.006 + Math.pow(ex * ez, 6) * 0.011
      + Math.exp(-Math.pow(x / 0.012, 2)) * 0.0011 + Math.exp(-Math.pow(z / 0.012, 2)) * 0.0009
      + Math.sin(x * 7 + z * 4) * 0.0005;
    sp.setY(i, 0.0014 + lift);
  }
  sheetGeo.computeVertexNormals();
  const glow = { value: 0 };
  const sheetMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.74, bumpMap: paperGrain(), bumpScale: 0.35, envMapIntensity: 0.7 });
  sheetMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.75, 0.88, 1.0) * smoothstep(0.14, 0.62, diffuseColor.r) * uGlow;');
  };
  sheetMat.customProgramCacheKey = () => 'desk-sheet';
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);
  sheet.receiveShadow = true;
  desk.add(sheet);
  contact(0, 0, SW / 2 + 0.03, SH / 2 + 0.03, 0.5, 0.0004);

  // brass weights hold the sheet flat
  const weight = [[0, 0], [0.027, 0], [0.029, 0.002], [0.029, 0.018], [0.026, 0.021], [0.012, 0.022], [0.009, 0.026], [0.009, 0.036], [0.012, 0.039], [0.012, 0.042], [0.009, 0.045], [0, 0.045]];
  for (const [x, z] of [[-SW / 2 + 0.035, -SH / 2 + 0.035], [SW / 2 - 0.035, SH / 2 - 0.035]]) {
    desk.add(lathe(weight, mats.brass, x, 0.002, z));
    contact(x + 0.008, z + 0.006, 0.05, 0.05, 0.85, 0.0024);
  }

  // a steel rule and a pencil below the sheet
  const ruleGeo = new THREE.BoxGeometry(0.32, 0.0014, 0.028);
  const rule = new THREE.Mesh(ruleGeo, [mats.steelEdge, mats.steelEdge, mats.steel, mats.steelEdge, mats.steelEdge, mats.steelEdge]);
  rule.position.set(0.16, 0.0008, SH / 2 + 0.05);
  rule.rotation.y = 0.04;
  rule.castShadow = rule.receiveShadow = true;
  desk.add(rule);
  contact(0.16, SH / 2 + 0.052, 0.18, 0.026, 0.55);
  desk.add(lay(pencil(mats), -0.13, SH / 2 + 0.058, 0.1));
  contact(-0.13, SH / 2 + 0.06, 0.11, 0.012, 0.7);

  // a coffee on the right
  const mx = SW / 2 + 0.058, mz = SH / 2 - 0.13;
  desk.add(lathe([[0, 0], [0.03, 0], [0.033, 0.002], [0.039, 0.02], [0.042, 0.078], [0.0425, 0.082], [0.041, 0.083], [0.0385, 0.08], [0.036, 0.02], [0.03, 0.006], [0, 0.005]], mats.ceramic, mx, 0, mz));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0385, 48), mats.coffee);
  coffee.rotation.x = -Math.PI / 2; coffee.position.set(mx, 0.066, mz);
  desk.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0048, 14, 40, Math.PI * 1.1), mats.ceramic);
  handle.position.set(mx + 0.002, 0.043, mz + 0.041);
  handle.rotation.set(0, Math.PI / 2, -Math.PI * 0.55);
  handle.castShadow = true;
  desk.add(handle);
  contact(mx + 0.012, mz + 0.008, 0.075, 0.075, 0.9);

  // a cup of pencils above the sheet, to the left
  const cx = -SW / 2 + 0.16, cz = -SH / 2 - 0.1;
  desk.add(lathe([[0, 0], [0.036, 0], [0.038, 0.002], [0.04, 0.1], [0.038, 0.102], [0.036, 0.1], [0.034, 0.006], [0, 0.005]], mats.stoneware, cx, 0, cz));
  [[0.012, 0.01, 0.34, 0.1], [-0.012, -0.008, -0.3, -0.24], [0.006, -0.013, 0.16, -0.36], [-0.008, 0.012, -0.2, 0.3]].forEach(([dx, dz, a, b]) => {
    const p = pencil(mats, 0.16);
    p.position.set(cx + dx + a * 0.05, 0.09, cz + dz + b * 0.05);
    p.rotation.set(b * 0.5, 0, -a * 0.5);
    desk.add(p);
  });
  contact(cx + 0.01, cz + 0.008, 0.07, 0.07, 0.9);

  // a leather notebook on the left, under the title's shade
  const nb = new THREE.Group();
  const coverAt = (y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.0028, 0.29), mats.cover); m.position.y = y; m.castShadow = m.receiveShadow = true; return m; };
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.203, 0.017, 0.283), mats.paper);
  pages.position.y = 0.0112; pages.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.0235, 0.293), mats.elastic);
  band.position.set(0.078, 0.0112, 0);
  nb.add(coverAt(0.0014), pages, coverAt(0.021), band);
  nb.position.set(-SW / 2 - 0.25, 0, 0.12);
  nb.rotation.y = 0.12;
  desk.add(nb);
  contact(-SW / 2 - 0.25, 0.125, 0.15, 0.19, 0.75);
  desk.add(lay(pencil(mats, 0.15), -SW / 2 - 0.26, 0.11, 0.8, 0.0266));

  // the desk lamp, top right, leaning over the sheet
  const lx = SW / 2 - 0.08, lz = -SH / 2 - 0.2;
  desk.add(lathe([[0, 0], [0.066, 0], [0.069, 0.003], [0.069, 0.012], [0.062, 0.016], [0.02, 0.019], [0.012, 0.024], [0.012, 0.034], [0, 0.034]], mats.black, lx, 0, lz));
  contact(lx + 0.01, lz + 0.01, 0.11, 0.11, 0.9);
  const elbow = [lx + 0.05, 0.25, lz - 0.015], head = [lx - 0.19, 0.335, lz + 0.05];
  for (const s of [-0.009, 0.009]) {
    desk.add(rod([lx, 0.03, lz + s], [elbow[0], elbow[1], elbow[2] + s], 0.0032, mats.black));
    desk.add(rod([elbow[0], elbow[1], elbow[2] + s], [head[0], head[1], head[2] + s], 0.0032, mats.black));
  }
  for (const [p, r] of [[[lx, 0.034, lz], 0.0085], [elbow, 0.0105], [head, 0.0085]]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 24), mats.brass);
    knob.position.set(...p); knob.rotation.x = Math.PI / 2; knob.castShadow = true;
    desk.add(knob);
  }
  const headG = new THREE.Group();
  headG.position.set(head[0] - 0.012, head[1] - 0.012, head[2] + 0.01);
  headG.rotation.set(-0.42, 0, 0.62);
  const shadePts = [[0.0135, 0.02], [0.016, 0.018], [0.024, -0.012], [0.052, -0.07], [0.058, -0.086], [0.06, -0.088]];
  const shadeOut = lathe(shadePts, mats.black, 0, 0, 0);
  headG.add(shadeOut);
  const shadeIn = lathe(shadePts.map(([r, y]) => [r * 0.97, y - 0.001]), mats.enamel, 0, 0, 0);
  shadeIn.castShadow = false;
  headG.add(shadeIn);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.017, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.02, 0.74) }));
  bulb.position.y = -0.052;
  headG.add(bulb);
  desk.add(headG);

  // ---------------------------------------------------------------- meeting the model
  // The plan spans x 19.5…-14.5 and z 17.5…-11.5 across its frame on the sheet.
  const scale = 34 / ((plan.u1 - plan.u0) * SW);
  const zc = 17.5 - ((0.5 - plan.v0) / (plan.v1 - plan.v0)) * 29, xc = 19.5 - ((0.5 - plan.u0) / (plan.u1 - plan.u0)) * 34;
  const bounds = new THREE.Box3();
  house.update(1, 0);
  for (const p of house.pieces) bounds.expandByObject(p.group);
  const plane = bounds.min.y - 0.02;       // where the masses stand: on the sheet
  const y0 = plane - 0.0016 * scale;
  desk.position.set(xc, y0, zc);
  desk.rotation.y = Math.PI;
  desk.scale.setScalar(scale);

  // ---------------------------------------------------------------- light
  // late sun through a window, its bars soft because a real window is far away
  const cookie = canvasTexture(512, 512, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
    g.filter = 'blur(9px)';
    g.fillStyle = '#fff';
    const pad = 92, cols = 3, rows = 2, gap = 15;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols, rh = (w - pad * 2 - gap * (rows - 1)) / rows;
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) g.fillRect(pad + a * (cw + gap), pad + b * (rh + gap), cw, rh);
    g.filter = 'none';
  });
  const sun = new THREE.SpotLight(0xffdcb6, 4.2, 0, 0.56, 0.1, 0);
  sun.map = cookie;
  sun.position.set(1.05, 2.9, -1.1);
  sun.target.position.set(0.02, 0, 0.02);
  sun.castShadow = true;
  const sz = mobile ? 1024 : 2048;
  sun.shadow.mapSize.set(sz, sz);
  sun.shadow.camera.near = 60;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 5;
  desk.add(sun, sun.target);
  // the lamp's warm pool (metres are scaled, so the light has to carry further)
  const lamp = new THREE.SpotLight(0xffc48a, 0.34 * scale * scale, 0, 0.85, 0.95, 2);
  bulb.getWorldPosition(lamp.position);
  desk.worldToLocal(lamp.position);
  lamp.target.position.set(0.1, 0, -0.1);
  desk.add(lamp, lamp.target);
  desk.add(new THREE.HemisphereLight(0xe8e4dc, 0x4a3020, 0.62));
  // a soft lift from the room, so the shade side of things isn't lost
  const room = new THREE.DirectionalLight(0xbcd0ee, 0.5);
  room.position.set(-1.2, 2, 1);
  desk.add(room, room.target);

  // ---------------------------------------------------------------- the move
  const st2 = st;
  // the drawn walls come up first, so the lines visibly become walls; the big slabs
  // rise inside them, and the roof comes last
  const ORDER = ['spine', 'fin', 'hearth', 'court', 'plinth', 'pool', 'slab', 'pavilion', 'roof'];
  const turn = house.pieces.map((p) => ORDER.indexOf(p.name));
  const riseAt = (k, i) => { const a = 0.08 + 0.038 * turn[i]; return st2(k, a, a + 0.2); };
  // standing until the rise is done, then they float apart into the sculpture
  const assembleAt = (k) => 1 - st2(k, 0.56, 0.9);
  const C = new THREE.Vector3(xc, y0, zc);
  const rel = new THREE.Vector3();
  function pose(k, aspect, filmFov, ox, oy, pos, tgt) {
    const wide = aspect >= 1;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const worldW = SW * scale;
    const h0 = (worldW / (wide ? 0.5 : 0.92)) / (2 * tan * aspect);
    const el0 = THREE.MathUtils.degToRad(80), az0 = Math.PI;
    const r0 = h0 / Math.sin(el0);
    rel.subVectors(pos, tgt);
    const r1 = rel.length(), el1 = Math.asin(rel.y / r1), az1 = Math.atan2(rel.x, rel.z);
    const e = st2(k, 0.1, 0.96);
    const r = r0 * Math.pow(r1 / r0, e), el = mix(el0, el1, e), az = mix(az0, az1 < 0 ? az1 + Math.PI * 2 : az1, e);
    tgt.lerpVectors(C, tgt, e);
    pos.set(tgt.x + r * Math.cos(el) * Math.sin(az), tgt.y + r * Math.sin(el), tgt.z + r * Math.cos(el) * Math.cos(az));
    const x0 = wide ? -(0.68 - 0.5) : 0, y0v = wide ? 0.5 - 0.54 : 0.5 - 0.3;
    return { fov: mix(FOV, filmFov, e), ox: mix(x0, ox, e), oy: mix(y0v, oy, e) };
  }
  function update(k) {
    glow.value = 0.16 * st2(k, 0.03, 0.16) * (1 - st2(k, 0.3, 0.5));
    return 1 - st2(k, 0.62, 0.94);
  }
  return { scene, update, pose, riseAt, assembleAt, plane };
}
