import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { upperPlan, lowerPlan, sectionAA, planXY } from '../ui/drawings.js';

// The opening shot: the plans on a walnut desk, seen from above. Scrolling lowers
// the camera onto the sheet; the plan's footprint opens like a window onto the
// live film behind it, and grows until the film fills the frame. The desk is its
// own small scene, drawn over the film with a hole where the sheet lies.

const SW = 0.841, SH = 0.594; // an A1 sheet, in metres
const FOV = 30;
const st = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;

// ---------------------------------------------------------------- the blueprint
const SHAPES = 'line, rect, polyline, polygon, circle, ellipse, path';
const PAINT = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'];

// An SVG drawn to a canvas can't see the page's stylesheet or webfonts, so the
// computed paint goes onto each shape and text is set with the canvas instead.
async function drawSvg(ctx, markup, x, y, w) {
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
  ctx.drawImage(img, x, y, w, h);
  await Promise.all([...new Set(words.map((t) => t.font))].map((f) => document.fonts.load(f, 'A').catch(() => {})));
  for (const t of words) {
    ctx.setTransform(t.m.a, t.m.b, t.m.c, t.m.d, x + t.m.e, y + t.m.f);
    ctx.font = t.font;
    ctx.fillStyle = t.fill;
    ctx.globalAlpha = t.opacity;
    const chars = t.spacing ? [...t.text] : [t.text];
    const widths = chars.map((c) => ctx.measureText(c).width + t.spacing);
    const total = widths.reduce((a, b) => a + b, 0) - t.spacing;
    let cx = t.x - (t.anchor === 'middle' ? total / 2 : t.anchor === 'end' ? total : 0);
    chars.forEach((c, i) => { ctx.fillText(c, cx, t.y); cx += widths[i]; });
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
  base.addColorStop(0, '#1d5392'); base.addColorStop(1, '#123a6e');
  g.fillStyle = base; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,10,40'},${Math.random() * 0.018})`;
    const s = (8 + Math.random() * 70) * u;
    g.fillRect(Math.random() * cw, Math.random() * ch, s, s * (0.3 + Math.random()));
  }
  // drafting grid and sheet border
  g.strokeStyle = 'rgba(190,220,255,0.07)'; g.lineWidth = 1.2 * u;
  for (let x = 60 * u; x < cw; x += 60 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); }
  for (let y = 60 * u; y < ch; y += 60 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
  const m = 56 * u;
  g.strokeStyle = 'rgba(232,242,255,0.86)'; g.lineWidth = 3 * u; g.strokeRect(m, m, cw - 2 * m, ch - 2 * m);
  g.lineWidth = 1 * u; g.strokeRect(m + 12 * u, m + 12 * u, cw - 2 * m - 24 * u, ch - 2 * m - 24 * u);

  // the upper level, large, with the lower level and the section beside it
  const pw = 1560 * u, px = 96 * u, py = 88 * u;
  const main = await drawSvg(g, upperPlan(), px, py, pw * (ch - 176 * u) / (pw * 580 / 680) > 1 ? pw : (ch - 176 * u) * 680 / 580);
  const col = px + main.w + 56 * u, colW = cw - col - 96 * u;
  const low = await drawSvg(g, lowerPlan(), col, 96 * u, colW);
  const label = (text, x, y) => { g.font = `500 ${15 * u}px Manrope, sans-serif`; g.fillStyle = 'rgba(232,242,255,0.8)'; g.fillText(text.toUpperCase().split('').join(' '), x, y); };
  label('Lower level', col, 96 * u + low.h + 26 * u);
  const secY = 96 * u + low.h + 52 * u;
  const sec = await drawSvg(g, sectionAA(), col, secY, colW);
  label('Section A-A', col, secY + sec.h + 26 * u);
  // title block
  const tbY = ch - m - 250 * u, tbX = col;
  g.strokeStyle = 'rgba(232,242,255,0.7)'; g.lineWidth = 1.6 * u; g.strokeRect(tbX, tbY, colW, 226 * u);
  await document.fonts.load(`400 ${64 * u}px "Cormorant Garamond"`).catch(() => {});
  g.fillStyle = '#eef5ff'; g.font = `400 ${70 * u}px "Cormorant Garamond", serif`;
  g.fillText('A U R A', tbX + 30 * u, tbY + 86 * u);
  g.font = `italic 300 ${32 * u}px "Cormorant Garamond", serif`;
  g.fillText('The living sanctuary', tbX + 30 * u, tbY + 128 * u);
  label('Sheet A-101 · Upper level plan · 1:100', tbX + 30 * u, tbY + 180 * u);

  // where the plan's rooms lie on the sheet, in metres from its centre
  const s = main.w / main.vw;
  const toSheet = (x, z) => {
    const [ax, ay] = planXY(x, z);
    return [((px + ax * s) / cw - 0.5) * SW, ((py + ay * s) / ch - 0.5) * SH];
  };
  const [x0, z0] = toSheet(-9.6, 8.2), [x1, z1] = toSheet(11.8, -6.4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, room: { x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.abs(x1 - x0) / 2, hd: Math.abs(z1 - z0) / 2 } };
}

