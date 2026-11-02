import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { upperPlan, lowerPlan, sectionAA, approachMap } from './drawings.js';

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
  $('#sectionDraw').innerHTML = sectionAA();
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
  const dayClock = $('#dayClock'), daySun = $('#daySun'), dayArc = $('#dayArc'), dayMoment = $('#dayMoment');
  let dayActive = false, dayT = 0, lastMoment = '';
  const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  const showDay = () => {
    const hours = 5.4 + dayT * 18.0;
    dayClock.textContent = fmt(hours);
    const f = Math.min(1, Math.max(0, (hours - SUNRISE) / (SUNSET - SUNRISE)));
    const a = Math.PI * f;
    daySun.setAttribute('cx', (160 - 140 * Math.cos(a)).toFixed(1));
    daySun.setAttribute('cy', (150 - 140 * Math.sin(a) + (hours > SUNSET ? 14 : hours < SUNRISE ? 14 : 0)).toFixed(1));
    daySun.style.fill = hours > SUNSET + 0.3 || hours < SUNRISE - 0.2 ? '#9fb3d8' : '';
    gsap.set(dayArc, { drawSVG: `0% ${(f * 100).toFixed(2)}%` });
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
    const strokes = $$('line, rect, polyline, polygon, circle', svg).filter((n) => !n.closest('pattern'));
    const fills = $$('.f-hatch, .l-solid, .f-water, polygon[fill]', svg);
    const labels = $$('text', svg);
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start, end, scrub: 0.8 } });
    tl.fromTo(strokes, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: { amount: 0.6 }, duration: 0.5 }, 0)
      .fromTo(fills, { fillOpacity: 0 }, { fillOpacity: 1, ease: 'none', duration: 0.3, stagger: { amount: 0.2 } }, 0.55)
      .fromTo(labels, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.2, stagger: { amount: 0.25 } }, 0.7);
  };
  drawOn($('#sectionDraw'));
  $$('.plan').forEach((p) => drawOn(p, 'top 85%', 'bottom 70%'));

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
    gsap.fromTo($$('.numeral, p, .spec li, .stats > div, .cta', frame), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.06, delay: 0.15, overwrite: true });
  };

  return { heroIn, frameIn };
}
