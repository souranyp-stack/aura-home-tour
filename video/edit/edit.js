// The B-roll compositor. Every layer is a DOM element (a
// canvas fed from a recorded clip, or type) whose CSS is set from its own clock
// each frame; render.mjs steps it frame by frame and screenshots the stage.
// ?cut=intro|sponsor picks the timeline in cuts/; ?titles=0 renders the clean
// plate without any type.
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
  // key lets one clip have two decoders, for blending neighbouring frames
  const video = (src, key = src) => {
    if (!videos.has(key)) {
      const v = document.createElement('video');
      v.src = `../clips/${src}.mp4`;
      v.muted = true; v.preload = 'auto'; v.playsInline = true;
      v.__frame = -1;
      videos.set(key, v);
    }
    return videos.get(key);
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
    if (L.src && !L.type) {
      el = document.createElement('canvas');
      el.width = L.w ?? 1920; el.height = L.h ?? 1080;
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
    if (L.build) L.build(L);
    (L.parent || stage).appendChild(el);
    if (L.src) L.video = video(L.src);
    if (L.src && L.blend) L.video2 = video(L.src, `${L.src}#next`);
    layers.push(L);
    return L;
  }

  // Seeks a layer's clip to its frame. blend: also the next frame, mixed by the
  // fraction between them (smooth slow motion). crop(st) -> {x, y, w} in source
  // pixels: drawn with high-quality resampling at sub-pixel precision, so slow
  // zooms glide instead of stepping. paint: the cut draws the frame itself.
  async function feed(L, t) {
    const st = L.from + (t - L.at) * L.speed;
    const f = st * FPS, k = Math.floor(f + 1e-3);
    L.st = st;
    L.mix = L.blend ? Math.min(1, Math.max(0, f - k)) : 0;
    await Promise.all([seekFrame(L.video, k), L.blend ? seekFrame(L.video2, k + 1) : null]);
    if (L.paint) return;
    const c = L.crop ? L.crop(st) : null;
    if (c && !L.half) {
      L.half = document.createElement('canvas');
      L.half.width = L.video.videoWidth / 2; L.half.height = L.video.videoHeight / 2;
    }
    for (const g of L.canvases) {
      const W = g.canvas.width, H = g.canvas.height;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      if (c) {
        // an exact half-size copy (a clean 2:1 box filter) carries the picture;
        // the full frame is mixed in only where the crop is close enough to need
        // its detail, so shrinking never aliases and the zoom never shimmers
        const hc = L.half.getContext('2d');
        hc.drawImage(L.video, 0, 0, L.half.width, L.half.height);
        const h = (c.w * H) / W, detail = E.sine(span(W / c.w, 0.6, 0.8));
        g.globalAlpha = 1;
        g.drawImage(L.half, c.x / 2, c.y / 2, c.w / 2, h / 2, 0, 0, W, H);
        if (detail > 0.002) { g.globalAlpha = detail; g.drawImage(L.video, c.x, c.y, c.w, h, 0, 0, W, H); }
      } else {
        g.globalAlpha = 1;
        g.drawImage(L.video, 0, 0, W, H);
        if (L.mix > 0.002) { g.globalAlpha = L.mix; g.drawImage(L.video2, 0, 0, W, H); }
      }
      g.globalAlpha = 1;
    }
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

  // ------------------------------------------------------------ the cut (cuts/<name>.js, chosen by ?cut=)
  const CUT = new URLSearchParams(location.search).get('cut') || 'intro';
  const cut = window.CUTS[CUT]({ add, drift, E, span, lerp, clamp, css, bell, T: TITLES, TITLES, label, labelFx, masked, rise, V1_LOOK, drawCode, stage });
  // ------------------------------------------------------------ finishing: vignette, grain, fade
  const DURATION = cut.duration;
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
    grain.style.opacity = cut.grain ? cut.grain(t) : 0.07;
    cut.frame?.(t, i);
    black.style.opacity = Math.max(1 - E.sine(span(t, 0, cut.fadeIn ?? 1.4)), E.sine(span(t, DURATION - 1.2, DURATION - 0.05)));
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
