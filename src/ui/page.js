import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { upperPlan, lowerPlan, sectionAA, approachMap, paperSheet, sunDial, dialAngle, DIAL } from './drawings.js';
import { sunDirection } from '../world/atmosphere.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

// Landing-page choreography. One easing family throughout (expo.out for
// entrances, linear scrub for anything tied to the scrollbar) so the motion
// reads as one hand rather than a collection of effects.

const EASE = 'expo.out';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPage({ filmEnd, onReadyStills, onReadySwatches, onDay = () => {} }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------------------------------------------------------------- drawings
  $('#planUpper').innerHTML = upperPlan();
  $('#planLower').innerHTML = lowerPlan();
  const sectionFig = $('#sectionDraw');
  sectionFig.insertAdjacentHTML('afterbegin', sectionAA());
  // on a phone the drawing scrolls sideways at a legible scale: open it on the house
  sectionFig.scrollLeft = sectionFig.scrollWidth * 0.55 - sectionFig.clientWidth / 2;
  $('#approachMap').innerHTML = approachMap();

  // ---------------------------------------------------------------- a day on the headland
  // The section is a window onto the live scene: while it is on screen the
  // renderer draws the house at the hour set by scroll position.
  const SUNRISE = 6.4, SUNSET = 20.1;
  const MOMENTS = [
    [5.0, 'First light. The sea turns pewter before the sky does.'],
    [7.2, 'Morning. Sun on the spine wall; the terrace still in shade.'],
    [11.0, 'Noon. The deep roof keeps the glass in its own shadow.'],
    [15.0, 'Afternoon. The stone has stored the heat and starts to give it back.'],
    [18.6, 'Golden hour. The western face turns the colour of the cliff.'],
    [20.2, 'Blue hour. The house begins to glow from inside.'],
    [21.4, 'Night. A lantern on the headland.'],
  ];
  const DAY_FROM = 5.4, DAY_TO = 23.4;
  // the dial's sky at each hour: zenith, mid sky, horizon, the sea below it, the sun's halo
  const DIAL_SKY = [
    [5.4, '#151c2c', '#3a4356', '#7c8290', '#3c424e', '#9fb3d8'],
    [6.4, '#2d3a58', '#8a7f8c', '#eda987', '#6d5a56', '#ffc79a'],
    [8.0, '#44709c', '#8fb2c8', '#dfe6e0', '#4e6a78', '#fff0d0'],
    [13.25, '#2f6698', '#6d9fc4', '#c2dae6', '#3f6377', '#fff6e0'],
    [17.0, '#3d6a94', '#86a5b6', '#ecd9ae', '#5b6a68', '#ffe6b0'],
    [19.0, '#3f4d70', '#a9846f', '#f4a95f', '#70533c', '#ffbe70'],
    [20.1, '#262b4c', '#7c4f60', '#e5704a', '#5a3530', '#ff8f58'],
    [20.9, '#121832', '#26305a', '#47567f', '#1f2740', '#7c8cc0'],
    [22.0, '#070a18', '#0d1328', '#172038', '#0e1422', '#7c8cc0'],
    [23.4, '#05070f', '#090d1c', '#10172a', '#0a0e18', '#7c8cc0'],
  ];
  $('#dayDial').innerHTML = sunDial({ sunrise: SUNRISE, sunset: SUNSET, from: DAY_FROM, to: DAY_TO });
  const dayClock = $('#dayClock'), dayMoment = $('#dayMoment');
  const dial = Object.fromEntries(['SkyTop', 'SkyMid', 'SkyLow', 'SeaTop', 'Stars', 'Moon', 'Ray', 'Sun', 'Glass', 'Glint', 'Value', 'Caption', 'Alt', 'Done', 'Pointer'].map((k) => [k, $(`#dial${k}`)]));
  const dialHalo = $$('.dial__halo');
  const dialTicks = $$('.dial__tick').map((el) => ({ el, h: +el.dataset.h }));
  const { C, ORBIT } = DIAL;
  const clamp01 = gsap.utils.clamp(0, 1);
  const ramp = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const dialSky = (h) => {
    let i = 0;
    while (i < DIAL_SKY.length - 2 && h > DIAL_SKY[i + 1][0]) i++;
    const a = DIAL_SKY[i], b = DIAL_SKY[i + 1], t = clamp01((h - a[0]) / (b[0] - a[0]));
    return a.slice(1).map((c, n) => gsap.utils.interpolate(c, b[n + 1], t));
  };
  const span = (hrs) => {
    const min = Math.floor(hrs * 60);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  };
  let dialLit = -1;
  const showDial = (hours) => {
    const [top, mid, low, sea, halo] = dialSky(hours);
    dial.SkyTop.setAttribute('stop-color', top);
    dial.SkyMid.setAttribute('stop-color', mid);
    dial.SkyLow.setAttribute('stop-color', low);
    dial.SeaTop.setAttribute('stop-color', sea);
    dialHalo.forEach((stop) => stop.setAttribute('stop-color', halo));

    const deg = dialAngle(hours), a = (deg * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
    const alt = (Math.asin(sunDirection(hours).y) * 180) / Math.PI;
    dial.Sun.setAttribute('transform', `translate(${(C + ORBIT * s).toFixed(1)} ${(C - ORBIT * c).toFixed(1)})`);
    dial.Moon.setAttribute('transform', `translate(${(C - ORBIT * s).toFixed(1)} ${(C + ORBIT * c).toFixed(1)}) rotate(${(deg * 0.5 - 30).toFixed(1)})`);
    dial.Moon.style.opacity = (1 - ramp(alt, -5, 7)).toFixed(3);
    dial.Stars.setAttribute('transform', `rotate(${deg.toFixed(1)} ${C} ${C})`);
    dial.Stars.style.opacity = (1 - ramp(alt, -14, -3)).toFixed(3);
    dial.Ray.setAttribute('transform', `rotate(${deg.toFixed(1)} ${C} ${C})`);
    dial.Pointer.setAttribute('transform', `rotate(${deg.toFixed(1)} ${C} ${C})`);
    // the same evening and dawn lighting as the interior in the scene
    dial.Glass.style.opacity = Math.max(0.55 * (1 - ramp(hours, 6.4, 7.4)), 0.95 * ramp(hours, 19.6, 20.8)).toFixed(3);
    // the sun lays a path on the water when it is low
    dial.Glint.setAttribute('transform', `translate(${(C + ORBIT * s).toFixed(1)} ${(C - ORBIT * Math.cos((dialAngle(SUNRISE) * Math.PI) / 180)).toFixed(1)})`);
    dial.Glint.style.opacity = (ramp(alt, -5, 0) * (1 - ramp(alt, 14, 34)) * 0.95).toFixed(3);

    const before = hours < SUNRISE, day = !before && hours < SUNSET;
    dial.Value.textContent = span(before ? SUNRISE - hours : day ? SUNSET - hours : 24 + SUNRISE - hours);
    dial.Caption.textContent = day ? 'until sunset' : 'until sunrise';
    dial.Alt.textContent = `sun ${alt < 0 ? '−' : '+'}${Math.abs(alt).toFixed(0)}°`;

    gsap.set(dial.Done, { drawSVG: `0% ${(((hours - DAY_FROM) / (DAY_TO - DAY_FROM)) * 100).toFixed(2)}%` });
    const lit = Math.floor(hours * 4);
    if (lit !== dialLit) {
      dialLit = lit;
      dialTicks.forEach(({ el, h }) => el.classList.toggle('is-lit', h >= DAY_FROM - 0.25 && h * 4 <= lit));
    }
  };
  let dayActive = false, dayT = 0, lastMoment = '';
  const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  const showDay = () => {
    const hours = DAY_FROM + dayT * (DAY_TO - DAY_FROM);
    dayClock.textContent = fmt(hours);
    showDial(hours);
    let m = MOMENTS[0][1];
    for (const [h, txt] of MOMENTS) if (hours >= h) m = txt;
    if (m !== lastMoment) {
      lastMoment = m;
      gsap.to(dayMoment, { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in', onComplete: () => {
        dayMoment.textContent = m;
        gsap.fromTo(dayMoment, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: EASE });
      } });
    }
    onDay(dayActive, dayT);
  };
  ScrollTrigger.create({ trigger: '#daylight', start: 'top bottom', end: 'bottom top', onToggle: (st) => { dayActive = st.isActive; onDay(dayActive, dayT); } });
  ScrollTrigger.create({ trigger: '#daylight', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (st) => { dayT = st.progress; showDay(); } });
  showDay();

  // ---------------------------------------------------------------- the drawing: a folded sheet opens into a big plan
  {
    const paper = $('#paper');
    const svg = paperSheet();
    const panels = [];
    let parent = paper;
    for (let i = 0; i < 4; i++) {
      const f = document.createElement('div');
      f.className = `fold${i ? ' fold--child' : ''}`;
      f.innerHTML = `<div class="fold__face fold__front">${svg.replace('viewBox="0 0 1600 1000"', `viewBox="${i * 400} 0 400 1000"`)}</div><div class="fold__face fold__back"></div><i class="fold__shade"></i>`;
      parent.appendChild(f);
      panels.push(f);
      parent = f;
    }
    // accordion: each panel folds back on its neighbour, alternating, a few
    // degrees short of flat so the packet has the thickness of real paper
    const FOLDED = [0, 179.4, -179.4, 179.4];
    const WINDOWS = [null, [0.14, 0.36], [0.26, 0.48], [0.38, 0.6]];
    const ease = gsap.parseEase('power2.inOut');
    const st = (p, a, b) => { const t = Math.min(1, Math.max(0, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
    let pw = 300, phone = false;
    const size = () => {
      phone = innerWidth <= 900;
      pw = phone ? Math.min(innerHeight * 0.205, innerWidth * 0.36) : Math.min(innerWidth * 0.23, innerHeight * 0.32);
      paper.style.setProperty('--pw', `${pw.toFixed(1)}px`);
    };
    size();
    addEventListener('resize', size);

    // ink: the title block is printed from the start (it is the cover when
    // folded); the plan itself is drawn as the sheet opens; notes come last
    const plan = '.fold__front .paper-svg > svg.drw:last-of-type';
    const strokes = $$(`${plan} :is(line, rect, polyline, polygon, circle, path)`, paper).filter((n) => !n.closest('pattern'));
    const fills = $$(`${plan} :is(.f-hatch, .l-solid, .f-water)`, paper);
    const words = $$(`${plan} text`, paper);
    const notes = $$('.fold__front .notes path', paper);
    const noteText = $$('.fold__front .notes text', paper);
    const ink = gsap.timeline({ paused: true })
      .fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 0.6, stagger: { amount: 0.4 } }, 0)
      .fromTo(fills, { fillOpacity: 0 }, { fillOpacity: 1, ease: 'none', duration: 0.25 }, 0.6)
      .fromTo(words, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.2, stagger: { amount: 0.2 } }, 0.55);
    const pen = gsap.timeline({ paused: true })
      .fromTo(notes, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 1, stagger: 0.12 }, 0)
      .fromTo(noteText, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.5, stagger: 0.2 }, 0.3);

    const copy = $('.sheet__copy'), hint = $('.sheet__hint');
    const setSheet = (p) => {
      let U = 0;
      for (let i = 1; i < 4; i++) {
        const u = ease(st(p, ...WINDOWS[i]));
        U += u / 3;
        const ang = FOLDED[i] * (1 - u);
        panels[i].style.transform = `rotateY(${ang.toFixed(2)}deg)`;
        panels[i].style.setProperty('--shade', (0.24 * (1 - Math.cos((ang * Math.PI) / 180)) / 2).toFixed(3));
      }
      const arrive = st(p, 0, 0.16), flat = st(p, 0.55, 0.8), zoom = st(p, 0.86, 1);
      const c = pw / 2 + 1.5 * pw * U;
      gsap.set(paper, {
        transformOrigin: `${c.toFixed(1)}px 50%`,
        // folded, the packet sits to the right of the copy; it moves to centre as it opens
        x: -1.5 * pw * U + (phone ? 0 : innerWidth * 0.14 * (1 - U)),
        y: (1 - arrive) * innerHeight * 0.5 + (1 - flat) * innerHeight * 0.06 + (phone ? innerHeight * 0.08 * (1 - flat) : 0),
        rotationX: 40 * (1 - flat),
        rotation: -7 * (1 - flat) + (phone ? 90 * flat : 0),
        scale: (0.62 + 0.38 * flat) * (1 + (phone ? 0 : 0.12) * zoom),
        opacity: arrive,
      });
      paper.style.setProperty('--drop', (0.6 - 0.25 * flat).toFixed(2));
      paper.style.setProperty('--span', (1 + 3 * U).toFixed(3));
      ink.progress(st(p, 0.18, 0.84));
      pen.progress(st(p, 0.8, 0.98));
      copy.style.opacity = (1 - st(p, 0.42, 0.58)).toFixed(3);
      hint.style.opacity = (1 - st(p, 0.06, 0.18)).toFixed(3);
    };
    // with reduced motion the sheet is simply shown open
    if (reduced) setSheet(1);
    else {
      setSheet(0);
      ScrollTrigger.create({ trigger: '#sheet', pin: '.sheet__pin', start: 'top top', end: '+=300%', scrub: 0.7, onUpdate: (t) => setSheet(t.progress), onRefresh: (t) => setSheet(t.progress) });
    }
  }

  if (reduced) {
    onReadySwatches();
    onReadyStills();
    return { heroIn: () => {}, frameIn: () => {} };
  }

  const mm = gsap.matchMedia();

  // ---------------------------------------------------------------- split headings
  $$('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 112, duration: 1.5, ease: EASE, stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }),
    });
  });

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1.4, ease: EASE, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // section rules draw in from the left
  $$('.sec').forEach((sec) => {
    gsap.fromTo(sec, { '--rule': 0 }, { '--rule': 1, duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: sec, start: 'top 90%', once: true } });
  });

  // ---------------------------------------------------------------- manifesto
  const man = $('#manifesto');
  const words = SplitText.create(man, { type: 'words', wordsClass: 'w' }).words;
  words.forEach((w) => { if (/always|horizon/i.test(w.textContent)) w.classList.add('is-key'); });
  gsap.to(words, {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.manifesto', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  gsap.from('.manifesto__label', { opacity: 0, x: -24, duration: 1.2, ease: EASE, scrollTrigger: { trigger: man, start: 'top 85%', once: true } });

  // ---------------------------------------------------------------- counters
  const countUp = (el, delay = 0) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    el.textContent = (0).toFixed(dec);
    return gsap.to(o, { v: end, duration: 2.2, delay, ease: 'power3.out', onUpdate: () => (el.textContent = o.v.toFixed(dec)) });
  };
  const facts = $$('#facts > div');
  ScrollTrigger.create({
    trigger: '#facts', start: 'top 85%', once: true,
    onEnter: () => {
      gsap.fromTo(facts, { '--draw': 0 }, { '--draw': 1, duration: 1.6, ease: 'power3.inOut', stagger: 0.07 });
      gsap.from(facts.map((f) => f.children), { y: 24, opacity: 0, duration: 1.3, ease: EASE, stagger: 0.05, delay: 0.2 });
      facts.forEach((f, i) => countUp($('b', f), 0.25 + i * 0.07));
    },
  });
  const climate = $$('.climate li');
  ScrollTrigger.create({
    trigger: '.climate', start: 'top 85%', once: true,
    onEnter: () => {
      gsap.fromTo(climate, { '--draw': 0 }, { '--draw': 1, duration: 1.6, ease: 'power3.inOut', stagger: 0.1 });
      gsap.from(climate.map((li) => li.children), { y: 28, opacity: 0, duration: 1.3, ease: EASE, stagger: 0.06, delay: 0.15 });
      climate.forEach((li, i) => countUp($('[data-count]', li), 0.2 + i * 0.1));
    },
  });

  // ---------------------------------------------------------------- drawings draw themselves
  const drawOn = (fig, start = 'top 80%', end = 'bottom 55%') => {
    const svg = $('svg', fig);
    // drawSVG takes over the dash array, so dashed lines fade in with the labels instead
    const lines = $$('line, rect, polyline, polygon, circle', svg).filter((n) => !n.closest('pattern'));
    const isDashed = (n) => getComputedStyle(n).strokeDasharray !== 'none';
    const strokes = lines.filter((n) => !isDashed(n));
    const dashed = lines.filter(isDashed);
    const fills = $$('.f-hatch, .l-solid, .f-water, .f-conc, .f-wall, .f-bronze, .f-fire, .f-light, .g-rock, .l-glass2, polygon[fill]', svg);
    const labels = [...$$('text', svg), ...dashed];
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start, end, scrub: 0.8 } });
    tl.fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: { amount: 0.6 }, duration: 0.5 }, 0)
      .fromTo(fills, { fillOpacity: 0 }, { fillOpacity: 1, ease: 'none', duration: 0.3, stagger: { amount: 0.2 } }, 0.55)
      .fromTo(labels, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.2, stagger: { amount: 0.25 } }, 0.7);
  };
  // the section is finished by the time it fills the screen, so its notes can be read
  drawOn(sectionFig, 'top 85%', 'top 12%');
  $$('.plan').forEach((p) => drawOn(p, 'top 85%', 'bottom 70%'));

  // the dial assembles as the section arrives: the case, then the minute track round the ring
  const dialIn = { trigger: '#daylight', start: 'top 45%', toggleActions: 'play none none reverse' };
  gsap.from('#dayDial', { scale: 0.84, opacity: 0, rotation: -14, duration: 1.5, ease: EASE, scrollTrigger: dialIn });
  gsap.from('.dial__tick', { opacity: 0, duration: 0.4, ease: 'none', stagger: { amount: 1 }, scrollTrigger: dialIn });

  // ---------------------------------------------------------------- materials: pinned horizontal gallery
  mm.add('(min-width: 901px)', () => {
    const track = $('#swatches');
    const pin = $('.materials__pin');
    const distance = () => track.scrollWidth - (pin.clientWidth - track.offsetLeft) + innerWidth * 0.06;
    const slide = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '#materials', pin, start: 'top top', end: () => `+=${distance()}`, scrub: 0.9, invalidateOnRefresh: true,
        onUpdate: (st) => { $('#matIndex').textContent = String(1 + Math.min(5, Math.floor(st.progress * 6))).padStart(2, '0'); },
      },
    });
    $$('#swatches li').forEach((li) => {
      gsap.fromTo($('.swatch__img i', li), { '--px': '7%' }, {
        '--px': '-7%', ease: 'none',
        scrollTrigger: { trigger: li, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
      });
    });
    // cards rise in sequence as the gallery arrives; those still off-screen slide in already settled
    gsap.from($$('#swatches li'), {
      y: 80, opacity: 0, duration: 1.4, ease: EASE, stagger: 0.09,
      scrollTrigger: { trigger: '#materials', start: 'top 65%', once: true },
    });
  });

  // ---------------------------------------------------------------- spaces: windows open, images settle
  $$('.still').forEach((fig) => {
    const frame = $('.still__frame', fig);
    const img = $('.still__img', fig);
    gsap.fromTo(frame, { '--clip': '14%' }, { '--clip': '0%', ease: 'none', scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 35%', scrub: 0.6 } });
    gsap.fromTo(img, { '--zoom': 1.28 }, { '--zoom': 1.02, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo(img, { '--py': '-4%' }, { '--py': '4%', ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($('figcaption', fig), { y: 20, opacity: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: fig, start: 'top 70%', once: true } });
  });

  // ---------------------------------------------------------------- details: windows open from the centre, a lens follows the cursor
  $$('.detail').forEach((fig, i) => {
    const frame = $('.detail__frame', fig);
    const img = $('.detail__img', fig);
    gsap.fromTo(frame, { '--clip': '18%' }, { '--clip': '0%', duration: 1.6, ease: 'power3.inOut', delay: (i % 3) * 0.08, scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
    gsap.from($('figcaption', fig), { y: 20, opacity: 0, duration: 1.2, ease: EASE, delay: 0.3 + (i % 3) * 0.08, scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
    frame.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      frame.style.setProperty('--mx', `${x}%`); frame.style.setProperty('--my', `${y}%`);
      img.style.setProperty('--ox', `${x}%`); img.style.setProperty('--oy', `${y}%`);
    });
  });

  // ---------------------------------------------------------------- the approach: the road draws itself, the car follows
  const route = $('#route');
  const len = route.getTotalLength();
  const car = $('#routeCar');
  const pinsG = $('#routePins');
  const steps = $$('#approachSteps li');
  const pins = steps.map((li) => {
    const pt = route.getPointAtLength(parseFloat(li.dataset.at) * len);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'pin'); c.setAttribute('r', '7'); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
    pinsG.appendChild(c);
    return c;
  });
  const drive = (prog) => {
    gsap.set(route, { drawSVG: `0% ${(prog * 100).toFixed(2)}%` });
    const pt = route.getPointAtLength(prog * len);
    car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
    steps.forEach((li, i) => { const on = prog >= parseFloat(li.dataset.at) - 0.001; li.classList.toggle('is-on', on); pins[i].classList.toggle('is-on', on); });
  };
  drive(0);
  mm.add('(min-width: 901px)', () => {
    ScrollTrigger.create({ trigger: '#approach', pin: '.approach__pin', start: 'top top', end: '+=160%', scrub: 0.6, onUpdate: (st) => drive(st.progress) });
  });
  mm.add('(max-width: 900px)', () => {
    ScrollTrigger.create({ trigger: '#approachMap', start: 'top 80%', end: 'bottom 40%', scrub: 0.6, onUpdate: (st) => drive(st.progress) });
  });

  // the stills are rendered from the live model just before they are needed
  ScrollTrigger.create({ trigger: '#materials', start: 'top bottom', once: true, onEnter: () => onReadySwatches() });
  ScrollTrigger.create({ trigger: '#details', start: 'top 200%', once: true, onEnter: () => onReadyStills() });

  // ---------------------------------------------------------------- call to action
  gsap.fromTo('.cta__bg', { '--zoom': 1.18, '--py': '-5%' }, { '--zoom': 1.02, '--py': '5%', ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.form label, .form .btn', { y: 28, opacity: 0, duration: 1.2, ease: EASE, stagger: 0.07, scrollTrigger: { trigger: '.form', start: 'top 85%', once: true } });

  // ---------------------------------------------------------------- footer: the word rises as the page ends
  const word = $('.foot__word');
  const chars = SplitText.create(word, { type: 'chars', charsClass: 'ch' }).chars;
  gsap.fromTo(chars, { yPercent: 100, opacity: 0 }, {
    yPercent: 0, opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.foot', start: 'top 85%', end: 'bottom bottom', scrub: 0.8 },
  });
  gsap.from('.foot__nav a, .foot__top-link', { y: 20, opacity: 0, duration: 1.1, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });

  // ---------------------------------------------------------------- header on the page
  const header = $('#top');
  const prog = $('#topProgress');
  const navLinks = $$('.top__nav a[href^="#"]').filter((a) => a.getAttribute('href').length > 1);
  let lastY = scrollY;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: () => {
      const y = scrollY, end = filmEnd();
      const inPage = y > end + innerHeight * 0.7;
      const dir = y - lastY;
      if (Math.abs(dir) > 4) header.classList.toggle('is-away', inPage && dir > 0 && y > end + innerHeight * 1.4);
      lastY = y;
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.setProperty('--p', Math.max(0, (y - end) / Math.max(1, max - end)).toFixed(4));
    },
  });
  navLinks.forEach((a) => {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (st) => a.classList.toggle('is-current', st.isActive) });
  });

  // ---------------------------------------------------------------- magnetic controls
  if (matchMedia('(hover: hover)').matches) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // ---------------------------------------------------------------- film overlays
  // The hero arrives once the loader lifts: the word rises letter by letter.
  const heroWord = $('.hero__word');
  const heroChars = SplitText.create(heroWord, { type: 'chars', charsClass: 'ch', mask: 'chars' }).chars;
  gsap.set(heroChars, { yPercent: 110 });
  gsap.set(['.frame--hero .eyebrow span', '.hero__sub', '.hero__lede', '.hero__begin', '.index', '.top'], { opacity: 0 });
  gsap.set('.hero__foot', { '--draw': 0 });
  const heroIn = () => {
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.to(heroChars, { yPercent: 0, duration: 1.8, stagger: 0.08 }, 0.1)
      .to('.frame--hero .eyebrow span', { opacity: 1, duration: 1.2, stagger: 0.12 }, 0.5)
      .to('.hero__foot', { '--draw': 1, duration: 1.6, ease: 'power3.inOut' }, 0.6)
      .fromTo(['.hero__sub', '.hero__lede'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.12 }, 0.95)
      .fromTo('.hero__begin', { opacity: 0, scale: 0.6, rotate: -40 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.6 }, 1.15)
      .fromTo('.top', { y: -30 }, { y: 0, duration: 1.4, clearProps: 'transform' }, 1.1)
      .to(['.index', '.top'], { opacity: 1, duration: 1.2 }, 1.1);
  };

  // chapter copy: lines rise each time a chapter's frame comes into view
  const frameSplits = new Map();
  $$('.frame:not(.frame--hero) h2').forEach((h) => {
    frameSplits.set(h.closest('.frame'), SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'split-line' }));
  });
  const frameIn = (frame) => {
    const split = frameSplits.get(frame);
    if (!split) return;
    gsap.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.3, ease: EASE, stagger: 0.09, overwrite: true });
    gsap.fromTo($$('.numeral, p, .spec li, .stats > div, .frame__cta', frame), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.06, delay: 0.15, overwrite: true });
  };

  return { heroIn, frameIn };
}
