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

const mobile = matchMedia('(max-width: 900px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const maxDpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75);
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
let target = 0;
let prog = 0;
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
const readScroll = () => { const m = maxScroll(); target = m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; };
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

  const ui = createUI({
    onJump: (p) => window.scrollTo({ top: p * maxScroll(), behavior: reducedMotion ? 'auto' : 'smooth' }),
  });

  const doorX = house.door.position.x;
  const doorZ = house.door.position.z;
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const side = new THREE.Vector3();
  const warmGlow = new THREE.Color(1.0, 0.72, 0.45);

  function apply(p, time, dt) {
    const s = storyAt(p);
    house.update(s.assemble, reducedMotion ? 0 : time, reducedMotion ? 0 : dt);
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
    });
    interior.update(env, time);
    land.group.visible = veg.visible = s.worldR > 1;

    // lit rooms read from outside after dark
    M.glassDark.emissive.copy(warmGlow).multiplyScalar(env.interior * (1 - sky.daylight) * 0.35);
    M.textures.waves.normalMap.offset.set(time * 0.012, time * 0.007);

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

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    // the viewport can change before a resize event reaches us (hidden tabs, embeds)
    const key = `${innerWidth}x${innerHeight}`;
    if (key !== sizeKey) { sizeKey = key; onResize(); }
    prog += (target - prog) * (1 - Math.exp(-dt * 4.2));
    pointerEased.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    apply(prog, time, dt);
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
      scene, camera, renderer, M, house, atmo,
      setProgress: (p) => { prog = target = p; },
      post,
      renderAt: (p, t = 10) => { prog = target = p; apply(p, t, 0.016); post.composer.render(); },
    };
  }
}

boot().catch((err) => {
  console.error(err);
  status('This browser could not start WebGL', 0);
});