// ---------------------------------------------------------------- small things
const rod = (a, b, r, mat) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 16), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true;
  return m;
};
const cyl = (r0, r1, h, mat, x, y, z, seg = 48, open = false) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const box = (w, h, d, mat, x, y, z, ry = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  return m;
};
function pencil(x, z, ry, mats, len = 0.18) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, len, 6), mats.lead);
  body.rotation.z = Math.PI / 2; body.castShadow = true;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.014, 6), mats.cedar);
  tip.rotation.z = -Math.PI / 2; tip.position.x = len / 2 + 0.007; tip.castShadow = true;
  g.add(body, tip);
  g.position.set(x, 0.0085, z);
  g.rotation.y = ry;
  return g;
}

// ---------------------------------------------------------------- the scene
export async function createDesk(renderer, M, { mobile }) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.02, 30);
  camera.up.set(0, 0, -1);

  const w = M.textures.walnut;
  const mats = {
    desk: new THREE.MeshStandardMaterial({ map: w.map, normalMap: w.normalMap, roughnessMap: w.roughnessMap, color: 0xe6c3a0, roughness: 0.82, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd8ad6c, metalness: 1, roughness: 0.28, envMapIntensity: 3.2 }),
    black: new THREE.MeshStandardMaterial({ color: 0x18181a, metalness: 0.5, roughness: 0.42, envMapIntensity: 1.6 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xece6db, roughness: 0.42, envMapIntensity: 1.4 }),
    ceramicDark: new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.36, envMapIntensity: 1.6 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x24120a, roughness: 0.14, envMapIntensity: 2 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe9e2d3, roughness: 0.95 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x2b2019, roughness: 0.62, envMapIntensity: 1.2 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 1, roughness: 0.4, envMapIntensity: 2 }),
    lead: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.5 }),
    cedar: new THREE.MeshStandardMaterial({ color: 0xc69b6a, roughness: 0.8 }),
  };

  // the desk, with a hole under the sheet so the film can show through it
  const outline = new THREE.Shape([[-4, -3], [4, -3], [4, 3], [-4, 3]].map(([x, y]) => new THREE.Vector2(x, y)));
  const hx = SW / 2 - 0.004, hz = SH / 2 - 0.004;
  outline.holes.push(new THREE.Path([[-hx, -hz], [-hx, hz], [hx, hz], [hx, -hz]].map(([x, y]) => new THREE.Vector2(x, y))));
  const deskGeo = new THREE.ShapeGeometry(outline);
  deskGeo.rotateX(-Math.PI / 2);
  const pos = deskGeo.attributes.position, uv = deskGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 0.3, pos.getZ(i) * 0.62);
  const desk = new THREE.Mesh(deskGeo, mats.desk);
  desk.receiveShadow = true;
  scene.add(desk);

  // the sheet: real paper lifts a little at its edges
  const { tex, room } = await blueprint(mobile ? 1500 : 2400);
  const sheetGeo = new THREE.PlaneGeometry(SW, SH, 56, 40);
  sheetGeo.rotateX(-Math.PI / 2);
  const sp = sheetGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const ex = Math.abs(sp.getX(i)) / (SW / 2), ez = Math.abs(sp.getZ(i)) / (SH / 2);
    const lift = Math.pow(Math.max(ex, ez), 7) * 0.007 + Math.pow(ex * ez, 5) * 0.012 + Math.sin(sp.getX(i) * 9 + sp.getZ(i) * 5) * 0.0006;
    sp.setY(i, 0.0016 + lift);
  }
  sheetGeo.computeVertexNormals();
  const win = {
    uC: { value: new THREE.Vector2(room.x, room.z) },
    uH: { value: new THREE.Vector2(room.hw, room.hd) },
    uOpen: { value: 0 }, uInk: { value: 1 }, uSoft: { value: 0.006 },
  };
  const sheetMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, transparent: true, envMapIntensity: 0.9 });
  sheetMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, win);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec2 uC; uniform vec2 uH; uniform float uOpen; uniform float uInk; uniform float uSoft;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
