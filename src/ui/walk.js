import * as THREE from 'three';
import gsap from 'gsap';
import { createFloorPlan, PLACES, EYE } from '../world/walkPlan.js';
import { upperPlan, lowerPlan, planXY } from './drawings.js';
import { edgeZ } from '../world/landscape.js';

// Walking the house freely, outside the film. Drag to look; keys, the wheel, a
// click on the floor or the stick on a touch screen to move. It takes over the
// main canvas while it is open and hands everything back when it closes.

const HOURS = {
  dawn: { label: 'Dawn', time: 6.85, interior: 0.25, fire: 0, mist: 0.3 },
  noon: { label: 'Noon', time: 13, interior: 0, fire: 0, mist: 0.04 },
  golden: { label: 'Golden hour', time: 19.3, interior: 0.5, fire: 1, mist: 0.05 },
  night: { label: 'Night', time: 22.4, interior: 0.9, fire: 1, mist: 0.05 },
};
const WALK = 2.5, RUN = 5.4;
const FORWARD = new Set(['KeyW', 'ArrowUp']), BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']), RIGHT = new Set(['KeyD', 'ArrowRight']);

export function createWalk({ camera, scene, plantings, sound, onOpen, onClose }) {
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#walk');
  const veil = $('.walk__veil', root), surface = $('.walk__surface', root);
  const whereName = $('#walkWhere'), whereNote = $('#walkNote'), hint = $('.walk__hint', root);
  const plan = createFloorPlan(plantings);

  const state = { x: 0, z: 0, level: 'upper' };
  let yaw = 0, pitch = 0, yawGoal = 0, pitchGoal = 0, eyeY = 0;
  const vel = new THREE.Vector2();
  const keys = new Set();
  let run = false, wheelPush = 0, active = false, moved = false, goal = null, stuck = 0;
  const stick = new THREE.Vector2();
  const env = { ...HOURS.golden, veil: 0 };
  const envGoal = { ...HOURS.golden };

  // ---------------------------------------------------------------- a ring on the floor shows where a click will go
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.235, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffe7c2, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
  );
  ring.userData.noAO = true;
  ring.visible = false;
  scene.add(ring);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorHit = new THREE.Vector3();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const pickFloor = (e) => {
    const r = surface.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    floorPlane.constant = -plan.floorY(state.x, state.z, state.level);
    if (!ray.ray.intersectPlane(floorPlane, floorHit)) return null;
    if (Math.hypot(floorHit.x - state.x, floorHit.z - state.z) > 34) return null;
    return plan.canStand(floorHit.x, floorHit.z, state.level) ? floorHit : null;
  };

  // ---------------------------------------------------------------- map
  const mapHost = $('.walk__map', root);
  // one plan for each level, showing whichever you are on
  mapHost.innerHTML = upperPlan() + lowerPlan();
  const [upperSvg, lowerSvg] = mapHost.querySelectorAll('svg');
  const NS = 'http://www.w3.org/2000/svg';
  const makeYou = (svg) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = '<path class="walk__cone" d="M0,0 L-34,-52 A62,62 0 0 1 34,-52 Z"/><circle class="walk__dot" r="9"/>';
    svg.appendChild(g);
    return g;
  };
  const youUpper = makeYou(upperSvg), youLower = makeYou(lowerSvg);

  // ---------------------------------------------------------------- places and hours
  const placeHost = $('.walk__places', root), hourHost = $('.walk__hours', root);
  const placeButtons = PLACES.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    b.addEventListener('click', () => travel(p));
    placeHost.appendChild(b);
    return b;
  });
  const hourButtons = Object.entries(HOURS).map(([id, h]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = h.label;
    b.addEventListener('click', () => setHour(id));
    hourHost.appendChild(b);
    return { id, b };
  });
  // ---------------------------------------------------------------- the switches
  const switchHost = $('.walk__switches', root);
  const makeSwitch = (onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', onClick);
    switchHost.appendChild(b);
    return b;
  };
  let doorGoal = 1, doorNow = 1, curtainGoal = 0;
  const outsideBtn = makeSwitch(() => sound.toggleChannel('outside'));
  const fireBtn = makeSwitch(() => sound.toggleChannel('fire'));
  const doorBtn = makeSwitch(() => { doorGoal = doorGoal ? 0 : 1; syncSwitches(); });
  const curtainBtn = makeSwitch(() => { curtainGoal = curtainGoal ? 0 : 1; syncSwitches(); });
  function syncSwitches() {
    const s = sound.state;
    const outsideOn = s.enabled && s.outside, fireOn = s.enabled && s.fire;
    outsideBtn.textContent = outsideOn ? 'Mute outside' : 'Unmute outside';
    outsideBtn.classList.toggle('is-on', outsideOn);
    outsideBtn.setAttribute('aria-pressed', outsideOn);
    fireBtn.textContent = fireOn ? 'Mute fire' : 'Unmute fire';
    fireBtn.classList.toggle('is-on', fireOn);
    fireBtn.setAttribute('aria-pressed', fireOn);
    fireBtn.disabled = envGoal.fire === 0;
    fireBtn.title = envGoal.fire === 0 ? 'The fire is out at this hour' : '';
    doorBtn.textContent = doorGoal ? 'Close glass door' : 'Open glass door';
    doorBtn.classList.toggle('is-on', !!doorGoal);
    doorBtn.setAttribute('aria-pressed', !!doorGoal);
    curtainBtn.textContent = curtainGoal ? 'Open curtains' : 'Close curtains';
    curtainBtn.classList.toggle('is-on', !!curtainGoal);
    curtainBtn.setAttribute('aria-pressed', !!curtainGoal);
  }

  function setHour(id) {
    Object.assign(envGoal, HOURS[id]);
    syncSwitches();
    hourButtons.forEach((h) => h.b.classList.toggle('is-on', h.id === id));
  }
  setHour('golden');

  function stand(place) {
    state.x = place.at[0];
    state.z = place.at[1];
    state.level = place.level;
    eyeY = plan.floorY(state.x, state.z, state.level) + EYE;
    const [lx, ly, lz] = place.look;
    yaw = yawGoal = Math.atan2(state.x - lx, state.z - lz);
    pitch = pitchGoal = Math.atan2(ly - eyeY, Math.hypot(lx - state.x, lz - state.z));
    vel.set(0, 0);
    goal = null;
    placeButtons.forEach((b, i) => b.classList.toggle('is-on', PLACES[i] === place));
  }
  function travel(place) {
    gsap.to(veil, {
      opacity: 1, duration: 0.3, ease: 'power2.in', onComplete: () => {
        stand(place);
        gsap.to(veil, { opacity: 0, duration: 0.65, delay: 0.05, ease: 'power2.out' });
      },
    });
  }

  // ---------------------------------------------------------------- open and close
  function open(placeId = 'pool') {
    if (active) return;
    active = true;
    stand(PLACES.find((p) => p.id === placeId) || PLACES[0]);
    keys.clear();
    moved = false;
    hint.classList.remove('is-gone');
    root.hidden = false;
    onOpen();
    sound.startIfWelcome();
    syncSwitches();
    document.body.classList.add('is-walking');
    gsap.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 1.1, delay: 0.15, ease: 'power2.out' });
    gsap.fromTo($$('.walk__ui > *'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.5, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity' });
    $('.walk__leave', root).focus({ preventScroll: true });
    dispatchEvent(new Event('aura:walking'));
  }
  const $$ = (s) => [...root.querySelectorAll(s)];
  function close() {
    if (!active) return;
    gsap.to(veil, {
      opacity: 1, duration: 0.35, ease: 'power2.in', onComplete: () => {
        active = false;
        ring.visible = false;
        root.hidden = true;
        document.body.classList.remove('is-walking');
        onClose();
        dispatchEvent(new Event('aura:walking'));
      },
    });
  }
  $('.walk__leave', root).addEventListener('click', close);
  document.querySelectorAll('[data-walk]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(el.dataset.walk || 'pool'); }));

  // ---------------------------------------------------------------- keyboard
  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.code === 'Escape') { close(); return; }
    if (e.code === 'KeyM') sound.toggle();
    if (e.target.closest?.('button') && (e.code === 'Space' || e.code === 'Enter')) return;
    if (FORWARD.has(e.code) || BACK.has(e.code) || LEFT.has(e.code) || RIGHT.has(e.code) || e.code === 'Space' || e.code === 'PageDown' || e.code === 'PageUp') e.preventDefault();
    keys.add(e.code);
    run = e.shiftKey;
    goal = null;
  });
  addEventListener('keyup', (e) => { keys.delete(e.code); run = e.shiftKey; });
  addEventListener('blur', () => keys.clear());

  // ---------------------------------------------------------------- looking and clicking
  let dragId = null, startX = 0, startY = 0, lastX = 0, lastY = 0, dragged = false;
  surface.addEventListener('pointerdown', (e) => {
    dragId = e.pointerId;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    dragged = false;
    surface.setPointerCapture(dragId);
    surface.classList.add('is-looking');
  });
  surface.addEventListener('pointermove', (e) => {
    if (dragId === e.pointerId) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) dragged = true;
      // the view follows the hand, like dragging the world around you
      const speed = (camera.fov / innerHeight) * (Math.PI / 180) * 1.05;
      yawGoal += (e.clientX - lastX) * speed;
      pitchGoal = THREE.MathUtils.clamp(pitchGoal + (e.clientY - lastY) * speed, -1.25, 1.25);
      lastX = e.clientX;
      lastY = e.clientY;
      if (dragged) ring.visible = false;
    } else if (e.pointerType === 'mouse') {
      const hit = pickFloor(e);
      ring.visible = !!hit;
      if (hit) ring.position.set(hit.x, hit.y + 0.05, hit.z);
    }
  });
  const release = (e) => {
    if (dragId !== e.pointerId) return;
    dragId = null;
    surface.classList.remove('is-looking');
    if (!dragged) {
      const hit = pickFloor(e);
      if (hit) { goal = { x: hit.x, z: hit.z }; stuck = 0; noteMoved(); }
    }
  };
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);
  surface.addEventListener('pointerleave', () => { ring.visible = false; });
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelPush = THREE.MathUtils.clamp(wheelPush - e.deltaY * 0.0035, -2, 2);
    goal = null;
  }, { passive: false });

  // ---------------------------------------------------------------- the stick on touch screens
  const stickEl = $('.walk__stick', root), knob = $('i', stickEl);
  let stickId = null;
  const stickMove = (e) => {
    const r = stickEl.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.max(1, Math.hypot(x, y));
    stick.set(x / len, y / len);
    knob.style.transform = `translate(${(stick.x * r.width * 0.3).toFixed(1)}px, ${(stick.y * r.height * 0.3).toFixed(1)}px)`;
  };
  stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(stickId); stickMove(e); goal = null; });
  stickEl.addEventListener('pointermove', (e) => { if (stickId === e.pointerId) stickMove(e); });
  const stickEnd = (e) => { if (stickId !== e.pointerId) return; stickId = null; stick.set(0, 0); knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', stickEnd);
  stickEl.addEventListener('pointercancel', stickEnd);

  function noteMoved() {
    if (moved) return;
    moved = true;
    hint.classList.add('is-gone');
  }

  // ---------------------------------------------------------------- each frame
  const wish = new THREE.Vector2();
  let lastWhere = '';
  function update(dt) {
    wish.set(0, 0);
    const has = (set) => [...set].some((k) => keys.has(k));
    if (has(FORWARD)) wish.y += 1;
    if (has(BACK)) wish.y -= 1;
    if (has(RIGHT)) wish.x += 1;
    if (has(LEFT)) wish.x -= 1;
    wish.x += stick.x;
    wish.y -= stick.y;
    if (Math.abs(wheelPush) > 0.01) { wish.y += wheelPush; wheelPush *= Math.exp(-dt * 5); }
    if (wish.lengthSq() > 1) wish.normalize();
    if (wish.lengthSq() > 0.001) noteMoved();

    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    // the world direction to go, from the wish relative to the view
    let wx = wish.x * cos - wish.y * sin, wz = -wish.x * sin - wish.y * cos;
    if (goal) {
      const dx = goal.x - state.x, dz = goal.z - state.z, d = Math.hypot(dx, dz);
      if (d < 0.14 || stuck > 0.5) goal = null;
      else { wx = dx / d; wz = dz / d; }
    }
    const speed = run ? RUN : WALK;
    const ease = 1 - Math.exp(-dt * (wx || wz ? 9 : 12));
    vel.x += (wx * speed - vel.x) * ease;
    vel.y += (wz * speed - vel.y) * ease;
    const px = state.x, pz = state.z;
    plan.move(state, vel.x * dt, vel.y * dt);
    if (goal) {
      const went = Math.hypot(state.x - px, state.z - pz);
      stuck = went < vel.length() * dt * 0.35 ? stuck + dt : 0;
    }

    const look = 1 - Math.exp(-dt * 14);
    yaw += (yawGoal - yaw) * look;
    pitch += (pitchGoal - pitch) * look;
    // steps feel like steps, and the head settles rather than snapping to each level
    const eye = plan.floorY(state.x, state.z, state.level) + EYE;
    eyeY += (eye - eyeY) * (1 - Math.exp(-dt * 9));

    // the hour turns over gently when it is changed
    const k = 1 - Math.exp(-dt * 2.2);
    env.time += (envGoal.time - env.time) * k;
    env.interior += (envGoal.interior - env.interior) * k;
    env.fire += (envGoal.fire - env.fire) * k;
    env.mist += (envGoal.mist - env.mist) * k;

    env.veil += (curtainGoal - env.veil) * (1 - Math.exp(-dt * 1.9));
    // the door slides unhurriedly, and waits if someone is standing in the way
    const wantDoor = doorGoal === 0 && plan.inSeaDoorway(state.x, state.z) ? 1 : doorGoal;
    const doorStep = dt / 1.25;
    doorNow = wantDoor > doorNow ? Math.min(wantDoor, doorNow + doorStep) : Math.max(wantDoor, doorNow - doorStep);
    plan.setSeaDoor(doorNow > 0.9);

    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.position.set(state.x, eyeY, state.z);

    const where = plan.whereIs(state.x, state.z, state.level);
    if (where.name !== lastWhere) {
      lastWhere = where.name;
      whereName.textContent = where.name;
      whereNote.textContent = where.note;
      gsap.fromTo([whereName, whereNote], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' });
    }
    const [mx, my] = planXY(state.x, state.z);
    const below = state.level !== 'upper' && !(state.level === 'inside' && state.x > -3.6) && !(state.level === 'stair' && state.z < 13);
    upperSvg.style.display = below ? 'none' : '';
    lowerSvg.style.display = below ? '' : 'none';
    (below ? youLower : youUpper).setAttribute('transform', `translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${(180 - (yaw * 180) / Math.PI).toFixed(1)})`);
  }

  // How everything sounds from where you are standing.
  function hearing() {
    const { x, z, level } = state;
    const indoors = plan.isIndoors(x, z, level);
    // the sea is loudest at the edge and fades as you walk inland
    const seaward = Math.max(0.28, Math.min(1.1, 1.15 - Math.max(0, z - edgeZ(x)) / 80));
    let outside = seaward, muffle = 0;
    if (level === 'lower' || (level === 'inside' && x < -3.6)) {
      const nearDoor = Math.exp(-Math.hypot(x - 3, z - 9.9) / 2.6);
      outside = 0.1 + 0.3 * nearDoor;
      muffle = 1 - 0.3 * nearDoor;
    } else if (indoors) {
      // through the glass, or through the open door if you are near it
      const open = doorNow * Math.exp(-Math.hypot(x - 2.25, z + 4) / 7);
      outside = 0.11 + 0.55 * open;
      muffle = 1 - 0.75 * open;
    }
    let fire = 0, fireMuffle = 0, pan = 0;
    if (level === 'upper' || (level === 'inside' && x > -3.6)) {
      const dx = -6.9 - x, dz = 5.75 - z, d = Math.hypot(dx, dz);
      fire = env.fire * Math.min(1, 3 / (1 + d * d * 0.2));
      if (!indoors) { fire *= 0.35 + 0.65 * doorNow * Math.exp(-Math.hypot(x - 2.25, z + 4) / 3); fireMuffle = 0.8; }
      if (d > 0.01) pan = Math.max(-0.8, Math.min(0.8, ((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d) * 0.8));
    }
    return { outside, muffle, fire, fireMuffle, pan };
  }

  return {
    update, open, close, stand, env, state, hearing, syncSwitches,
    get doorAmount() { return doorNow; },
    get active() { return active; },
  };
}
