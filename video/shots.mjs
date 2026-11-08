import { writeFileSync } from 'node:fs';
// Every shot of the intro B-roll, in script order. Each one is recorded on its
// own (npm run record -- <name>) into clips/<name>.mp4 and cut together by
// edit.mjs. Frame functions run in the page with E (lib/ease.js) in scope;
// the factories below write them as strings so their numbers travel with them.

const CUR = 'http://localhost:5288/?capture';
const V1 = 'http://localhost:5301/';
const V2 = 'http://localhost:5302/'; // 45dc2b6, the commit after the review
const WK = 'http://localhost:5309/'; // 9124819, the first version you could walk
const ACC = 'http://localhost:5306/', BOX = 'http://localhost:5307/', BUG = 'http://localhost:5308/'; // c68c346 accordion, 008c734 boxed map, 7eadd7c with the pin bug put back
const TW = 'http://localhost:5303/', AX = 'http://localhost:5304/', WN = 'http://localhost:5305/'; // 09a5de2 tower, 9c39d09 axonometric, 616b83a window
// the first version has its own markup; keep only its picture
const V1_CLEAN = 'body > :not(canvas) { opacity: 0 !important; } html, body { cursor: none !important; }';

const J = JSON.stringify;
const GOLD = { time: 19.62, mist: 0.05, interior: 0.55, fire: 0, veil: 0 };
const DUSK_IN = { time: 19.4, interior: 0.65, fire: 1, mist: 0.05, veil: 0 };

// a free camera moving between two framings over the finished house
const pose = (env, a, b, { ease = 'sine', door = 0, ao } = {}) => `(i, t, n) => {
  const k = E.${ease}(i / (n - 1)), A = ${J(a)}, B = ${J(b)};
  window.__aura.director = { kind: 'pose', env: ${J(env)}, door: ${door}, ao: ${J(ao)},
    cam: { pos: E.v(A.pos, B.pos, k), tgt: E.v(A.tgt, B.tgt, k), fov: E.lerp(A.fov, B.fov, k) } };
}`;

// walking: a path of eye points (and optionally of look points) in the house
const walk = (env, eyes, looks, fov, { ease = 'sine', levelFn = "() => 'upper'" } = {}) => `(i, t, n) => {
  const k = E.${ease}(i / (n - 1));
  const pos = E.path(${J(eyes)}, k), tgt = E.path(${J(looks)}, k);
  const level = (${levelFn})(pos);
  window.__aura.director = { kind: 'walk', state: { x: pos[0], z: pos[2], level }, env: ${J(env)},
    cam: { pos, tgt, fov: ${fov} } };
}`;

// the scroll film itself, by desk and film progress
const film = (from, to, ease = 'sine') => `(i, t, n) => {
  const k = E.${ease}(i / (n - 1)), A = ${J(from)}, B = ${J(to)};
  window.__aura.director = { kind: 'film', desk: E.lerp(A.desk ?? 1, B.desk ?? 1, k), p: E.lerp(A.p ?? 0, B.p ?? 0, k) };
}`;

// the real page, scrolled through a section from a to b (fractions of its run)
const scroll = (sel, a, b, ease = 'sine') => `(i, t, n) => {
  const S = window.__shot, aura = window.__aura;
  aura.director = null;
  if (!S.top) {
    const el = document.querySelector(${J(sel)}); const host = el.closest('.pin-spacer') || el;
    S.top = host.getBoundingClientRect().top + scrollY; S.run = Math.max(1, host.offsetHeight - innerHeight);
  }
  const y = S.top + S.run * E.lerp(${a}, ${b}, E.${ease}(i / (n - 1)));
  aura.lenis.scrollTo(y, { immediate: true, force: true });
}`;

const v1 = (p0, p1) => `(i, t, n) => { window.__aura.setProgress(E.lerp(${p0}, ${p1}, E.sine(i / (n - 1)))); }`;

const stairLevel = "(p) => (p[0] > -0.66 ? 'upper' : p[0] > -6.6 ? 'inside' : 'lower')";


// A before/after pair: the same shot in the reviewed version and the fixed one.
// { p, a, b }: a free camera moving a -> b at a fixed point of the film.
// { p0, p1 }: each version's own camera over that part of the film.
// paint: every mesh a flat colour of its own, so each colour is a draw call.
const pair = (name, seconds, { p, a, b, p0, p1, paint }) => [['b', V1], ['a', V2]].map(([k, url]) => ({
  name: `${name}_${k}`, url, clean: true, cleanCss: V1_CLEAN, seconds,
  frameFn: `(i, t, n) => {
    const A = window.__aura, k = E.sine(i / (n - 1)), a = ${J(a ?? null)}, b = ${J(b ?? null)};
    A.setProgress(${p ?? `E.lerp(${p0}, ${p1}, k)`});
    A.cam = a ? { pos: E.v(a.pos, b.pos, k), tgt: E.v(a.tgt, b.tgt, k), fov: E.lerp(a.fov, b.fov, k) } : null;
    if (${!!paint} && !window.__painted) {
      window.__painted = true;
      let c = 0;
      A.scene.traverse((o) => {
        if (!o.isMesh || Array.isArray(o.material) || !o.material || !o.material.isMeshStandardMaterial) return;
        const m = o.material.clone();
        m.map = m.normalMap = m.roughnessMap = m.metalnessMap = m.aoMap = m.bumpMap = m.emissiveMap = null;
        m.color.set(0); m.emissive.setHSL((c++ * 0.61803) % 1, 0.8, 0.5); m.emissiveIntensity = 1; m.needsUpdate = true;
        o.material = m;
      });
    }
  }`,
}));


