// The intro B-roll edit: a tiny compositor. Every layer is a DOM element (a
// canvas fed from a recorded clip, or type) whose CSS is set from its own clock
// each frame; render.mjs steps it frame by frame and screenshots the stage.
// ?titles=0 renders the clean plate without any type.
(() => {
  const FPS = 60;
  const TITLES = new URLSearchParams(location.search).get('titles') !== '0';
  const stage = document.getElementById('stage');

  // ------------------------------------------------------------ math
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    sine: (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
    cubic: (t) => { t = clamp(t); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; },
    quint: (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2; },
    outCubic: (t) => 1 - (1 - clamp(t)) ** 3,
    outQuint: (t) => 1 - (1 - clamp(t)) ** 5,
    outExpo: (t) => (clamp(t) >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t))),
    inCubic: (t) => clamp(t) ** 3,
  };
  // 0 → 1 → 0 over a window, with soft shoulders
  const bell = (t, a, b, rise = 0.25, fall = rise) => E.sine(span(t, a, a + rise)) * (1 - E.sine(span(t, b - fall, b)));
  const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };

  // ------------------------------------------------------------ sources
  const videos = new Map();
  const video = (src) => {
    if (!videos.has(src)) {
      const v = document.createElement('video');
      v.src = `../clips/${src}.mp4`;
      v.muted = true; v.preload = 'auto'; v.playsInline = true;
      v.__frame = -1;
      videos.set(src, v);
    }
    return videos.get(src);
  };
  async function seekFrame(v, k) {
    const last = Math.max(0, Math.round(v.duration * FPS) - 1);
    k = Math.min(last, Math.max(0, k));
    if (v.__frame === k) return;
    await new Promise((res) => {
      const done = () => { v.removeEventListener('seeked', done); res(); };
      v.addEventListener('seeked', done);
      v.currentTime = (k + 0.5) / FPS;
    });
    v.__frame = k;
  }

  // ------------------------------------------------------------ layers
  const layers = [];
  function add(spec) {
    const L = { speed: 1, from: 0, ...spec };
    if (L.titles && !TITLES) return L;
    let el;
    if (L.src && L.type !== 'browser') {
      el = document.createElement('canvas');
      el.width = 1920; el.height = 1080;
      L.ctx = el.getContext('2d');
      L.canvases = [L.ctx];
    } else {
      el = document.createElement('div');
      if (L.html) el.innerHTML = L.html;
    }
    el.classList.add('layer');
    if (L.cls) el.classList.add(...L.cls.split(' '));
    L.el = el;
    if (L.type === 'browser') buildBrowser(L);
    if (L.type === 'code') buildCode(L);
    stage.appendChild(el);
    if (L.src) L.video = video(L.src);
    layers.push(L);
    return L;
  }

  async function feed(L, t) {
    const st = L.from + (t - L.at) * L.speed;
    await seekFrame(L.video, Math.floor(st * FPS + 1e-3));
    for (const g of L.canvases) g.drawImage(L.video, 0, 0, 1920, 1080);
  }

  // ------------------------------------------------------------ the browser window
  function buildBrowser(L) {
    L.el.classList.add('bw');
    L.el.innerHTML = `
      <canvas class="bw__back" width="1920" height="1080" style="position:absolute;inset:0;width:1920px;height:1080px"></canvas>
      <div class="bw__window">
        <div class="bw__chrome"><i class="bw__dot"></i><i class="bw__dot"></i><i class="bw__dot"></i>
          <div class="bw__url"><svg viewBox="0 0 16 16"><path fill="#f4efe6" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z"/></svg><b>aura-living-sanctuary</b><span>.aura.build</span></div>
        </div>
        <canvas class="bw__page" width="1920" height="1080"></canvas>
        <div class="bw__frame"></div>
      </div>
      <div class="chips">${['Three.js', 'WebGL', 'GSAP', 'Lenis'].map((c) => `<span class="chip">${c}</span>`).join('')}</div>`;
    L.back = L.el.querySelector('.bw__back');
    L.win = L.el.querySelector('.bw__window');
    L.page = L.el.querySelector('.bw__page');
    L.frameEl = L.el.querySelector('.bw__frame');
    L.chips = [...L.el.querySelectorAll('.chip')];
    if (!TITLES) L.el.querySelector('.chips').remove();
    L.canvases = [L.back.getContext('2d'), L.page.getContext('2d')];
  }

  // ------------------------------------------------------------ the code, being written
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOKEN = /(\/\/.*$)|('[^']*'?)|\b(const|let|function|return|new|for|of|if|else|this)\b|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*(?=\())/gm;
  const paint = (src) => esc(src).replace(TOKEN, (m, c, s, k, n, f) =>
    c ? `<span class="c">${m}</span>` : s ? `<span class="s">${m}</span>` : k ? `<span class="k">${m}</span>` : n ? `<span class="num">${m}</span>` : `<span class="f">${m}</span>`);
  function buildCode(L) {
    L.el.innerHTML = '<div class="code"><div class="code__sheet"><pre></pre></div><div class="code__fade"></div></div>';
    L.sheet = L.el.querySelector('.code__sheet');
    L.pre = L.el.querySelector('pre');
  }
  function drawCode(L, lt) {
    const text = window.__code || '';
    const shown = Math.floor(text.length * E.sine(span(lt, 0.1, L.dur - 0.25)) ** 0.9);
    const lines = text.slice(0, shown).split('\n');
    const html = lines.map((ln, i) => `<span class="ln">${i + 1}</span>${paint(ln)}`).join('\n');
    L.pre.innerHTML = `${html}<i class="caret" style="opacity:${Math.floor(lt * 2.4) % 2 && shown >= text.length ? 0 : 1}"></i>`;
    const lineH = 23 * 1.62;
    const goal = -(lines.length - 1) * lineH;
    L.scroll = L.scroll === undefined ? goal : lerp(L.scroll, goal, 0.12);
    const k = E.sine(lt / L.dur);
    css(L.sheet, { transform: `translateY(${L.scroll + 60}px) rotateX(${lerp(26, 20, k)}deg) rotateZ(${lerp(-7, -4, k)}deg) scale(${lerp(1.1, 1.2, k)})` });
  }

  // ------------------------------------------------------------ effects
  // a clip that drifts slowly (Ken Burns), fading in and out over its edges
  const drift = ({ s = [1, 1.035], x = [0, 0], y = [0, 0], fin = 0, fout = 0, filter = '', zin = 0, zout = 0 } = {}) => (lt, L) => {
    const k = E.sine(lt / L.dur);
    let scale = lerp(s[0], s[1], k), blur = 0;
    if (zin) { const e = E.outQuint(span(lt, 0, zin)); scale *= lerp(1.16, 1, e); blur += (1 - e) * 10; }
    if (zout) { const e = E.inCubic(span(lt, L.dur - zout, L.dur)); scale *= lerp(1, 1.1, e); blur += e * 12; }
    const o = (fin ? E.sine(span(lt, 0, fin)) : 1) * (fout ? 1 - E.sine(span(lt, L.dur - fout, L.dur)) : 1);
    css(L.el, {
      opacity: o,
      transform: `translate(${lerp(x[0], x[1], k)}px, ${lerp(y[0], y[1], k)}px) scale(${scale})`,
      filter: `${filter}${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}` || 'none',
    });
  };
  const V1_LOOK = 'saturate(0.72) contrast(1.06) brightness(0.93) sepia(0.06)';

  // ------------------------------------------------------------ type
  const rise = (els, lt, at, { stagger = 0.06, dur = 1.0, out = Infinity, outDur = 0.5 } = {}) => {
    els.forEach((el, i) => {
      const e = E.outQuint(span(lt, at + i * stagger, at + i * stagger + dur));
      const o = 1 - E.cubic(span(lt, out, out + outDur));
      css(el, { transform: `translateY(${(1 - e) * 110 - (1 - o) * 30}%)`, opacity: Math.min(1, e * 1.4) * o });
    });
  };
  const masked = (text) => [...text].map((c) => `<span class="mask"><i>${c === ' ' ? '&nbsp;' : c}</i></span>`).join('');
  const label = (n, word) => `<div class="label"><div class="label__n cap">Generated live · ${n}</div><div class="label__w"><span class="mask"><i>${word}</i></span></div></div>`;
  const labelFx = (lt, L) => {
    const word = L.el.querySelector('.label__w i'), cap = L.el.querySelector('.label__n');
    const e = E.outQuint(span(lt, 0.05, 0.75)), o = 1 - E.cubic(span(lt, L.dur - 0.25, L.dur));
    css(word, { transform: `translateY(${(1 - e) * 105}%)` });
    css(cap, { opacity: E.sine(span(lt, 0.15, 0.6)) * o });
    cap.style.setProperty('--line', E.outCubic(span(lt, 0.1, 0.7)));
    css(L.el, { opacity: o });
  };

  // ------------------------------------------------------------ the edit
  const T = TITLES;
  // 0:00 "This is an architectural plan. Lines on paper. Walls, rooms, a stair."
  add({ src: '01_plan', at: 0, dur: 4.5, fx: drift({ s: [1, 1.02], fin: 1.6 }) });
  add({ src: '01b_plan_detail', at: 3.9, dur: 5.5, from: 0.6, fx: drift({ s: [1, 1.02], fin: 0.6 }) });
  // 0:09 "Now watch..." walls rise, floors slide in, the roof lands
  add({ src: '02_rise', at: 9.25, dur: 10.55, fx: drift({ s: [1, 1.01], zin: 0.8 }) });
  // 0:19 "...a cliff above the sea at golden hour."
  add({ src: '04_golden', at: 19.4, dur: 4.4, from: 0.3, fx: drift({ s: [1.0, 1.04], fin: 0.8, zout: 0.35 }) });
  add({ cls: 'sweep', at: 19.15, dur: 1.4, html: '', fx: (lt, L) => {
    const e = E.cubic(lt / L.dur);
    css(L.el, { background: 'linear-gradient(100deg, transparent 38%, rgba(255,206,140,.55) 50%, transparent 62%)', transform: `translateX(${lerp(-70, 70, e)}%)`, opacity: bell(lt, 0, L.dur, 0.4) });
  } });
  // beat: the sculpture in its beam, then it snaps together onto the cliff
  add({ src: '05_sculpture', at: 23.6, dur: 2.25, from: 0.6, fx: drift({ s: [1, 1.03], zin: 0.55 }) });
  add({ src: '06_assemble', at: 25.6, dur: 3.45, from: 0.6, speed: 1.55, fx: drift({ s: [1, 1.0], fin: 0.25 }) });
  // 0:29 "And this isn't a video. It's a website... built with Three.js."
  add({ type: 'browser', src: '07_site', at: 28.9, dur: 5.6, from: 0.2, fx: (lt, L) => {
    const e = E.quint(span(lt, 0.35, 1.8)), d = E.sine(span(lt, 1.6, L.dur));
    css(L.el, { opacity: E.sine(span(lt, 0, 0.2)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.win, { transform: `translateY(${lerp(0, -18, e)}px) scale(${lerp(1, 0.74, e) * lerp(1, 0.985, d)}) rotateX(${lerp(0, 7, e) - d * 2}deg) rotateY(${lerp(0, -9, e) + d * 5}deg)` });
    css(L.page, { borderRadius: `0 0 ${22 * e}px ${22 * e}px` });
    css(L.frameEl, { opacity: e });
    css(L.back, { opacity: e, filter: 'blur(38px) brightness(0.3) saturate(1.25)', transform: `scale(${lerp(1.3, 1.18, e)})` });
    L.chips.forEach((c, i) => {
      const k = E.outQuint(span(lt, 2.7 + i * 0.12, 3.5 + i * 0.12));
      css(c, { opacity: k, transform: `translateY(${(1 - k) * 24}px)` });
    });
  } });
  // 0:34 "Every stone, every board of oak, the sea, the sunset, even ... the fire"
  const macro = [['08a_stone', 34.4, 1.35, 0.6, 'Stone'], ['08b_oak', 35.65, 1.3, 0.8, 'Oak'], ['08c_sea', 36.85, 1.3, 0.8, 'Sea'], ['08d_sunset', 38.05, 1.3, 0.4, 'Sunset', 1.8], ['08e_fire', 39.25, 1.45, 0.8, 'Fire']];
  macro.forEach(([src, at, dur, from, word, speed = 1], i) => {
    add({ src, at, dur: dur + 0.12, from, speed, fx: drift({ s: [1.0, 1.05], fin: i === 0 ? 0.3 : 0.12 }) });
    add({ titles: true, at: at + 0.05, dur: dur - 0.02, html: label(String(i + 1).padStart(2, '0'), word), fx: labelFx });
  });
  // 0:40 "There's not a single image file on this page."
  add({ src: '08f_aerial', at: 40.6, dur: 4.1, from: 0.6, fx: (lt, L) => {
    drift({ s: [1.06, 1.0], fin: 0.35 })(lt, L);
    // a focus pull behind the title
    const f = E.sine(span(lt, 0.3, 1.0)) * (1 - E.sine(span(lt, 3.2, 3.9)));
    if (T) L.el.style.filter = `brightness(${lerp(1, 0.52, f)}) blur(${(f * 7).toFixed(2)}px)`;
  } });
  add({ titles: true, at: 40.95, dur: 3.5, html: `<div class="zero"><div class="zero__n"><span class="mask"><i>0</i></span></div><div class="zero__t">${masked('Image files')}</div><div class="zero__s"><span class="mask"><i>Every surface is generated in your browser.</i></span></div></div>`,
    fx: (lt, L) => {
      const out = L.dur - 0.55;
      rise([L.el.querySelector('.zero__n i')], lt, 0.05, { dur: 1.1, out });
      rise([...L.el.querySelectorAll('.zero__t i')], lt, 0.35, { stagger: 0.035, dur: 0.9, out });
      rise([L.el.querySelector('.zero__s i')], lt, 0.8, { dur: 1.0, out });
    } });
  // 0:44 "You can scroll through it like a film, or step inside and walk the whole house."
  add({ src: '09_door', at: 44.5, dur: 3.2, from: 0.8, fx: drift({ s: [1, 1.0], fin: 0.4 }) });
  add({ src: '10_living', at: 47.55, dur: 2.6, from: 0.6, fx: drift({ s: [1, 1.0], fin: 0.2 }) });
  // 0:50 "Down the stair, into the bedrooms, out onto the terrace."
  add({ src: '11_stair', at: 50.0, dur: 1.75, from: 0.55, fx: drift({ s: [1, 1.0], fin: 0.15 }) });
  add({ src: '12_bedroom', at: 51.6, dur: 1.55, from: 1.0, fx: drift({ s: [1, 1.02], fin: 0.15 }) });
  add({ src: '13_terrace', at: 53.0, dur: 2.0, from: 1.4, fx: drift({ s: [1, 1.0], fin: 0.15, fout: 0.3 }) });
  // 0:55 "Most of the code was written by Claude Opus 5.5."
  add({ type: 'code', at: 55.1, dur: 3.3, fx: (lt, L) => {
    css(L.el, { opacity: E.sine(span(lt, 0, 0.35)) * (1 - E.sine(span(lt, L.dur - 0.2, L.dur))) });
    drawCode(L, lt);
  } });
  add({ titles: true, at: 55.7, dur: 2.65, html: '<div class="lower"><i class="lower__mark"></i><div class="lower__k"><span class="cap">Written with</span><b>Claude Opus 5.5</b></div></div>',
    fx: (lt, L) => {
      const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.35, L.dur));
      css(L.el.firstChild, { opacity: e * o, transform: `translateX(${(1 - e) * -40}px)` });
    } });
  // 0:58 "But the first version looked nothing like this." crazy paving, a random sculpture, no kitchen
  const v1s = [['15a_v1_brick', 58.4, 2.0, 0.4], ['15b_v1_cliff', 60.4, 2.0, 0.5], ['15c_v1_sculpture', 62.4, 2.0, 0.5], ['15d_v1_room', 64.4, 2.0, 0.5]];
  v1s.forEach(([src, at, dur, from]) => add({ src, at, dur, from, fx: (lt, L) => {
    drift({ s: [1.0, 1.03], filter: V1_LOOK })(lt, L);
    if (lt < 0.07) L.el.style.transform += ` translate(${lt < 0.035 ? 14 : -8}px, 0)`;
  } }));
  // the quick flash of v1
  [['15a_v1_brick', 1.9], ['15b_v1_cliff', 2.4], ['15c_v1_sculpture', 2.2], ['15d_v1_room', 2.4], ['15b_v1_cliff', 0.6], ['15c_v1_sculpture', 1.2]]
    .forEach(([src, from], i) => add({ src, at: 66.4 + i * 0.1, dur: 0.1, from, speed: 0, fx: drift({ s: [1.04, 1.04], filter: `${V1_LOOK} contrast(1.2)` }) }));
  add({ titles: true, at: 58.4, dur: 8.6, html: '<div class="tag"><i></i>VERSION 1</div>', fx: (lt, L) => {
    const blink = Math.floor(lt * 2) % 2 ? 0.25 : 1;
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0, 0.2)) });
    css(L.el.querySelector('i'), { opacity: blink });
  } });
  // 1:07 "...how I got from that to this."
  add({ src: '15b_v1_cliff', at: 67.0, dur: 2.5, from: 1.2, speed: 0.4, fx: drift({ s: [1.03, 1.05], filter: V1_LOOK }) });
  add({ src: '17_end', at: 67.0, dur: 3.6, from: 0.0, fx: (lt, L) => {
    drift({ s: [1.04, 1.0] })(lt, L);
    const p = E.cubic(span(lt, 1.05, 2.25));
    L.el.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
  } });
  add({ cls: 'wl', at: 68.0, dur: 1.4, html: '<i class="wipeline"></i>', fx: (lt, L) => {
    const p = E.cubic(span(lt, 0.05, 1.25));
    css(L.el.firstChild, { left: `${p * 1920 - 1}px`, opacity: bell(lt, 0, L.dur, 0.15, 0.3) });
  } });
  add({ cls: 'flash', at: 66.95, dur: 0.25, html: '', fx: (lt, L) => css(L.el, { background: '#fff4e2', opacity: 0.85 * (1 - E.outCubic(lt / L.dur)) }) });
  // 1:10 "The prompts I used, the mistakes, and the few tricks..."
  add({ src: '16c_materials', at: 70.5, dur: 1.55, from: 0.8, speed: 1.6, fx: drift({ s: [1, 1.03], zin: 0.45 }) });
  add({ src: '16b_roll', at: 71.95, dur: 1.55, from: 1.0, speed: 2.0, fx: drift({ s: [1, 1.03], zin: 0.45 }) });
  add({ src: '16e_approach', at: 73.4, dur: 1.05, from: 1.5, speed: 2.5, fx: drift({ s: [1, 1.03], zin: 0.45 }) });
  add({ src: '16f_cta', at: 74.35, dur: 1.3, from: 2.6, fx: drift({ s: [1, 1.04], zin: 0.45 }) });
  // 1:15 "By the end, you'll know how to turn an architectural plan, or any idea,"
  add({ src: '16d_day', at: 75.55, dur: 1.3, from: 1.0, speed: 2.0, fx: drift({ s: [1, 1.03], zin: 0.45 }) });
  add({ src: '01_plan', at: 76.75, dur: 1.45, from: 5.0, fx: drift({ s: [1, 1.06], zin: 0.45, zout: 0.4 }) });
  // 1:18 "...into something like this."
  add({ src: '17_end', at: 78.1, dur: 5.9, from: 3.3, fx: drift({ s: [1.08, 1.0], zin: 0.6 }) });
  add({ titles: true, at: 79.2, dur: 4.4, html: `<div class="end"><div class="end__w">${masked('AURA')}</div><div class="end__s"><span class="mask"><i><em>The living</em> sanctuary</i></span></div></div>`,
    fx: (lt, L) => {
      rise([...L.el.querySelectorAll('.end__w i')], lt, 0, { stagger: 0.09, dur: 1.3 });
      rise([L.el.querySelector('.end__s i')], lt, 0.7, { dur: 1.2 });
    } });

  // ------------------------------------------------------------ finishing: vignette, grain, fade
  const DURATION = 84;
  const vignette = document.createElement('div'); vignette.className = 'vignette'; stage.appendChild(vignette);
  const grain = document.createElement('canvas'); grain.id = 'grain'; grain.width = 960; grain.height = 540; stage.appendChild(grain);
  const black = document.createElement('div'); black.className = 'black'; stage.appendChild(black);
  const gctx = grain.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tiles = Array.from({ length: 8 }, () => {
    const c = document.createElement('canvas'); c.width = 960; c.height = 540;
    const g = c.getContext('2d'), img = g.createImageData(960, 540);
    for (let p = 0; p < img.data.length; p += 4) { const v = 128 + (rnd() - 0.5) * 255; img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  });
  const inV1 = (t) => t >= 58.4 && t < 67.0;

  async function frame(i) {
    const t = i / FPS;
    // whole frames, so back-to-back layers never leave a gap or overlap by rounding
    const act = layers.filter((L) => L.el && i >= Math.round(L.at * FPS) && i < Math.round((L.at + L.dur) * FPS));
    await Promise.all(act.filter((L) => L.video && !L.video.__missing).map((L) => feed(L, t)));
    for (const L of layers) {
      if (!L.el) continue;
      const on = act.includes(L);
      L.el.classList.toggle('on', on);
      if (on && L.fx) L.fx(t - L.at, L, t);
    }
    gctx.drawImage(tiles[(i * 5) % tiles.length], 0, 0);
    grain.style.opacity = inV1(t) ? 0.16 : 0.07;
    black.style.opacity = Math.max(1 - E.sine(span(t, 0, 1.4)), E.sine(span(t, DURATION - 1.2, DURATION - 0.05)));
  }

  const ready = (async () => {
    // web fonts load on first use; ask for every face up front so no frame falls back
    await Promise.all(['300 100px "Cormorant Garamond"', 'italic 300 100px "Cormorant Garamond"', '500 20px Manrope', '600 20px Manrope', '400 23px "JetBrains Mono"'].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    await Promise.all([...videos.values()].map((v) => (v.readyState >= 1 ? 0 : new Promise((r) => {
      v.onloadedmetadata = r;
      v.onerror = () => { console.error(`cannot load ${v.src}`); v.__missing = true; r(); };
    }))));
  })();
  window.__edit = { frame, ready, frames: Math.round(DURATION * FPS), fps: FPS };
})();
