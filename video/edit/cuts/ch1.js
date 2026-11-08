// The build, from "What we're building and the stack" (script 3:10) through
// chapter 1, "The first prompt" (3:40). First 25 s: the terminal, package.json,
// each tool on real footage, the build, the source folders and the no-image rule.
// Then the first prompt typed with its story beats lighting up, the storyboard
// of v1's eight chapters, the tip as type, and v1 itself: what worked, and the
// crazy-paving cliff and grey-brick walls up close.
window.CUTS = window.CUTS || {};
window.CUTS.ch1 = (api) => {
  const { add: addAt, drift, E, span, lerp, css, T, masked, rise, labelFx } = api;
  // the first-prompt section's times below are from its own start
  const OFF = 25;
  const add = (s) => addAt({ ...s, at: s.at + OFF });

  // sub-pixel push-ins from whole 3840x2160 frames (paths in 1920x1080 units)
  const crop = (seconds, path) => (st) => {
    const c = path(Math.min(1, Math.max(0, st / seconds)));
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const toward = (cx, cy, w0, w1, ease = E.sine) => (u) => {
    const k = ease(u), w = lerp(w0, w1, k);
    return { x: lerp(960, cx, k) - w / 2, y: lerp(540, cy, k) - (w * 9) / 32, w };
  };

  // ------------------------------------------------------------ the stack (0:00-0:25)
  const window_ = (title, cls = '') => `<div class="c1-room"></div><div class="s-win ${cls}"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">${title}</span></div><pre class="s-win__b"></pre></div>`;
  const push = (L, lt, dur) => css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.04, E.sine(lt / dur))})` });
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const lineAt = (lt, at) => { const e = E.outCubic(span(lt, at, at + 0.3)); return `opacity:${e.toFixed(3)};transform:translateY(${((1 - e) * 8).toFixed(1)}px);display:block`; };
  const CARET = '<i class="caret c1-caret"></i>';
  const PS1 = '<span class="s-dim">~/Home Tour</span> <span class="s-b">$</span> ';

  // "I built it in the terminal with Claude Code, running Opus 5.5."
  addAt({ at: 0, dur: 5.5, html: window_('Terminal'), fx: (lt, L) => {
    fades(L, lt, 0.6, 0.3); push(L, lt, L.dur);
    const cmd = 'claude', n = Math.floor(cmd.length * span(lt, 0.8, 1.2));
    L.el.querySelector('pre').innerHTML = `${PS1}${cmd.slice(0, n)}${lt < 1.4 ? CARET : ''}
<span style="${lineAt(lt, 1.5)}">&nbsp;</span><span style="${lineAt(lt, 1.5)}"><span class="s-b s-big">Claude Code</span></span><span style="${lineAt(lt, 1.8)}"><span class="s-dim">model </span> Opus 5.5</span><span style="${lineAt(lt, 2.0)}"><span class="s-dim">folder</span> ~/Home Tour</span><span style="${lineAt(lt, 2.4)}">&nbsp;</span><span style="${lineAt(lt, 2.4)}"><span class="s-b">›</span> ${lt > 2.5 && Math.floor(lt * 2.2) % 2 ? '' : CARET}</span>`;
  } });
  // "The stack is small:" the real package.json
  const DEPS = [['"three"', '"^0.169.0"'], ['"gsap"', '"^3.13.0"'], ['"lenis"', '"^1.1.14"']], DEV = [['"terser"', '"^5.51.2"'], ['"vite"', '"^5.4.10"']];
  addAt({ at: 5.2, dur: 2.3, html: window_('package.json'), fx: (lt, L) => {
    fades(L, lt, 0.3, 0.25); push(L, lt, L.dur);
    const row = ([k, v], i, base) => `<span style="${lineAt(lt, base + i * 0.1)}">    <span class="s-b">${k}</span>: <span class="s-g">${v}</span>,</span>`;
    L.el.querySelector('pre').innerHTML = `<span class="s-dim">"dependencies": {</span>
${DEPS.map((d, i) => row(d, i, 0.15)).join('')}<span class="s-dim">},
"devDependencies": {</span>
${DEV.map((d, i) => row(d, i, 0.5)).join('')}<span class="s-dim">}</span>`;
  } });
  // each tool on real footage, named as it's said
  const tool = (src, at, dur, from, speed, word, what) => {
    addAt({ src, at, dur: dur + 0.15, from, speed, fx: drift({ s: [1, 1.04], fin: 0.2 }) });
    addAt({ titles: true, at: at + 0.05, dur: dur - 0.05, html: `<div class="s-shade"></div><div class="label"><div class="label__n cap">${what}</div><div class="label__w"><span class="mask"><i>${word}</i></span></div></div>`, fx: labelFx });
  };
  tool('05_sculpture', 7.3, 2.0, 0.6, 1, 'Three.js', 'The 3D');
  tool('16b_roll', 9.3, 3.0, 1.0, 1.4, 'GSAP + ScrollTrigger', 'The scroll choreography');
  tool('16c_materials', 12.3, 1.8, 0.8, 1.4, 'Lenis', 'Smooth scrolling');
  // "and Vite to build it." the real build output
  addAt({ at: 14.1, dur: 2.2, html: window_('Terminal'), fx: (lt, L) => {
    fades(L, lt, 0.2, 0.25); push(L, lt, L.dur);
    const cmd = 'npm run build', n = Math.floor(cmd.length * span(lt, 0.1, 0.5));
    L.el.querySelector('pre').innerHTML = `${PS1}${cmd.slice(0, n)}${lt < 0.6 ? CARET : ''}