// a free camera around the desk, given in the desk's own coordinates (metres)
const deskCam = (a, b, desk = 0.01) => `(i, t, n) => {
  const k = E.sine(i / (n - 1)), A = ${J(a)}, B = ${J(b)};
  const g = window.__aura.desk.scene.children.find((c) => c.scale.x > 1);
  g.updateMatrixWorld(true);
  const m = g.matrixWorld.elements;
  const W = ([x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  window.__aura.director = { kind: 'film', desk: ${desk}, p: 0, cam: { pos: W(E.v(A.pos, B.pos, k)), tgt: W(E.v(A.tgt, B.tgt, k)), fov: E.lerp(A.fov, B.fov, k) } };
}`;

// the real page, scrolled by viewport heights either side of an element's top,
// plus optionally a share of the element's own height (ha, hb)
const scrollVh = (sel, a, b, ease = 'sine', ha = 0, hb = 0) => `(i, t, n) => {
  const S = window.__shot, aura = window.__aura;
  aura.director = null;
  if (S.top === undefined) { const el = document.querySelector(${J(sel)}); const r = el.getBoundingClientRect(); S.top = r.top + scrollY; S.h = r.height; }
  const k = E.${ease}(i / (n - 1)), y0 = S.top + S.h * ${ha} + innerHeight * ${a}, y1 = S.top + S.h * ${hb} + innerHeight * ${b};
  aura.lenis.scrollTo(E.lerp(y0, y1, k), { immediate: true, force: true });
}`;

// a pointer drawn into the page, since a headless screenshot has none of its own
const pointer = (page, x, y) => page.evaluate(([x, y]) => {
  let c = document.getElementById('broll-pointer');
  if (!c) {
    c = document.createElement('div'); c.id = 'broll-pointer';
    c.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;z-index:99999;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 2.5v17.2l4.7-4.3 3 6.6 3-1.4-3-6.4 6.3-.5z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  }
  const host = document.body.classList.contains('is-walking') ? document.getElementById('walk') : document.body;
  if (c.parentNode !== host) host.appendChild(c);
  c.style.transform = `translate(${x - 5}px, ${y - 2.5}px)`;
}, [x, y]);
// the pointer comes in, runs along the metal, back to the middle, presses and holds
const hover = (sel) => async (i, n, page) => {
  const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, sel);
  const P = ([u, v]) => [r[0] + r[2] * u, r[1] + r[3] * v];
  const [x, y] = catmull([[-0.6, 2.6], [-0.2, 1.4], [0.12, 0.55], [0.5, 0.42], [0.9, 0.58], [0.62, 0.5], [0.3, 0.46], [0.5, 0.5]].map(P), sine(Math.min(1, i / (n * 0.78))));
  await page.mouse.move(x, y);
  await pointer(page, x, y);
  // pressed, never released: the ripple shows and nothing is submitted or opened
  if (i === Math.round(n * 0.84)) await page.mouse.down();
};
// the page's own big canvases keep WebGL; only the buttons lose it
const NO_BUTTON_GL = `(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, o) { return this.classList.contains('metal__fx') ? null : g.call(this, k, o); }; })();`;

// ---- chapter 5 helpers
// the real walk mode, opened at a place; stand() keeps its real UI but gives a clean camera path
const openWalk = (place, extra = '') => `(i, t, n) => {
  const S = window.__shot, a = window.__aura; a.director = null;
  if (!S.open) { S.open = true; a.walk.open(${J(place)}); }
  ${extra}
}`;
// a pointer travelling to each button in turn and really clicking it: [[seconds, selector or [selector, text]], ...]
const clicks = (list, from = [960, 700]) => {
  let pts = null;
  return async (i, n, page) => {
    // measured once the first frame has run, so a walk opened by it has its buttons laid out
    if (!pts || i === 1) pts = await page.evaluate((list) => list.map(([, q]) => {
      const [sel, txt] = Array.isArray(q) ? q : [q];
      const el = [...document.querySelectorAll(sel)].find((e) => !txt || e.textContent.trim() === txt);
      const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.56];
    }), list);
    const t = i / 60;
    let k = 0; while (k < list.length - 1 && t > list[k][0]) k++;
    const p0 = k ? pts[k - 1] : from, t0 = k ? list[k - 1][0] : 0, t1 = list[k][0];
    const q = sine((t - Math.max(t0, t1 - 0.8)) / Math.min(t1 - t0, 0.8));
    const x = p0[0] + (pts[k][0] - p0[0]) * q, y = p0[1] + (pts[k][1] - p0[1]) * q;
    await page.mouse.move(x, y);
    await pointer(page, x, y);
    for (const [ct] of list) if (i === Math.round(ct * 60)) { await page.mouse.down(); await page.mouse.up(); }
  };
};
// the house cut open at height y, seen from straight above; sunlight falls straight in
const CUT_CAM = { pos: [2.5, 140, 4.99], tgt: [2.5, 1, 5], fov: 7.6 };
const cutOpen = `const V = a.camera.position.constructor; a.renderer.clippingPlanes = [{ normal: new V(0, -1, 0), constant: 2.1 }]; if (!window.__noShadow) { window.__noShadow = 1; a.scene.traverse((o) => { if (o.isDirectionalLight) o.castShadow = false; }); }`;
// the site's lower plan, flipped to read the same way round as the model from above (the desk opening flips it too)
const planFn = `(i, t, n) => {
  if (document.getElementById('broll-plan')) return;
  const svg = document.querySelector('#planLower svg').cloneNode(true);
  svg.querySelectorAll('*').forEach((n) => n.removeAttribute('style')); // the page draws it on as you scroll
  svg.style.cssText = 'display:block;position:absolute;left:-41.5px;top:-196.5px;width:2003px;height:auto;transform:scaleX(-1);transform-origin:50% 50%;max-width:none;overflow:visible';
  svg.querySelectorAll('text').forEach((t) => { t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%'; t.style.transform = 'scaleX(-1)'; });
  const d = document.createElement('div'); d.id = 'broll-plan';
  d.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#100e0c;overflow:hidden';
  d.appendChild(svg); document.body.appendChild(d);
}`;
const WALK_CSS_HIDE = '#walk, #top, #filmUi { opacity: 0 !important; } html, body { cursor: none !important; }';
const SOUND_FILE = 'edit/cuts/c5-sound.js';

