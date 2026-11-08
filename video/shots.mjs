// Every shot of the intro B-roll, in script order. Each one is recorded on its
// own (npm run record -- <name>) into clips/<name>.mp4 and cut together by
// edit.mjs. Frame functions run in the page with E (lib/ease.js) in scope;
// the factories below write them as strings so their numbers travel with them.

const CUR = 'http://localhost:5288/?capture';
const V1 = 'http://localhost:5301/';
const V2 = 'http://localhost:5302/'; // 45dc2b6, the commit after the review
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
];

// Node-side copies for crops and mouse paths
function sine(t) { return -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2; }
function catmull(pts, t) {
  const seg = pts.length - 1, f = Math.min(1, Math.max(0, t)) * seg, i = Math.min(seg - 1, Math.floor(f)), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(seg, i + 2)];
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
}
