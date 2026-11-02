import './style.css';
import * as THREE from 'three';
import { createMaterials, aura } from './world/materials.js';
import { createHouse } from './world/house.js';
import { createInterior } from './world/interior.js';
import { createLandscape } from './world/landscape.js';
import { createVegetation, patchLeaves } from './world/vegetation.js';
import { createAtmosphere } from './world/atmosphere.js';
import { cameraAt, storyAt } from './story/timeline.js';
import { createPost } from './core/post.js';
import { createUI } from './ui/ui.js';
import { initPage } from './ui/page.js';
import { renderSamples } from './world/samples.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const mobile = matchMedia('(max-width: 900px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// a scroll film always opens on its first frame
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const maxDpr = Math.min(window.devicePixelRatio, 1.5);
let dpr = maxDpr;
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 12000);

const statusEl = document.getElementById('loaderStatus');
const barEl = document.getElementById('loaderBar');
const status = (text, t) => { statusEl.textContent = text; barEl.style.width = `${t * 100}%`; };
// Yield so the loader can paint; never stall when rAF is throttled in a background tab.
const nextFrame = () => new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 60); });

// ---- scroll → progress ----
// The film plays across the spacer; the landing page then scrolls up over it.
let target = 0;
let prog = 0;
const spacer = document.getElementById('spacer');
const filmUi = document.getElementById('filmUi');
const header = document.getElementById('top');
const filmEnd = () => spacer.offsetTop + spacer.offsetHeight - innerHeight;
let covered = false;
const readScroll = () => {
  const end = filmEnd();
  target = end > 0 ? Math.min(1, Math.max(0, scrollY / end)) : 0;
  const past = scrollY - end;
  covered = past > innerHeight * 1.02;
  filmUi.classList.toggle('is-hidden', past > innerHeight * 0.3);
  header.classList.toggle('is-solid', past > innerHeight * 0.7);
};
addEventListener('scroll', readScroll, { passive: true });

const pointer = new THREE.Vector2();
const pointerEased = new THREE.Vector2();
addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
}, { passive: true });

const mark = (label) => { if (import.meta.env.DEV) console.info(`[aura] ${label} ${performance.now().toFixed(0)}ms`); };