export const SHOTS = [
  // "This is an architectural plan. Lines on paper. Walls, rooms, a stair."
  // the zooms on these four happen in the edit (edit/cuts/intro.js), from the
  // whole frame at 3840x2160: a screenshot crop snaps to whole pixels and shakes
  { name: '01_plan', url: CUR, clean: true, seconds: 8, outW: 3840, crf: 16, frameFn: film({ desk: 0 }, { desk: 0.012 }) },
  { name: '01b_plan_detail', url: CUR, clean: true, seconds: 7, outW: 3840, crf: 16, frameFn: film({ desk: 0 }, { desk: 0 }) },
  // "Now watch what happens when I scroll." / walls rise, floors slide in, roof lands
  { name: '02_rise', url: CUR, clean: true, seconds: 12, preroll: 10, frameFn: film({ desk: 0 }, { desk: 0.6 }, 'cubic'), outW: 3840, crf: 16 },
  // the plan floats apart into the sculpture, the desk dissolves into the gallery
  { name: '03_float', url: CUR, clean: true, seconds: 7, frameFn: `(i, t, n) => {
      const s = E.sine(i / (n - 1));
      window.__aura.director = s < 0.75 ? { kind: 'film', desk: E.lerp(0.6, 1, s / 0.75), p: 0 } : { kind: 'film', desk: 1, p: E.lerp(0, 0.03, (s - 0.75) / 0.25) };
    }` },
  // "...standing on a cliff above the sea at golden hour."
  { name: '04_golden', url: CUR, clean: true, seconds: 6.5, frameFn: pose(GOLD,
      { pos: [-72, 2.4, -90], tgt: [3, 6, 0], fov: 24 }, { pos: [-56, 4.2, -101], tgt: [3, 6.6, 0], fov: 23 }) },
  // the sculpture in its beam of light, then it snaps together onto the cliff
  { name: '05_sculpture', url: CUR, clean: true, seconds: 5, frameFn: film({ p: 0.03 }, { p: 0.125 }) },
  { name: '06_assemble', url: CUR, clean: true, seconds: 7, frameFn: film({ p: 0.14 }, { p: 0.6 }, 'cubic') },
  // "And this isn't a video. It's a website." (the real page, with its UI)
  { name: '07_site', url: CUR, clean: false, seconds: 9, preroll: 60, frameFn: `(i, t, n) => {
      window.__aura.director = null;
      const y = 1350 * E.cubic(E.span(i / (n - 1), 0.18, 1));
      window.__aura.lenis.scrollTo(y, { immediate: true, force: true });
    }` },
  // "Every stone, every board of oak, the sea, the sunset, even the sound of the fire"
  { name: '08a_stone', url: CUR, clean: true, seconds: 3.5, frameFn: pose({ time: 19.45, mist: 0.04, interior: 0.3, fire: 0, veil: 0 },
      { pos: [-7.3, 3.9, -15.6], tgt: [-9.6, 3.1, -11.0], fov: 30 }, { pos: [-8.0, 3.7, -14.3], tgt: [-9.7, 3.0, -11.0], fov: 28 }) },
  { name: '08b_oak', url: CUR, clean: true, seconds: 3.5, frameFn: walk(DUSK_IN,
      [[3.4, 4.42, -2.9], [2.2, 4.36, -1.9]], [[-6, 4.2, 4.6], [-6.4, 4.2, 4.8]], 40) },
  { name: '08c_sea', url: CUR, clean: true, seconds: 3.5, frameFn: walk({ ...GOLD, fire: 1 },
      [[2.6, 5.5, -6.1], [4.0, 5.45, -6.15]], [[17, 3.6, -6.3], [17, 3.5, -6.3]], 46) },
  { name: '08d_sunset', url: CUR, clean: true, seconds: 3.5, frameFn: `(i, t, n) => {
      window.__aura.director = { kind: 'day', t: E.lerp(0.70, 0.86, E.sine(i / (n - 1))) };
    }` },
  { name: '08e_fire', url: CUR, clean: true, seconds: 3.5, frameFn: pose({ time: 21.7, mist: 0.06, interior: 0.85, fire: 1, veil: 0.65 },
      { pos: [0.9, 5.35, 1.0], tgt: [-7.2, 4.85, 5.75], fov: 46 }, { pos: [-1.6, 5.15, 2.75], tgt: [-7.2, 4.8, 5.75], fov: 42 }) },
  // "There's not a single image file on this page." (wide, for a title)
  { name: '08f_aerial', url: CUR, clean: true, seconds: 5.5, frameFn: `(i, t, n) => {
      const k = E.sine(i / (n - 1)), a = E.lerp(-0.86, -0.62, k), r = 92;
      window.__aura.director = { kind: 'pose', env: ${J(GOLD)}, cam: { pos: [3 + Math.cos(a) * r, E.lerp(46, 40, k), Math.sin(a) * r], tgt: [3, 4, 0], fov: 28 } };
    }` },
  // "You can scroll through it like a film,"
  { name: '09_door', url: CUR, clean: true, seconds: 5, frameFn: film({ p: 0.695 }, { p: 0.79 }) },
  // "or step inside and walk the whole house."
  { name: '10_living', url: CUR, clean: true, seconds: 4.5, frameFn: walk(DUSK_IN,
      [[2.6, 5.67, -3.6], [-2.6, 5.62, 1.4]], [[-7.2, 4.9, 5.75], [-7.2, 4.85, 5.75]], 50) },
  // "Down the stair,"
  { name: '11_stair', url: CUR, clean: true, seconds: 4.5, frameFn: walk(DUSK_IN,
      [[0.9, 5.67, 7.45], [-0.66, 5.67, 7.5], [-3.6, 3.7, 7.5], [-6.6, 1.68, 7.55], [-8.1, 1.64, 7.8]],
      [[-6, 3.2, 7.5], [-8, 2.6, 7.5], [-10, 1.0, 7.6], [-12, 1.4, 8.0], [-12, 1.5, 8.6]], 54, { levelFn: stairLevel }) },
  // "into the bedrooms,"
  { name: '12_bedroom', url: CUR, clean: true, seconds: 4, frameFn: walk(DUSK_IN,
      [[7.5, 1.64, -1.3], [6.9, 1.6, -0.3]], [[4.4, 0.85, 3.8], [4.3, 0.8, 3.9]], 48, { levelFn: "() => 'lower'" }) },
  // "out onto the terrace."
  { name: '13_terrace', url: CUR, clean: true, seconds: 5, frameFn: walk(GOLD,
      [[1.0, 5.67, -1.2], [1.6, 5.67, -3.8], [2.0, 5.67, -6.0]], [[-6, 4.6, -9], [-8, 4.2, -9.5], [-9, 3.8, -10.5]], 50) },
  // "But the first version looked nothing like this."
  { name: '15a_v1_brick', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 3, frameFn: v1(0.37, 0.43) },
  { name: '15b_v1_cliff', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 3, frameFn: v1(0.6, 0.68) },
  { name: '15c_v1_sculpture', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 3, frameFn: v1(0.0, 0.09) },
  { name: '15d_v1_room', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 3, frameFn: v1(0.86, 0.95) },
  // "...how I got from that to this." / "the prompts, the mistakes, the tricks"
  { name: '16a_drawings', url: CUR, clean: false, seconds: 5, preroll: 90, frameFn: scroll('#plans', -0.35, 0.55) },
  { name: '16b_roll', url: CUR, clean: false, seconds: 6, preroll: 120, frameFn: scroll('#sheet', 0.05, 0.95) },
  { name: '16c_materials', url: CUR, clean: false, seconds: 5, preroll: 120, frameFn: scroll('#materials', 0.05, 0.9) },
  { name: '16d_day', url: CUR, clean: false, seconds: 5, preroll: 90, frameFn: scroll('#daylight', 0.1, 0.95) },
  { name: '16e_approach', url: CUR, clean: false, seconds: 6, preroll: 120, frameFn: scroll('#approach', 0.0, 0.92) },
  { name: '16f_cta', url: CUR, clean: false, seconds: 4.5, preroll: 60, outW: 3840, crf: 16,
    frameFn: `(i, t, n) => { window.__aura.director = null; window.__aura.lenis.scrollTo(0, { immediate: true, force: true }); }`,
    before: async (i, n, page) => {
      const k = i / (n - 1);
      const pts = [[40, 1060], [110, 975], [150, 962], [178, 968], [132, 964]];
      const [x, y] = catmull(pts, sine(Math.min(1, k * 1.25)));
      await page.mouse.move(x, y);
      // press without releasing: the ripple shows, and no click opens walk mode
      if (i === Math.round(n * 0.86)) await page.mouse.down();
    }, },
  // "...into something like this." (end card plate)
  { name: '17_end', url: CUR, clean: true, seconds: 9, frameFn: pose({ ...GOLD, time: 19.7, interior: 0.75 },
      { pos: [38, 9, -58], tgt: [2, 5.5, 0], fov: 30 }, { pos: [50, 21, -70], tgt: [2, 5, 0], fov: 32 }) },

  // ---- Chapter 1 · "The first prompt: a film in eight chapters" (edit/cuts/ch1.js)
  // v1's eight chapters for the storyboard, each a few seconds of gentle drift
  ...[[0.02, 0.035], [0.09, 0.105], [0.235, 0.25], [0.405, 0.42], [0.565, 0.58], [0.715, 0.73], [0.85, 0.865], [0.955, 0.97]]
    .map(([a, b], i) => ({ name: `c1_sb${i + 1}`, url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 3.5, frameFn: v1(a, b) })),
  // "The masses floated, assembled, turned into stone and glass."
  { name: 'c1_float', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 4, frameFn: v1(0.02, 0.11) },
  { name: 'c1_assemble', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 4, frameFn: v1(0.15, 0.33) },
  { name: 'c1_sweep', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 4, frameFn: v1(0.34, 0.47) },
  // "But look closer." the cliff and the walls, whole frames at 4K for slow push-ins in the edit
  { name: 'c1_cliff4k', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 7, outW: 3840, crf: 16, frameFn: v1(0.60, 0.63) },
  { name: 'c1_brick4k', url: V1, clean: true, cleanCss: V1_CLEAN, seconds: 5, outW: 3840, crf: 16, frameFn: v1(0.425, 0.445) },

  // ---- Chapter 2 · "The creative-director review" (edit/cuts/ch2.js). d668dca was
  // reviewed; 45dc2b6 is the commit that fixed the five problems. Each pair is one
  // shot in both versions: a shared free camera, or each version's own film camera.
  ...pair('c2_cliff', 5.5, { p: 0.62, a: { pos: [-38, 2.5, -62], tgt: [2, -4, -6], fov: 30 }, b: { pos: [-30, 1.6, -54], tgt: [2, -4, -6], fov: 30 } }),
  ...pair('c2_wall', 5.5, { p: 0.62, a: { pos: [-7.2, 3.9, -15.8], tgt: [-9.6, 3, -11], fov: 30 }, b: { pos: [-8.0, 3.7, -14.4], tgt: [-9.6, 3, -11], fov: 30 } }),
  ...pair('c2_gold', 11, { p: 0.66, a: { pos: [-60, 3, -98], tgt: [3, 6.4, 0], fov: 24 }, b: { pos: [-50, 4.5, -104], tgt: [3, 6.4, 0], fov: 24 } }),
  ...pair('c2_blank', 11, { p0: 0.24, p1: 0.33 }),
  ...pair('c2_sculpt', 5.5, { p0: 0.02, p1: 0.08 }),
  ...pair('c2_build', 5.5, { p0: 0.15, p1: 0.33 }),
  ...pair('c2_calls', 11, { p: 0.9, paint: true, a: { pos: [2.2, 5.65, -1.2], tgt: [-5, 4.8, 5], fov: 50 }, b: { pos: [1.5, 5.6, -0.5], tgt: [-5, 4.8, 5], fov: 50 } }),
  // "Then I set a hard rule": the film, and ambient occlusion on and off in a wide shot
  { name: 'c2_film', url: CUR, clean: true, seconds: 6, frameFn: film({ p: 0.47 }, { p: 0.66 }) },
  ...[['on', true], ['off', false]].map(([k, ao]) => ({ name: `c2_ao_${k}`, url: CUR, clean: true, seconds: 8, frameFn: pose(GOLD,
      { pos: [-72, 2.4, -90], tgt: [3, 6, 0], fov: 24 }, { pos: [-60, 3.6, -98], tgt: [3, 6.4, 0], fov: 23 }, { ao }) })),

  // ---- Chapter 3 · "The hero: plans that become a house" (edit/cuts/ch3.js)
  // the three heroes as the page showed them, type and all
  { name: 'c3_tower_ui', url: TW, clean: false, seconds: 7, frameFn: `() => { window.__aura.setProgress(0); }` },
  { name: 'c3_axo_ui', url: AX, clean: false, seconds: 7, frameFn: `() => { window.__aura.setProgress(0); }` },
  { name: 'c3_now_ui', url: CUR, clean: false, seconds: 8, preroll: 60, frameFn: `() => { window.__aura.director = null; }` },
  // version one: the stacked tower
  { name: 'c3_tower', url: TW, clean: true, cleanCss: V1_CLEAN, seconds: 10, frameFn: `(i, t, n) => { window.__aura.setProgress(E.lerp(0, 0.05, E.sine(i / (n - 1)))); }` },
  // version two: the exploded axonometric, whole frames for close-ups of its lines and dust
  { name: 'c3_axo4k', url: AX, clean: true, cleanCss: V1_CLEAN, seconds: 18, outW: 3840, crf: 16, frameFn: `(i, t, n) => { window.__aura.setProgress(E.lerp(0, 0.03, E.sine(i / (n - 1)))); }` },
  // version three: the walls rise, at an even speed so the edit can time it to the words
  { name: 'c3_rise4k', url: CUR, clean: true, seconds: 14, preroll: 10, outW: 3840, crf: 16, frameFn: film({ desk: 0.02 }, { desk: 0.62 }, 'linear') },
  // one camera, one house, from the desk into the gallery
  { name: 'c3_onecam', url: CUR, clean: true, seconds: 9, frameFn: `(i, t, n) => {
      const s = E.sine(i / (n - 1));
      window.__aura.director = s < 0.8 ? { kind: 'film', desk: E.lerp(0.1, 1, s / 0.8), p: 0 } : { kind: 'film', desk: 1, p: E.lerp(0, 0.03, (s - 0.8) / 0.2) };
    }` },
  // the first attempt: a window cut in the paper
  { name: 'c3_win', url: WN, clean: true, cleanCss: V1_CLEAN, seconds: 10, frameFn: `(i, t, n) => { const a = window.__aura; a.setDesk(E.lerp(0.15, 0.72, E.sine(i / (n - 1)))); a.setProgress(0); }` },
  // the plan and the model from one top-down camera, to wipe between
  { name: 'c3_plan_flat', url: CUR, clean: true, seconds: 7, outW: 3840, crf: 16, frameFn: `() => { window.__aura.director = { kind: 'film', desk: 0.02, p: 0, poseAt: 0.02 }; }` },
  { name: 'c3_plan_risen', url: CUR, clean: true, seconds: 7, outW: 3840, crf: 16, frameFn: `(i, t, n) => { window.__aura.director = { kind: 'film', desk: E.lerp(0.31, 0.38, E.sine(i / (n - 1))), p: 0, poseAt: 0.02 }; }` },
  // the desk, close up (positions are the desk's own, in metres)
  { name: 'c3_macro_lamp', url: CUR, clean: true, seconds: 3.5, frameFn: deskCam({ pos: [0.02, 0.26, -0.16], tgt: [0.2, 0.27, -0.45], fov: 30 }, { pos: [0.05, 0.27, -0.19], tgt: [0.2, 0.27, -0.45], fov: 30 }) },
  { name: 'c3_macro_weight', url: CUR, clean: true, seconds: 3.5, frameFn: deskCam({ pos: [-0.24, 0.1, -0.16], tgt: [-0.3855, 0.03, -0.262], fov: 28 }, { pos: [-0.27, 0.09, -0.19], tgt: [-0.3855, 0.03, -0.262], fov: 28 }) },
  { name: 'c3_macro_mug', url: CUR, clean: true, seconds: 3.5, frameFn: deskCam({ pos: [0.36, 0.17, 0.0], tgt: [0.478, 0.05, 0.167], fov: 28 }, { pos: [0.39, 0.15, -0.02], tgt: [0.478, 0.05, 0.167], fov: 28 }) },
  { name: 'c3_macro_rule', url: CUR, clean: true, seconds: 3.5, frameFn: deskCam({ pos: [-0.06, 0.14, 0.44], tgt: [0.3, 0, 0.345], fov: 24 }, { pos: [0.02, 0.14, 0.44], tgt: [0.3, 0, 0.345], fov: 24 }) },
  { name: 'c3_macro_pencils', url: CUR, clean: true, seconds: 3.5, frameFn: deskCam({ pos: [-0.12, 0.2, -0.2], tgt: [-0.2605, 0.09, -0.397], fov: 30 }, { pos: [-0.14, 0.18, -0.22], tgt: [-0.2605, 0.09, -0.397], fov: 30 }) },

  // ---- Chapter 4 · "The landing page sections with GSAP" (edit/cuts/ch4.js). The real
  // page below the film; 4K where the edit moves in on a detail.
  { name: 'c4_handover', url: CUR, clean: true, seconds: 7, preroll: 90, frameFn: scrollVh('.manifesto', -1.5, 0.05, 'cubic') },
  { name: 'c4_manifesto', url: CUR, clean: true, seconds: 10, preroll: 120, outW: 3840, crf: 16, frameFn: scroll('.manifesto', 0.0, 1.0) },
  { name: 'c4_section', url: CUR, clean: true, seconds: 8, preroll: 90, outW: 3840, crf: 16, frameFn: scrollVh('#sectionDraw', -0.9, -0.08) },
  { name: 'c4_plans', url: CUR, clean: true, seconds: 7, preroll: 90, outW: 3840, crf: 16, frameFn: scrollVh('.plan', -0.85, -0.65, 'sine', 0, 1) },
  { name: 'c4_materials', url: CUR, clean: true, seconds: 10, preroll: 150, frameFn: scroll('#materials', 0.0, 0.96) },
  { name: 'c4_day', url: CUR, clean: true, seconds: 12, preroll: 120, outW: 3840, crf: 16, frameFn: scroll('#daylight', 0.02, 0.98, 'linear') },
  { name: 'c4_roll', url: CUR, clean: true, seconds: 14, preroll: 150, outW: 3840, crf: 16, frameFn: scroll('#sheet', 0.0, 1.0) },
  { name: 'c4_approach', url: CUR, clean: true, seconds: 13, preroll: 150, frameFn: scroll('#approach', 0.0, 0.96) },
  // the first version of the paper: CSS panels on hinges (c68c346), and the boxed map (008c734)
  { name: 'c4_accordion', url: ACC, clean: true, seconds: 12, preroll: 120, outW: 3840, crf: 16, frameFn: scroll('#sheet', 0.0, 1.0) },
  { name: 'c4_boxed', url: BOX, clean: true, seconds: 6, preroll: 120, frameFn: scroll('#approach', 0.08, 0.9) },
  // the pin bug, put back in 7eadd7c: the approach's pin created before the Materials pin
  { name: 'c4_bug', url: BUG, clean: true, seconds: 7, preroll: 120, frameFn: `(i, t, n) => {
      const a = window.__aura; a.director = null;
      const st = window.__ST.getById('approach');
      a.lenis.scrollTo(E.lerp(st.start - 760, st.start + 240, E.linear(i / (n - 1))), { immediate: true, force: true });
    }` },
  // the liquid bronze button, and the same button with WebGL taken away from it
  { name: 'c4_button', url: CUR, clean: true, seconds: 9, preroll: 120, outW: 3840, crf: 16, frameFn: scrollVh('.form .btn', -0.55, -0.55), before: hover('.form .btn') },
  // a plain link at the end of the film, upgraded, and with WebGL taken away from the buttons
  { name: 'c4_link', url: CUR, clean: false, seconds: 7, preroll: 150, outW: 3840, crf: 16, frameFn: scroll('#spacer', 0.97, 0.97), before: hover('.frame--atmo a[data-metal]') },
  { name: 'c4_link_nogl', url: CUR, init: NO_BUTTON_GL, clean: false, seconds: 7, preroll: 150, outW: 3840, crf: 16, frameFn: scroll('#spacer', 0.97, 0.97), before: hover('.frame--atmo a[data-metal]') },

  // ---- Chapter 5 · "Walking through the house" (edit/cuts/ch5.js)
  // the real walk mode, driven with the real mouse, keys and touch
  { name: 'c5_enter', url: CUR, clean: false, seconds: 7, preroll: 150, outW: 3840, crf: 16, frameFn: scroll('#spacer', 0.97, 0.97), before: clicks([[3.0, '.frame--atmo button[data-walk]']], [1100, 760]) },
  { name: 'c5_drag', url: CUR, clean: false, seconds: 6, preroll: 150, frameFn: openWalk('living'), before: async (i, n, page) => {
      const k = sine(Math.min(1, i / (n * 0.9))), x = 1300 - 640 * k, y = 620 + Math.sin(k * 3.1) * 40;
      await page.mouse.move(x, y); await pointer(page, x, y);
      if (i === 1) await page.mouse.down();
      if (i === n - 2) await page.mouse.up();
    } },
  { name: 'c5_keys', url: CUR, clean: false, seconds: 5.5, preroll: 150, frameFn: openWalk('terrace', "if (!S.at) { S.at = 1; a.walk.stand({ at: [2.25, -5.5], level: 'upper', look: [2.25, 5.3, 6] }); }"), before: async (i, n, page) => {
      if (i === 24) await page.keyboard.down('KeyW');
      if (i === n - 36) await page.keyboard.up('KeyW');
    } },
  { name: 'c5_phone', url: CUR, width: 390, height: 844, dsf: 3, touch: true, outW: 1170, clean: false, seconds: 6, preroll: 180, frameFn: openWalk('living'), before: (() => {
      let cdp, c;
      const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
      return async (i, n, page) => {
        if (i === 0 && !c) { cdp = await page.context().newCDPSession(page); }
        if (i === 12) { const r = await page.evaluate(() => { const b = document.querySelector('.walk__stick').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.height]; }); c = r; await send('touchStart', r[0], r[1]); }
        if (c && i > 12 && i < n - 30) { const k = sine((i - 12) / 40), w = Math.sin((i / n) * 5) * 0.14; await send('touchMove', c[0] + c[2] * 0.36 * w, c[1] - c[2] * 0.36 * k); }
        if (c && i === n - 30) await send('touchEnd');
      };
    })() },
  { name: 'c5_places', url: CUR, clean: false, seconds: 9.5, preroll: 150, outW: 3840, crf: 16, frameFn: openWalk('living'), before: clicks([[0.9, ['.walk__places button', 'Fire']], [2.3, ['.walk__places button', 'Kitchen']], [3.7, ['.walk__places button', 'Bedroom']], [5.1, ['.walk__places button', 'Bathroom']], [6.5, ['.walk__places button', 'Gallery']], [7.9, ['.walk__places button', 'Cliff edge']]]) },
  { name: 'c5_hours', url: CUR, clean: false, seconds: 9, preroll: 150, outW: 3840, crf: 16, frameFn: openWalk('living', "if (!S.at) { S.at = 1; a.walk.stand({ at: [10.3, 0.2], level: 'upper', look: [-6, 4.95, 0.6] }); }"), before: clicks([[1.0, ['.walk__hours button', 'Dawn']], [3.2, ['.walk__hours button', 'Noon']], [5.4, ['.walk__hours button', 'Golden hour']], [7.4, ['.walk__hours button', 'Night']]]) },
  // the walls you bump into: the real collision test sampled over one bedroom, and a
  // visitor moved through it by the real move(), sliding along what stops them
  { name: 'c5_collision', url: CUR, clean: true, seconds: 8, preroll: 20, outW: 3840, crf: 16, before: async (i, n, page) => {
      await page.evaluate(async () => { window.__wp = window.__wp || await import('/src/world/walkPlan.js'); });
    }, frameFn: `(i, t, n) => {
      const S = window.__shot; if (!window.__wp) return;
      const M = 58.9, sx = (x) => 960 - (x - 2.5) * M, sy = (z) => 540 - (z - 5) * M, wx = (px) => 2.5 - (px - 960) / M, wz = (py) => 5 - (py - 540) / M;
      if (!S.c) {
        S.plan = window.__wp.createFloorPlan([]);
        const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#100e0c';
        const c = document.createElement('canvas'); c.width = 3840; c.height = 2160; c.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px'; d.appendChild(c); document.body.appendChild(d);
        S.c = c.getContext('2d'); S.c.scale(2, 2); S.bg = document.createElement('canvas'); S.bg.width = 3840; S.bg.height = 2160;
        const g = S.bg.getContext('2d'); g.scale(2, 2); g.fillStyle = 'rgba(237,201,143,0.2)';
        for (let y = 430; y < 890; y += 1) for (let x = 770; x < 1530; x += 1) if (S.plan.canStand(wx(x + 0.5), wz(y + 0.5), 'lower')) g.fillRect(x, y, 1.02, 1.02);
        S.st = { x: -1.5, z: -0.5, level: 'lower' }; S.trail = []; S.hit = 0; S.done = -1;
      }
      if (i === S.done || i < 0) return; if (i === 0 && S.done === 0) return; S.done = i;
      const SEG = [[0.9, 0.42, 1.5], [0, 1, 1.95], [1, 0, 0.5], [0, 1, 1.2]];
      let T = 0, w = SEG[SEG.length - 1]; for (const q of SEG) { if (t < T + q[2]) { w = q; break; } T += q[2]; }
      const L = Math.hypot(w[0], w[1]), dt = 1 / 60, px = S.st.x, pz = S.st.z, v = 2.1;
      if (i > 0) S.plan.move(S.st, (w[0] / L) * v * dt, (w[1] / L) * v * dt);
      const went = Math.hypot(S.st.x - px, S.st.z - pz) / (v * dt);
      S.hit = i > 0 && went < 0.75 ? 1 : S.hit * 0.92;
      S.trail.push([sx(S.st.x), sy(S.st.z)]);
      const g = S.c; g.clearRect(0, 0, 1920, 1080); g.drawImage(S.bg, 0, 0, 1920, 1080);
      g.strokeStyle = '#edc98f'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); S.trail.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      const [x, y] = S.trail[S.trail.length - 1];
      g.fillStyle = 'rgba(224,99,90,' + (0.5 * S.hit).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, 12 + 16 * S.hit, 0, 7); g.fill();
      g.fillStyle = '#fff4e3'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
    }` },
  // what the first walkable version really was (9124819)
  { name: 'c5_old_walk', url: WK, clean: true, cleanCss: WALK_CSS_HIDE, seconds: 6, preroll: 120, frameFn: `(i, t, n) => { const a = window.__aura, k = E.sine(i / (n - 1)); if (!a.walk.active) a.walk.open('living'); a.cam = { pos: E.v([1.5, 5.67, -2.4], [2.6, 5.5, -0.7], k), tgt: E.v([-3, 4.9, 4.8], [6.5, 4.7, 3], k), fov: 50 }; }` },
  ...[['old', WK], ['now', CUR]].flatMap(([k, url]) => {
    const old = k === 'old', G = { time: 19.3, interior: 0.5, fire: 1, mist: 0.05, veil: 0 }, N = { time: 13, mist: 0.02, interior: 0.4, fire: 0, veil: 0 };
    const at = (name, seconds, env, cam0, cam1, more = '') => ({ name: `c5_${k}_${name}`, url, clean: true, cleanCss: WALK_CSS_HIDE, seconds, preroll: 120, outW: name === 'cut' ? 3840 : 1920, crf: name === 'cut' ? 16 : undefined, frameFn: `(i, t, n) => {
      const a = window.__aura, k = E.sine(i / (n - 1)), A = ${J(cam0)}, B = ${J(cam1)}, cam = { pos: E.v(A.pos, B.pos, k), tgt: E.v(A.tgt, B.tgt, k), fov: E.lerp(A.fov, B.fov, k) };
      ${more}
      ${old ? `if (!a.walk.active) a.walk.open('dining'); Object.assign(a.walk.env, ${J(env)}); a.cam = cam;` : `a.director = { kind: 'pose', env: ${J(env)}, door: 1, ao: false, cam };`}
    }` });
    return [
      at('chairs', 5, G, { pos: [3.2, 5.3, -0.6], tgt: [6.5, 4.65, 3], fov: 44 }, { pos: [3.6, 5.2, -0.1], tgt: [6.5, 4.65, 3], fov: 42 }),
      at('kitchen', 5, G, { pos: [11, 5.6, 2.4], tgt: [8.2, 4.7, 6.6], fov: 56 }, { pos: [10.6, 5.55, 2.9], tgt: [8.2, 4.7, 6.6], fov: 54 }),
      at('cut', 8, N, CUT_CAM, CUT_CAM, `${cutOpen}`),
      ...(old ? [at('west', 5, N, { pos: [-24, 3, 2], tgt: [-11, 2, 2], fov: 50 }, { pos: [-22, 3, 2.4], tgt: [-11, 2, 2], fov: 50 }), at('front', 6, N, { pos: [3, 3, -38], tgt: [3, 2, 0], fov: 40 }, { pos: [3, 2.2, -33], tgt: [3, 2, 0], fov: 40 })] : []),
    ];
  }),
  { name: 'c5_plan_old', url: WK, clean: true, seconds: 2, preroll: 30, outW: 3840, crf: 16, frameFn: planFn },
  { name: 'c5_plan_now', url: CUR, clean: true, seconds: 2, preroll: 30, outW: 3840, crf: 16, frameFn: planFn },
  // the rest of the house, once it was built
  { name: 'c5_tour_kitchen', url: CUR, clean: true, seconds: 4, frameFn: walk(GOLD, [[7.2, 5.67, 3.6], [6.4, 5.62, 4.3]], [[10.6, 4.7, 6.8], [10.8, 4.7, 7]], 54) },
  { name: 'c5_tour_stair', url: CUR, clean: true, seconds: 4, frameFn: walk(DUSK_IN, [[-0.5, 5.67, 7.5], [-1.5, 5.3, 7.5]], [[-6.6, 2.4, 7.5], [-7.2, 2.2, 7.5]], 60, { levelFn: "() => 'inside'" }) },
  { name: 'c5_tour_bath', url: CUR, clean: true, seconds: 4, frameFn: walk({ time: 19.4, mist: 0.05, interior: 0.65, fire: 1, veil: 0 }, [[6.95, 1.58, 5.75], [6.6, 1.56, 5.72]], [[3.6, 1.05, 5.35], [3.5, 1.0, 5.3]], 58, { levelFn: "() => 'lower'" }) },
  // sound: outside, in through the open door, the door closing, up to the fire. The real
  // hearing() numbers are saved for the meters in the edit.
  (() => { const log = []; return { name: 'c5_sound', url: CUR, clean: false, seconds: 15, preroll: 150, frameFn: openWalk('terrace', `
      const u = E.linear(i / (n - 1));
      const p = E.path([[2.25, -7.0], [2.25, -5.6], [2.25, -4.0], [1.6, -2.2], [1.6, -2.1], [1.6, -2.0], [-1.0, -0.4], [-3.6, 0.9], [-5.6, 2.6]], E.sine(u));
      const l = E.path([[-2, 4.8, 8], [-1, 4.8, 8], [0, 4.9, 8], [-2, 4.9, 7], [-3, 4.9, 6.5], [-4, 4.9, 6.2], [-6.2, 4.9, 6], [-7, 4.9, 5.9], [-7.2, 4.9, 5.75]], E.sine(u));
      a.walk.stand({ at: [p[0], p[1]], level: 'upper', look: l });
      if (i === 400) document.querySelectorAll('.walk__switches button')[2].click();
      if (i === 620) document.querySelectorAll('.walk__switches button')[3].click();
    `), before: async (i, n, page) => {
      log[i] = await page.evaluate(() => { const h = window.__aura.walk.hearing(); return [h.outside, h.muffle, h.fire].map((v) => +v.toFixed(3)); });
      if (i === n - 1) writeFileSync(SOUND_FILE, `window.__C5_SOUND = ${JSON.stringify(log)};\n`);
    } }; })(),
];

// Node-side copies for crops and mouse paths
function sine(t) { return -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2; }
function catmull(pts, t) {
  const seg = pts.length - 1, f = Math.min(1, Math.max(0, t)) * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(seg, i + 2)];
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
}
