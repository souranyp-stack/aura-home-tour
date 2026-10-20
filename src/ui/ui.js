import { CHAPTERS } from '../story/timeline.js';

const NAMES = ['Prologue', 'Sculpture', 'Gravity', 'Matter', 'Ground', 'Threshold', 'Interior', 'Atmosphere'];
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const PRESETS = {
  dawn: { time: 6.85, interior: 0.25, fire: 0, mist: 0.42 },
  noon: { time: 13.0, interior: 0, fire: 0, mist: 0.06 },
  golden: { time: 19.3, interior: 0.5, fire: 1, mist: 0.06 },
  night: { time: 22.4, interior: 0.9, fire: 1, mist: 0.06 },
};

const fmtTime = (h) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export function createUI({ onJump }) {
  const $ = (id) => document.getElementById(id);
  const frames = [...document.querySelectorAll('.frame')].map((el) => ({
    el, a: parseFloat(el.dataset.in), b: parseFloat(el.dataset.out), live: false,
  }));

  // chapter rail
  const rail = $('rail');
  const railButtons = CHAPTERS.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span>${NAMES[i]}</span>${ROMAN[i]}`;
    b.setAttribute('aria-label', `Chapter ${ROMAN[i]}: ${NAMES[i]}`);
    b.addEventListener('click', () => onJump(c.p + 0.012));
    rail.appendChild(b);
    return b;
  });
  document.querySelectorAll('[data-jump]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      onJump(a.dataset.jump === '1' ? CHAPTERS[7].p + 0.03 : 0);
    });
  });
  $('requestViewing').addEventListener('click', (e) => {
    e.preventDefault();
    $('toast').hidden = false;
  });

  // environment controls: values the user sets, eased toward each frame
  const target = { time: 19.72, mist: 0.06, interior: 0.75, fire: 1, veil: 0 };
  const eased = { ...target };
  const timeIn = $('time'), lightIn = $('light'), veilIn = $('veil'), fireBtn = $('fire');
  const segButtons = [...document.querySelectorAll('.seg button')];
  const presetButtons = [...document.querySelectorAll('[data-preset]')];

  const fill = (input) => {
    const t = (input.value - input.min) / (input.max - input.min);
    input.style.setProperty('--fill', `${t * 100}%`);
  };
  const syncOutputs = () => {
    $('timeOut').textContent = fmtTime(target.time);
    $('lightOut').textContent = `${Math.round(target.interior * 100)}%`;
    $('veilOut').textContent = target.veil < 0.02 ? 'Open' : target.veil > 0.98 ? 'Drawn' : `${Math.round(target.veil * 100)}%`;
    fireBtn.setAttribute('aria-checked', String(target.fire > 0.5));
    segButtons.forEach((b) => b.setAttribute('aria-checked', String(Math.abs(parseFloat(b.dataset.mist) - target.mist) < 0.01)));
    $('mistOut').textContent = segButtons.find((b) => b.getAttribute('aria-checked') === 'true')?.textContent ?? '';
    timeIn.value = target.time; lightIn.value = target.interior; veilIn.value = target.veil;
    [timeIn, lightIn, veilIn].forEach(fill);
  };
  const clearPreset = () => presetButtons.forEach((b) => b.classList.remove('is-on'));
  timeIn.addEventListener('input', () => { target.time = parseFloat(timeIn.value); clearPreset(); syncOutputs(); });
  lightIn.addEventListener('input', () => { target.interior = parseFloat(lightIn.value); clearPreset(); syncOutputs(); });
  veilIn.addEventListener('input', () => { target.veil = parseFloat(veilIn.value); syncOutputs(); });
  fireBtn.addEventListener('click', () => { target.fire = target.fire > 0.5 ? 0 : 1; syncOutputs(); });
  segButtons.forEach((b) => b.addEventListener('click', () => { target.mist = parseFloat(b.dataset.mist); syncOutputs(); }));
  presetButtons.forEach((b) => b.addEventListener('click', () => {
    Object.assign(target, PRESETS[b.dataset.preset]);
    clearPreset();
    b.classList.add('is-on');
    syncOutputs();
  }));
  syncOutputs();

  const controlsEl = $('controls');
  const cue = $('cue');
  let lastChapter = -1;

  function update(p, dt, storyEnv, controlsWeight) {
    // story frames
    for (const f of frames) {
      const fadeIn = Math.min(1, Math.max(0, (p - f.a) / 0.018));
      const fadeOut = Math.min(1, Math.max(0, (f.b - p) / 0.018));
      const o = Math.min(fadeIn, fadeOut);
      const live = o > 0.001;
      if (live !== f.live) { f.el.classList.toggle('is-live', live); f.live = live; }
      if (live) {
        f.el.style.opacity = o.toFixed(3);
        f.el.style.transform = `translateY(${((1 - fadeIn) * 24 - (1 - fadeOut) * 24).toFixed(1)}px)`;
      }
    }
    // chapter label and rail
    let ch = 0;
    CHAPTERS.forEach((c, i) => { if (p >= c.p - 0.005) ch = i; });
    if (ch !== lastChapter) {
      lastChapter = ch;
      $('chapterNum').textContent = ROMAN[ch] === '0' ? '00' : ROMAN[ch];
      $('chapterName').textContent = NAMES[ch];
      railButtons.forEach((b, i) => b.classList.toggle('is-active', i === ch));
    }
    cue.style.opacity = p > 0.015 ? '0' : '1';
    controlsEl.classList.toggle('is-live', controlsWeight > 0.5);

    // ease user values (presets glide rather than jump)
    const k = 1 - Math.exp(-dt * 2.2);
    for (const key of Object.keys(target)) eased[key] += (target[key] - eased[key]) * k;

    // until the visitor reaches the controls, the story drives the environment
    const w = controlsWeight;
    const env = {};
    for (const key of Object.keys(target)) env[key] = storyEnv[key] + (eased[key] - storyEnv[key]) * w;
    $('clock').textContent = fmtTime(env.time);
    return env;
  }

  return { update };
}