vec2 sheetP = (vec2(vMapUv.x, 1.0 - vMapUv.y) - 0.5) * vec2(${SW.toFixed(3)}, ${SH.toFixed(3)});
vec2 winQ = abs(sheetP - uC) - uH;
float winSd = length(max(winQ, 0.0)) + min(max(winQ.x, winQ.y), 0.0);
float winIn = (1.0 - smoothstep(-uSoft, uSoft, winSd)) * uOpen;
float winLine = smoothstep(0.14, 0.62, diffuseColor.r);
diffuseColor.a *= mix(1.0, winLine * uInk, winIn);`);
  };
  sheetMat.customProgramCacheKey = () => 'desk-sheet';
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);
  sheet.receiveShadow = true;
  sheet.renderOrder = 1;
  scene.add(sheet);

  // brass weights hold the sheet flat
  scene.add(cyl(0.024, 0.026, 0.026, mats.brass, -SW / 2 + 0.03, 0.002, -SH / 2 + 0.03));
  scene.add(cyl(0.024, 0.026, 0.026, mats.brass, SW / 2 - 0.03, 0.002, SH / 2 - 0.03));
  // architect's scale and a pencil along the lower edge
  scene.add(box(0.3, 0.012, 0.02, mats.alu, 0.14, 0.003, SH / 2 + 0.035, 0.05));
  scene.add(pencil(-0.1, SH / 2 + 0.05, -0.12, mats));
  scene.add(pencil(SW / 2 + 0.05, -0.02, 1.4, mats, 0.15));
  // cup of pencils and a coffee, top right
  const px = SW / 2 + 0.085, pz = -SH / 2 + 0.2;
  scene.add(cyl(0.041, 0.038, 0.1, mats.ceramicDark, px, 0, pz));
  [[0.015, 0.012, 0.04, 0.3], [-0.016, -0.012, -0.05, -0.4], [0.008, -0.018, 0.03, -0.7], [-0.012, 0.016, -0.02, 0.9]].forEach(([dx, dz, tx, tz]) => {
    scene.add(rod([px + dx, 0.03, pz + dz], [px + dx + tx, 0.19, pz + dz + tz * 0.05], 0.0036, mats.lead));
  });
  const mx = SW / 2 + 0.062, mz = SH / 2 - 0.1;
  const mug = cyl(0.041, 0.036, 0.075, mats.ceramic, mx, 0, mz, 48, true);
  mug.material = mats.ceramic.clone(); mug.material.side = THREE.DoubleSide;
  scene.add(mug);
  scene.add(cyl(0.039, 0.039, 0.002, mats.coffee, mx, 0.058, mz));
  scene.add(cyl(0.036, 0.036, 0.004, mats.ceramic, mx, 0, mz));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 12, 32), mats.ceramic);
  handle.position.set(mx + 0.047, 0.04, mz + 0.008);
  handle.rotation.y = -0.16;
  handle.castShadow = true;
  scene.add(handle);

  // a closed notebook with a pencil on it, lower left
  const nb = new THREE.Group();
  const cover = (y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.003, 0.29), mats.leather); m.position.y = y; m.castShadow = m.receiveShadow = true; return m; };
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.203, 0.016, 0.283), mats.paper);
  pages.position.y = 0.0105; pages.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0215, 0.292), mats.black);
  band.position.set(0.078, 0.0105, 0);
  nb.add(cover(0.0015), pages, cover(0.0195), band);
  nb.position.set(-SW / 2 - 0.24, 0, 0.13);
  nb.rotation.y = 0.14;
  scene.add(nb);
  const onBook = pencil(0, 0, 0.9, mats, 0.16);
  onBook.position.set(-SW / 2 - 0.25, 0.0255, 0.12);
  scene.add(onBook);

  // the desk lamp, top left, leaning over the sheet
  const lx = -SW / 2 - 0.27, lz = -SH / 2 - 0.05;
  scene.add(cyl(0.062, 0.066, 0.014, mats.black, lx, 0, lz));
  const elbow = [lx - 0.05, 0.2, lz - 0.05], head = [lx + 0.17, 0.3, lz + 0.015];
  scene.add(rod([lx, 0.016, lz], elbow, 0.0055, mats.black));
  scene.add(rod(elbow, head, 0.0055, mats.black));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.058, 0.075, 40, 1, true), mats.black.clone());
  shade.material.side = THREE.DoubleSide;
  shade.position.set(head[0] + 0.012, head[1] - 0.03, head[2] + 0.006);
  shade.rotation.set(-0.3, 0, -0.62);
  shade.castShadow = true;
  scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.86) }));
  bulb.position.set(head[0] + 0.024, head[1] - 0.052, head[2] + 0.012);
  scene.add(bulb);

  // late sun through a window, and the lamp's warm pool
  const sun = new THREE.DirectionalLight(0xffdcb4, 3.1);
  sun.position.set(-1.7, 2.3, 1.15);
  sun.castShadow = true;
  const sz = mobile ? 1024 : 2048;
  sun.shadow.mapSize.set(sz, sz);
  Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.2, far: 6 });
  sun.shadow.bias = -0.0003;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  // window bars that only cast shadows
  const gobo = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const towards = sun.position.clone().normalize();
  const mid = towards.clone().multiplyScalar(1.5);
  const bars = new THREE.Group();
  bars.position.copy(mid);
  bars.lookAt(0, 0, 0);
  for (const dx of [-1.15, -0.42, 0.31, 1.04]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 5, 0.03), gobo);
    bar.position.x = dx;
    bar.castShadow = true;
    bars.add(bar);
  }
  for (const [dy, hh] of [[1.3, 1.2], [-1.3, 1.2]]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, hh, 0.03), gobo);
    edge.scale.x = 40; edge.position.y = dy + (dy > 0 ? 0.3 : -0.3);
    edge.castShadow = true;
    bars.add(edge);
  }
  scene.add(bars);
  const lamp = new THREE.SpotLight(0xffc98e, 0.62, 0, 0.82, 0.9, 2);
  lamp.position.copy(bulb.position);
  lamp.target.position.set(-0.1, 0, -0.04);
  scene.add(lamp, lamp.target);

  const fill = new THREE.HemisphereLight(0xe6e2da, 0x5a3a24, 0.85);
  scene.add(fill);

  // ---------------------------------------------------------------- the move
  const target = new THREE.Vector3(), eye = new THREE.Vector3();
  function update(k, time, pointer, calm) {
    const W = innerWidth, H = innerHeight, aspect = W / H, wide = aspect >= 1;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    // start with the sheet beside the title (wide) or above it (tall)
    const frac = wide ? 0.5 : 0.92;
    const h0 = SW / frac / (2 * tan * aspect);
    const h1 = Math.min(0.5 * SH / (2 * tan), 0.82 * SW / (2 * tan * aspect));
    const e = k * k * (3 - 2 * k);
    const h = h0 * Math.pow(h1 / h0, e);
    const fx = mix(wide ? 0.68 : 0.5, 0.5, st(k, 0.1, 0.9)), fy = mix(wide ? 0.54 : 0.3, 0.5, st(k, 0.1, 0.9));
    const drift = calm ? 0 : 1;
    target.set(mix(0, room.x, e) + pointer.x * h * 0.008, 0, mix(0, room.z, e) + pointer.y * h * 0.006);
    eye.set(target.x + Math.sin(time * 0.19) * h * 0.004 * drift, h, target.z + h * 0.2 * (1 - e) + Math.sin(time * 0.13) * h * 0.003 * drift);
    camera.position.copy(eye);
    camera.lookAt(target);
    camera.aspect = aspect;
    camera.setViewOffset(W, H, -(fx - 0.5) * W, -(fy - 0.5) * H, W, H);
    camera.updateProjectionMatrix();
    // the rooms open first, then the opening outgrows the sheet
    win.uOpen.value = st(k, 0.2, 0.36);
    const grow = 1 + 9 * Math.pow(st(k, 0.42, 0.95), 2);
    win.uH.value.set(room.hw * grow, room.hd * grow);
    win.uInk.value = 1 - st(k, 0.58, 0.86);
    return { film: win.uOpen.value > 0.001, on: k < 0.995 };
  }
  return { scene, camera, update };
}