async function boot() {
  status('Quarrying stone', 0.08);
  await nextFrame();
  const M = createMaterials(renderer);

  mark('materials');
  status('Setting nine masses', 0.32);
  await nextFrame();
  const house = createHouse(M);
  scene.add(house.root);
  const interior = createInterior(M);
  scene.add(interior.root);

  mark('house+interior');
  status('Shaping the headland', 0.5);
  await nextFrame();
  const land = createLandscape(M);
  scene.add(land.group);
  patchLeaves(M.leaves);
  const veg = createVegetation(M, land.plantings);
  scene.add(veg);

  mark('landscape');
  status('Waiting for the light', 0.72);
  await nextFrame();
  const atmo = createAtmosphere(renderer, scene, M, { mobile });
  // the interior can never be seen reflected in the sea; skip it in the mirror pass
  atmo.excludeFromReflection([interior.root]);
  const post = createPost(renderer, scene, camera, { mobile });

  // Smooth scrolling on GSAP's ticker, so ScrollTrigger and the film read the same scroll.
  const lenis = reducedMotion ? null : new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, far) => {
    if (lenis) lenis.scrollTo(y, { immediate: far, duration: far ? 0 : 2.2 });
    else window.scrollTo({ top: y, behavior: 'auto' });
  };

  let page = null;
  const ui = createUI({
    onJump: (p) => {
      // from deep in the page, cut straight to the film rather than scrolling back through it
      const far = Math.abs(scrollY - p * filmEnd()) > innerHeight * 4 && scrollY > filmEnd();
      scrollToY(p * filmEnd(), far);
    },
    onAnchor: (el) => {
      const top = el.getBoundingClientRect().top + scrollY;
      scrollToY(top, Math.abs(top - scrollY) > innerHeight * 4);
    },
    onFrameLive: (el) => page?.frameIn(el),
  });

  const doorX = house.door.position.x;
  const doorZ = house.door.position.z;
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const side = new THREE.Vector3();
  const warmGlow = new THREE.Color(1.0, 0.72, 0.45);

  function apply(p, time, dt) {
    const s = storyAt(p);
    house.update(s.assemble, reducedMotion ? 0 : time);
    aura.uSweep.value = s.sweep;
    aura.uTime.value = time;
    interior.root.visible = s.sweep > 2.5;

    // the sea-facing door slides behind its neighbour as we approach
    house.door.position.x = doorX + s.door * 2.46;
    house.door.position.z = doorZ - Math.min(1, s.door * 6) * 0.07;

    const env = ui.update(p, dt, s.env, s.controls);
    const sky = atmo.update({
      studio: s.studio, time: env.time, mist: env.mist,
      worldR: s.worldR, voidOpacity: s.voidOpacity, now: time,
      dust: 1 - THREE.MathUtils.smoothstep(p, 0.12, 0.26),
    });
    interior.update(env, time);
    land.group.visible = veg.visible = s.worldR > 1;

    // lit rooms read from outside after dark
    M.glassDark.emissive.copy(warmGlow).multiplyScalar(env.interior * (1 - sky.daylight) * 0.35);
    M.textures.waves.normalMap.offset.set(time * 0.012, time * 0.007);

    // contact shadows matter for the maquette and the rooms, not for wide landscape shots
    if (post.ao) post.ao.enabled = !(p > 0.47 && p < 0.69);

    // camera
    let { fov, shift } = cameraAt(p, camPos, camTgt);
    if (!reducedMotion) {
      const breathe = 1 - s.controls * 0.6;
      camPos.y += Math.sin(time * 0.31) * 0.06 * breathe;
      camPos.x += Math.sin(time * 0.17) * 0.08 * breathe;
      side.subVectors(camTgt, camPos).cross(camera.up).normalize();
      const dist = camPos.distanceTo(camTgt);
      camTgt.addScaledVector(side, pointerEased.x * dist * 0.02);
      camTgt.y -= pointerEased.y * dist * 0.012;
    }
    const aspect = innerWidth / innerHeight;
    if (aspect < 1.6) {
      const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.6 / aspect);
      fov = Math.min(68, THREE.MathUtils.lerp(fov, THREE.MathUtils.radToDeg(h), 0.75));
    }
    camera.fov = fov;
    camera.aspect = aspect;
    // compose the subject opposite the copy: sideways on wide screens, upward on tall ones
    const W = innerWidth, H = innerHeight;
    if (aspect >= 1) camera.setViewOffset(W, H, -shift * W, 0, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.09, W, H);
    camera.updateProjectionMatrix();
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
  }

  // Stills for the Spaces section: the finished house at three hours.
  const STILLS = {
    terrace: { pos: [22, 5.3, -23], tgt: [1, 4.9, -5], fov: 36, env: { time: 19.5, mist: 0.06, interior: 0.45, fire: 0, veil: 0 } },
    hearth: { pos: [0.9, 5.35, 1.0], tgt: [-7.2, 4.85, 5.75], fov: 46, env: { time: 21.7, mist: 0.06, interior: 0.85, fire: 1, veil: 0.65 } },
    fog: { pos: [-46, -4, -72], tgt: [4, 1, 0], fov: 30, env: { time: 7.1, mist: 0.55, interior: 0.3, fire: 0, veil: 0 } },
    // Details at 1:1
    roofEdge: { pos: [20.6, 6.3, -12.9], tgt: [16.6, 7.75, -8.9], fov: 30, env: { time: 19.3, mist: 0.04, interior: 0.5, fire: 0, veil: 0 } },
    leather: { pos: [0.35, 4.78, 0.15], tgt: [-0.5, 4.58, 0.8], fov: 30, env: { time: 19.6, mist: 0.04, interior: 0.75, fire: 1, veil: 0 } },
    pool: { pos: [12.8, 4.3, -9.7], tgt: [10.2, 3.95, -7.6], fov: 34, env: { time: 19.4, mist: 0.04, interior: 0.4, fire: 0, veil: 0 } },
    stone: { pos: [-7.6, 3.8, -15.2], tgt: [-9.6, 3.0, -11.0], fov: 30, env: { time: 19.2, mist: 0.04, interior: 0.3, fire: 0, veil: 0 } },
    teak: { pos: [-3.05, 4.85, -7.05], tgt: [-3.95, 4.33, -6.25], fov: 34, env: { time: 19.4, mist: 0.04, interior: 0.4, fire: 0, veil: 0 } },
    fire: { pos: [-5.7, 4.98, 5.1], tgt: [-7.2, 4.84, 5.75], fov: 36, env: { time: 21.6, mist: 0.04, interior: 0.35, fire: 1, veil: 0 } },
  };
  let stillN = 0;
  function still(kind) {
    const c = STILLS[kind];
    const t = 40 + stillN++;
    house.update(1, 0, 0);
    aura.uSweep.value = 18;
    interior.root.visible = true;
    house.door.position.x = doorX;
    house.door.position.z = doorZ;
    land.group.visible = veg.visible = true;
    const sky = atmo.update({ studio: 0, time: c.env.time, mist: c.env.mist, worldR: 2800, voidOpacity: 0, now: t, forceEnv: true });
    interior.update(c.env, t);
    M.glassDark.emissive.copy(warmGlow).multiplyScalar(c.env.interior * (1 - sky.daylight) * 0.35);
    camera.clearViewOffset();
    camera.fov = c.fov;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    camera.position.set(...c.pos);
    camera.lookAt(...c.tgt);
    post.composer.render();
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // A day on the headland: the finished house from the sea at a scrolled hour.
  const day = { active: false, t: 0 };
  const dayFrom = new THREE.Vector3(-30, 9, -80), dayTo = new THREE.Vector3(-16, 7, -86);
  const dayTgt = new THREE.Vector3(3, 2.8, 0);
  function applyDay(t, time) {
    const hours = 5.4 + t * 18.0;
    house.update(1, 0);
    aura.uSweep.value = 18;
    aura.uTime.value = time;
    interior.root.visible = true;
    house.door.position.x = doorX;
    house.door.position.z = doorZ;
    land.group.visible = veg.visible = true;
    const S = THREE.MathUtils.smoothstep;
    const env = {
      time: hours,
      mist: 0.04 + 0.32 * (1 - S(hours, 5.6, 8.2)) + 0.05 * S(hours, 21, 23),
      interior: Math.max(0.55 * (1 - S(hours, 6.4, 7.4)), 0.95 * S(hours, 19.6, 20.8)),
      fire: S(hours, 20.0, 20.6),
      veil: 0,
    };
    const sky = atmo.update({ studio: 0, time: hours, mist: env.mist, worldR: 2800, voidOpacity: 0, now: time, dust: 0 });
    interior.update(env, time);
    M.glassDark.emissive.copy(warmGlow).multiplyScalar(env.interior * (1 - sky.daylight) * 0.5);
    M.textures.waves.normalMap.offset.set(time * 0.012, time * 0.007);
    if (post.ao) post.ao.enabled = false;
    camera.position.lerpVectors(dayFrom, dayTo, t);
    camera.position.y += Math.sin(time * 0.3) * 0.08;
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1.6
      ? Math.min(62, THREE.MathUtils.lerp(25, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(25) / 2) * 1.6 / camera.aspect)), 0.8))
      : 25;
    if (camera.aspect >= 1) camera.setViewOffset(innerWidth, innerHeight, -0.1 * innerWidth, 0, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.08, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
    camera.lookAt(dayTgt);
  }

  // Compile every program up front so reveals never hitch.
  mark('atmosphere');
  status('Polishing the glass', 0.86);
  apply(0, 0, 0.016);
  const hidden = [];
  scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  await renderer.compileAsync(scene, camera);
  hidden.forEach((o) => (o.visible = false));
  post.composer.render();
  mark('compiled');
  status('', 1);
  await nextFrame();
  document.getElementById('loader').classList.add('is-done');

  // ---- landing page: drawings, swatches and stills rendered from the live model
  const setBg = (el, url) => { el.style.backgroundImage = `url(${url})`; el.classList.add('is-ready'); };
  let swatchesDone = false, stillsDone = false;
  page = initPage({
    filmEnd,
    onDay: (active, t) => { day.active = active; day.t = t; },
    onReadySwatches: () => {
      if (swatchesDone) return;
      swatchesDone = true;
      const run = () => {
        const urls = renderSamples(renderer, M, scene.environment);
        document.querySelectorAll('[data-swatch]').forEach((li) => {
          const box = li.querySelector('.swatch__img');
          setBg(box.querySelector('i'), urls[li.dataset.swatch]);
          box.classList.add('is-ready');
        });
      };
      (window.requestIdleCallback || setTimeout)(run);
    },
    onReadyStills: () => {
      if (stillsDone) return;
      stillsDone = true;
      const shots = {};
      const go = () => {
        // stills need the canvas hidden behind the page; wait until it is
        if (!covered || day.active) { setTimeout(go, 250); return; }
        for (const kind of Object.keys(STILLS)) shots[kind] = still(kind);
        document.querySelectorAll('[data-still]').forEach((el) => setBg(el, shots[el.dataset.still]));
        document.querySelectorAll('[data-still-bg]').forEach((el) => setBg(el, shots[el.dataset.stillBg]));
      };
      go();
    },
  });
  setTimeout(() => page.heroIn(), 250);
  ScrollTrigger.refresh();
  // pinned sections measure their start from the content above them; re-measure
  // whenever that content changes height (web fonts arriving, images settling)
  let refreshTimer = 0;
  const remeasure = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 180); };
  document.fonts?.ready.then(remeasure);
  let lastH = 0;
  new ResizeObserver(() => {
    const h = document.getElementById('page').offsetHeight;
    if (Math.abs(h - lastH) > 2) { lastH = h; remeasure(); }
  }).observe(document.getElementById('page'));

  // ---- loop ----
  const clock = new THREE.Clock();
  let frameAcc = 0, frameCount = 0, lastFrameAt = 0, lastRaise = 0, ceiling = maxDpr;
  document.addEventListener('visibilitychange', () => { frameAcc = 0; frameCount = 0; lastFrameAt = 0; });
  readScroll();
  prog = target;

  function onResize() {
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    post.setSize(innerWidth, innerHeight, dpr);
  }
  addEventListener('resize', onResize);
  onResize();
  let sizeKey = '';
  let canvasShown = true;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    // the viewport can change before a resize event reaches us (hidden tabs, embeds)
    const key = `${innerWidth}x${innerHeight}`;
    if (key !== sizeKey) { sizeKey = key; onResize(); }
    // Lenis already eases the scroll; this only removes the last bit of jitter
    prog += (target - prog) * (1 - Math.exp(-dt * (reducedMotion ? 4.2 : 9)));
    pointerEased.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    // once the landing page covers the canvas there is nothing to draw,
    // except while the daylight section holds its window open onto the scene
    // the canvas is only shown where it is meant to be seen: the film, or the
    // daylight window; any gap between page sections shows the page colour
    const showCanvas = day.active || !covered;
    if (showCanvas !== canvasShown) { canvasShown = showCanvas; canvas.style.visibility = showCanvas ? 'visible' : 'hidden'; }
    if (day.active) applyDay(day.t, time);
    else if (covered && Math.abs(target - prog) < 1e-4) { lastFrameAt = 0; return; }
    else apply(prog, time, dt);
    post.grade.uniforms.uTime.value = time;
    post.composer.render();

    // adaptive resolution: drop detail when frames run long, recover after a
    // hitch, and stop climbing once a level has proven too slow
    const now = performance.now();
    if (!document.hidden && lastFrameAt > 0) { frameAcc += now - lastFrameAt; frameCount++; }
    lastFrameAt = now;
    if (frameCount >= 90) {
      const avg = frameAcc / frameCount;
      if (avg > 26 && dpr > 0.75) {
        if (now - lastRaise < 12000) ceiling = Math.max(0.75, dpr - 0.25);
        dpr = Math.max(0.75, dpr - 0.25);
        onResize();
      } else if (avg < 18.5 && dpr < ceiling) {
        dpr = Math.min(ceiling, dpr + 0.25);
        lastRaise = now;
        onResize();
      }
      frameAcc = 0; frameCount = 0;
    }
  });

  if (import.meta.env.DEV) {
    // Dev hook: render an exact scroll position synchronously (for capture in throttled tabs).
    window.__aura = {
      scene, camera, renderer, M, house, atmo, lenis,
      // jump the page to an element (fraction of its height) through Lenis
      go: async (sel, frac = 0, wait = 1800) => {
        const el = document.querySelector(sel);
        const y = el.getBoundingClientRect().top + scrollY + el.offsetHeight * frac;
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, wait));
        return Math.round(scrollY);
      },
      setProgress: (p) => { prog = target = p; },
      post,
      renderAt: (p, t = 10) => { prog = target = p; apply(p, t, 0.016); post.composer.render(); },
      renderDay: (t, time = 10) => { applyDay(t, time); post.composer.render(); },
    };
    // contact sheets of exact scroll positions, posted to a local capture server
    const send = (name, c) => fetch(`http://127.0.0.1:5299/save?name=${name}`, { method: 'POST', body: c.toDataURL('image/jpeg', 0.88) });
    window.__aura.sheet = async (list, name, cols = 3, w = 640) => {
      const h = Math.round((w * innerHeight) / innerWidth);
      const c = document.createElement('canvas');
      c.width = cols * w; c.height = Math.ceil(list.length / cols) * h;
      const g = c.getContext('2d');
      g.font = '600 18px sans-serif';
      list.forEach((p, i) => {
        window.__aura.renderAt(p);
        const x = (i % cols) * w, y = Math.floor(i / cols) * h;
        g.drawImage(canvas, x, y, w, h);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, 70, 26); g.fillStyle = '#fff'; g.fillText(p.toFixed(3), x + 6, y + 19);
      });
      await send(name, c);
      return name;
    };
    window.__aura.shot = async (p, name, w = 1440) => {
      window.__aura.renderAt(p);
      const c = document.createElement('canvas');
      c.width = w; c.height = Math.round((w * innerHeight) / innerWidth);
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
      await send(name, c);
      return name;
    };
  }
}

boot().catch((err) => {
  console.error(err);
  status('This browser could not start WebGL', 0);
});