<span style="${lineAt(lt, 0.7)}"><span class="s-b">vite v5.4.10</span> <span class="s-dim">building for production...</span></span><span style="${lineAt(lt, 1.05)}"><span class="s-dim">dist/assets/</span>index.js  <span class="s-g">987.90 kB</span> <span class="s-dim">│ gzip: 289.15 kB</span></span><span style="${lineAt(lt, 1.4)}"><span class="s-g">✓ built in 6.18s</span></span>`;
  } });
  // "And one rule from day one: no image files." the real source folders
  const TREE = { core: ['bake', 'merge', 'noise', 'post', 'snapshot', 'sound', 'surfaces'], world: ['atmosphere', 'coast', 'coastMap', 'desk', 'house', 'interior', 'landscape', 'materials', 'planRoll', 'rooms', 'samples', 'vegetation', 'walkPlan'], story: ['timeline'], ui: ['drawings', 'metalButton', 'page', 'ui', 'walk'] };
  addAt({ at: 16.1, dur: 4.6, html: `<div class="c1-room"></div><div class="s-tree">${Object.entries(TREE).map(([d, fs]) => `<div class="s-col"><b>src/${d}</b>${fs.map((f) => `<span>${f}.js</span>`).join('')}</div>`).join('')}</div><pre class="s-find"></pre><div class="s-zero"><span class="s-zero__n">0</span><span class="cap">image files</span></div>`, fx: (lt, L) => {
    fades(L, lt, 0.3, 0.4);
    L.el.querySelectorAll('.s-col').forEach((c, i) => {
      const e = E.outQuint(span(lt, 0.1 + i * 0.12, 0.9 + i * 0.12)), d = E.sine(span(lt, 2.2, 2.8));
      css(c, { opacity: e * lerp(1, 0.14, d), transform: `translateY(${(1 - e) * 26}px)` });
    });
    const cmd = 'find . -name "*.png" -o -name "*.jpg" -o -name "*.webp"', n = Math.floor(cmd.length * span(lt, 1.0, 1.9));
    L.el.querySelector('.s-find').innerHTML = `<span class="s-b">$</span> ${cmd.slice(0, n)}${lt < 2.0 ? CARET : ''}`;
    const z = E.outQuint(span(lt, 2.2, 3.0));
    css(L.el.querySelector('.s-zero'), { opacity: z, transform: `translate(-50%, -50%) scale(${lerp(0.92, 1, z)})` });
  } });
  // "Keep that in mind, because it saves me at the very end."
  addAt({ src: '08a_stone', at: 20.4, dur: 5.2, from: 0.3, speed: 0.6, fx: drift({ s: [1, 1.06], fin: 0.4 }) });
  addAt({ titles: true, at: 20.8, dur: 3.9, html: '<div class="s-shade"></div><div class="label"><div class="label__n cap">Every surface</div><div class="label__w"><span class="mask"><i>Generated in the browser</i></span></div></div>', fx: labelFx });

  // ------------------------------------------------------------ 0:00 the first prompt, typed
  const PROMPT = 'Build a scroll-driven Three.js film of a cliffside residence in eight chapters. Floating masses assemble into the house, a sweep turns plaster into real materials, the landscape grows outward, the camera flies in through the glass door, and the last chapter gives the viewer live controls for time of day, weather, lights, curtains and fire.';
  const BEATS = ['eight chapters', 'Floating masses assemble into the house', 'a sweep turns plaster into real materials', 'the landscape grows outward', 'the camera flies in through the glass door', 'live controls for time of day, weather, lights, curtains and fire'];
  // the prompt as runs of plain text and beats (index into BEATS)
  const runs = [];
  { let rest = PROMPT; for (const [i, b] of BEATS.entries()) { const at = rest.indexOf(b); runs.push([rest.slice(0, at), -1], [b, i]); rest = rest.slice(at + b.length); } runs.push([rest, -1]); }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const TYPE_AT = 0.7, TYPE_END = 8.2, HL_AT = 8.5;
  add({ at: 0, dur: 14.9, html: `
    <div class="c1-room"></div>
    <div class="c1-card"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap">The first prompt</span><span class="c1-card__n cap">v1</span></div>
      <p class="c1-prompt"></p></div>
    <div class="c1-not"><span class="c1-not__w">“a 3D house website”</span><i class="c1-not__line"></i></div>`,
  fx: (lt, L) => {
    const card = L.el.querySelector('.c1-card'), p = L.el.querySelector('.c1-prompt');
    // typing, then each story beat underlined in turn
    const shown = Math.floor(PROMPT.length * E.sine(span(lt, TYPE_AT, TYPE_END)) ** 0.92);
    // the untyped rest stays in place, invisible, so lines never reflow
    let n = 0, html = '', caret = false;
    for (const [text, b] of runs) {
      const vis = Math.max(0, Math.min(text.length, shown - n)); n += text.length;
      const k = b < 0 ? 0 : E.outCubic(span(lt, HL_AT + b * 0.42, HL_AT + b * 0.42 + 0.6));
      html += b < 0 ? '' : `<span class="c1-beat" style="--k:${k.toFixed(3)}">`;
      html += esc(text.slice(0, vis));
      if (vis < text.length) {
        if (!caret) { html += '<i class="caret c1-caret"></i>'; caret = true; }
        html += `<span class="c1-ghost">${esc(text.slice(vis))}</span>`;
      }
      html += b < 0 ? '' : '</span>';
    }
    if (shown >= PROMPT.length) html += `<i class="caret c1-caret" style="opacity:${Math.floor(lt * 2.2) % 2 ? 0 : 1}"></i>`;
    p.innerHTML = html;
    // 0:11.6 "I didn't ask for 'a 3D house website'": the card steps aside
    const a = E.quint(span(lt, 11.4, 12.4));
    css(card, { transform: `translate(${lerp(0, -330, a)}px, ${lerp(0, 0, a)}px) scale(${lerp(1, 0.66, a) * lerp(0.98, 1.02, E.sine(lt / 11))})`, opacity: 1 - E.sine(span(lt, 14.3, 14.9)) });
    const not = L.el.querySelector('.c1-not'), line = L.el.querySelector('.c1-not__line');
    const w = E.outQuint(span(lt, 11.9, 12.8));
    css(not, { opacity: w * (1 - E.sine(span(lt, 14.3, 14.9))), transform: `translateY(${(1 - w) * 30}px)` });
    css(line, { transform: `scaleX(${E.cubic(span(lt, 12.9, 13.5))})` });
    css(L.el.querySelector('.c1-not__w'), { opacity: lerp(1, 0.45, E.sine(span(lt, 13.2, 13.8))) });
    css(L.el, { opacity: E.sine(span(lt, 0, 0.6)) });
  } });

  // ------------------------------------------------------------ 0:14.6 "chapter by chapter, like a storyboard"
  const TITLES = ['AURA', 'Nine stones in balance', 'Gravity decides', 'Matter rises from the ground', 'Then the world arrives', 'The glass steps aside', 'Inside, the horizon is the fourth wall', 'Live in it at any hour'];
  const PW = 384, PH = 216, GAP = 28, X0 = (1920 - (4 * PW + 3 * GAP)) / 2, Y0 = 236, ROW = PH + 112;
  const SB_AT = 14.6, SB_END = 26.6;
  add({ at: SB_AT, dur: SB_END - SB_AT, html: '<div class="c1-room"></div>' });
  // the whole board blurs back behind the tip
  const blurOf = (t) => E.sine(span(t - OFF, SB_AT + 6.4, SB_AT + 7.2));
  TITLES.forEach((title, i) => {
    const col = i % 4, row = Math.floor(i / 4), x = X0 + col * (PW + GAP), y = Y0 + row * ROW;
    const appear = 0.15 + i * 0.12;
    add({ src: `c1_sb${i + 1}`, at: SB_AT, dur: SB_END - SB_AT, from: 0.2, speed: 0.8, cls: 'c1-panel', fx: (lt, L, t) => {
      const e = E.outQuint(span(lt, appear, appear + 0.9)), b = blurOf(t), push = lerp(1, 1.05, E.sine(lt / (SB_END - SB_AT)));
      css(L.el, {
        opacity: e * (1 - E.sine(span(lt, SB_END - SB_AT - 0.4, SB_END - SB_AT))),
        transform: `translate(${(x - 960) * push + 960}px, ${(y - 540) * push + 540 + (1 - e) * 40}px) scale(${(PW / 1920) * push * lerp(0.94, 1, e)})`,
        filter: `brightness(${lerp(1, 0.42, b)}) blur(${(b * 3).toFixed(2)}px)`,
      });
    } });
    add({ at: SB_AT, dur: SB_END - SB_AT, html: `<div class="c1-cap" style="left:${x}px;top:${y + PH + 16}px;width:${PW}px"><span class="cap">Chapter ${String(i + 1).padStart(2, '0')}</span><b>${title}</b></div>`, fx: (lt, L, t) => {
      const e = E.outQuint(span(lt, appear + 0.25, appear + 1.1)), b = blurOf(t), push = lerp(1, 1.05, E.sine(lt / (SB_END - SB_AT)));
      css(L.el.firstChild, { opacity: e * (1 - b * 0.75) * (1 - E.sine(span(lt, SB_END - SB_AT - 0.4, SB_END - SB_AT))), transform: `translate(${(x - 960) * (push - 1)}px, ${(y + PH + 16 - 540) * (push - 1) + (1 - e) * 16}px)` });
    } });
  });
  // 0:18.5 "That's the most important tip in this video."
  add({ titles: true, at: 18.6, dur: 2.6, html: '<div class="c1-chip"><i></i>The most important tip</div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7)), o = 1 - E.cubic(span(lt, L.dur - 0.35, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translate(-50%, ${(1 - e) * -14}px)` });
  } });
  // 0:21 "The more you describe the experience, not the tech, the better the first draft."
  add({ titles: true, at: 21.1, dur: 5.3, html: `<div class="c1-tip"><div class="c1-tip__a">${masked('Describe the experience,')}</div><div class="c1-tip__b">${masked('not the tech.')}</div><div class="c1-tip__c cap"><span class="mask"><i>The better the first draft</i></span></div></div>`,
    fx: (lt, L) => {
      const out = L.dur - 0.5;
      rise([...L.el.querySelectorAll('.c1-tip__a i')], lt, 0.05, { stagger: 0.022, dur: 0.9, out });
      rise([...L.el.querySelectorAll('.c1-tip__b i')], lt, 1.4, { stagger: 0.03, dur: 0.9, out });
      rise([L.el.querySelector('.c1-tip__c i')], lt, 2.9, { dur: 0.9, out });
    } });

  // ------------------------------------------------------------ 0:26.4 "And version one worked." floated, assembled, stone and glass
  const v1look = (lt, L) => drift({ s: [1.0, 1.03], fin: L.at === 26.4 + OFF ? 0.35 : 0.14, filter: 'saturate(0.88)' })(lt, L);
  add({ src: 'c1_float', at: 26.4, dur: 2.15, from: 0.6, speed: 1.2, fx: v1look });
  add({ src: 'c1_assemble', at: 28.4, dur: 2.15, from: 0.3, speed: 1.6, fx: v1look });
  add({ src: 'c1_sweep', at: 30.4, dur: 2.35, from: 0.5, speed: 1.3, fx: v1look });
  add({ titles: true, at: 26.4, dur: 13.2, html: '<div class="tag"><i></i>VERSION 1</div>', fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0.1, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.el.querySelector('i'), { opacity: Math.floor(lt * 2) % 2 ? 0.25 : 1 });
  } });

  // ------------------------------------------------------------ 0:32.6 "But look closer." the cliff, then the walls
  const CLIFF = { x: 980, y: 660 }, BRICK = { x: 1170, y: 620 };
  add({ src: 'c1_cliff4k', at: 32.6, dur: 4.4, from: 0.2, crop: crop(5, toward(CLIFF.x, CLIFF.y, 1920, 820, E.cubic)), fx: drift({ s: [1, 1], fin: 0.25, filter: 'saturate(0.9)' }) });
  add({ src: 'c1_brick4k', at: 36.9, dur: 2.9, from: 0.5, crop: crop(5, toward(BRICK.x, BRICK.y, 1500, 1020)), fx: drift({ s: [1, 1], fin: 0.2, filter: 'saturate(0.9)' }) });
  const note = (at, dur, label, x, y, r) => add({ titles: true, at, dur, html: `
    <svg class="c1-ring" width="1920" height="1080" viewBox="0 0 1920 1080"><circle cx="${x}" cy="${y}" r="${r}" pathLength="1"/><path d="M${x + r * 0.72} ${y - r * 0.72} L${x + r * 1.25} ${y - r * 1.25} L${x + r * 1.25 + 90} ${y - r * 1.25}" pathLength="1"/></svg>
    <div class="c1-note" style="left:${x + r * 1.25 + 104}px;top:${y - r * 1.25 - 30}px"><span class="cap">Version 1</span><b>${label}</b></div>`,
  fx: (lt, L) => {
    const [c, l] = L.el.querySelectorAll('circle, path');
    const k = E.cubic(span(lt, 0, 0.7)), k2 = E.cubic(span(lt, 0.5, 0.9)), o = 1 - E.sine(span(lt, L.dur - 0.3, L.dur));
    css(c, { strokeDashoffset: 1 - k }); css(l, { strokeDashoffset: 1 - k2 });
    css(L.el.firstElementChild, { opacity: o });
    const e = E.outQuint(span(lt, 0.75, 1.4));
    css(L.el.querySelector('.c1-note'), { opacity: e * o, transform: `translateX(${(1 - e) * -20}px)` });
  } });
  note(34.7, 2.25, 'Crazy paving', 880, 560, 170);
  note(37.6, 2.2, 'Grey brick', 1100, 520, 140);

  // ------------------------------------------------------------ 0:39.6 "It's a demo, not architecture."
  add({ src: 'c1_cliff4k', at: 39.6, dur: 5.4, from: 3.0, crop: crop(7, toward(1000, 560, 1920, 1820)), fx: (lt, L) => {
    drift({ s: [1, 1], fin: 0.3 })(lt, L);
    const d = E.sine(span(lt, 0.1, 0.8));
    if (T) L.el.style.filter = `saturate(${lerp(0.9, 0.55, d)}) brightness(${lerp(1, 0.62, d)})`;
  } });
  add({ titles: true, at: 40.1, dur: 4.6, html: `<div class="c1-end"><div class="c1-end__a">${masked('A demo,')}</div><div class="c1-end__b">${masked('not architecture.')}</div></div>`,
    fx: (lt, L) => {
      rise([...L.el.querySelectorAll('.c1-end__a i')], lt, 0.1, { stagger: 0.03, dur: 0.9 });
      rise([...L.el.querySelectorAll('.c1-end__b i')], lt, 0.7, { stagger: 0.03, dur: 0.9 });
    } });

  // the chapter's label, top left, at the start
  add({ titles: true, at: 0.4, dur: 4.2, html: '<div class="c1-label"><span class="cap">01</span><b>The first prompt</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });

  return { duration: 45 + OFF, fadeIn: 0.8, grain: (t) => (t >= 26.4 + OFF && t < 39.6 + OFF ? 0.1 : 0.06) };
};
