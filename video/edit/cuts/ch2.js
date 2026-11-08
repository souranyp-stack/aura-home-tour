// Chapter 2 · "The creative-director review" (script 4:40), about 1:25.
// d668dca (what was reviewed) against 45dc2b6 (the commit that fixed it): wipes
// from one shared camera where the framing is the same, side by side where the
// framing is the point. Then the 60 fps rule, and ambient occlusion on and off.
window.CUTS = window.CUTS || {};
window.CUTS.ch2 = (api) => {
  const { add, drift, E, span, lerp, css, T, masked, rise } = api;

  const crop = (seconds, path) => (st) => {
    const c = path(Math.min(1, Math.max(0, st / seconds)));
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });

  // ------------------------------------------------------------ 0:00 "This is the move I use on every project."
  add({ src: 'c1_cliff4k', at: 0, dur: 3.2, from: 1, crop: crop(7, (u) => { const k = E.sine(u), w = lerp(1920, 1780, k); return { x: 960 - w / 2, y: 540 - (w * 9) / 32, w }; }), fx: (lt, L) => {
    drift({ s: [1, 1], fin: 0.6 })(lt, L);
    L.el.style.filter = 'saturate(0.8) brightness(0.62)';
  } });
  add({ titles: true, at: 0.4, dur: 2.6, html: '<div class="c1-label"><span class="cap">02</span><b>The creative-director review</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });
  // 0:03 "Instead of saying 'make it better,'"
  add({ at: 3.0, dur: 2.9, html: '<div class="c1-room"></div><div class="c1-not c2-not"><span class="c1-not__w">“make it better”</span><i class="c1-not__line"></i></div>', fx: (lt, L) => {
    fades(L, lt, 0.3, 0.3);
    const not = L.el.querySelector('.c1-not'), e = E.outQuint(span(lt, 0.05, 0.8));
    css(not, { opacity: e, transform: `translate(-50%, ${(1 - e) * 30}px)` });
    css(L.el.querySelector('.c1-not__line'), { transform: `scaleX(${E.cubic(span(lt, 1.3, 1.9))})` });
    css(L.el.querySelector('.c1-not__w'), { opacity: lerp(1, 0.45, E.sine(span(lt, 1.6, 2.2))) });
  } });
  // 0:05.6 "I ask the AI to criticize its own work first." the review prompt
  const PROMPT = 'Review this like a creative director at a top architectural visualization studio. List the five biggest problems, ranked by visual impact, then fix them in that order.';
  const BEATS = ['a creative director', 'the five biggest problems', 'ranked by visual impact', 'fix them in that order'];
  const runs = [];
  { let rest = PROMPT; for (const [i, b] of BEATS.entries()) { const at = rest.indexOf(b); runs.push([rest.slice(0, at), -1], [b, i]); rest = rest.slice(at + b.length); } runs.push([rest, -1]); }
  add({ at: 5.6, dur: 6.3, html: '<div class="c1-room"></div><div class="c1-card c2-card"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap">The review prompt</span></div><p class="c1-prompt"></p></div>', fx: (lt, L) => {
    fades(L, lt, 0.3, 0.35);
    const shown = Math.floor(PROMPT.length * E.sine(span(lt, 0.15, 3.7)) ** 0.92);
    let n = 0, html = '', caret = false;
    for (const [text, b] of runs) {
      const vis = Math.max(0, Math.min(text.length, shown - n)); n += text.length;
      const k = b < 0 ? 0 : E.outCubic(span(lt, 3.8 + b * 0.45, 4.4 + b * 0.45));
      html += b < 0 ? '' : `<span class="c1-beat" style="--k:${k.toFixed(3)}">`;
      html += text.slice(0, vis);
      if (vis < text.length) {
        if (!caret) { html += '<i class="caret c1-caret"></i>'; caret = true; }
        html += `<span class="c1-ghost">${text.slice(vis)}</span>`;
      }
      html += b < 0 ? '' : '</span>';
    }
    if (shown >= PROMPT.length) html += `<i class="caret c1-caret" style="opacity:${Math.floor(lt * 2.2) % 2 ? 0 : 1}"></i>`;
    L.el.querySelector('.c1-prompt').innerHTML = html;
    css(L.el.querySelector('.c1-card'), { transform: `scale(${lerp(0.98, 1.03, E.sine(lt / L.dur))})` });
  } });
  // 0:11.6 "It came back with five problems."
  const FIVE = [['Materials read fake', 'Bedded coastal limestone. Long, low ashlar walls.'], ['No golden hour', 'The sun now sets over the sea: 18:42 to 19:43.'], ['The camera stared at a blank wall', 'Every shot re-composed from the sea side.'], ['The sculpture didn’t make sense', 'Re-designed, so nothing passes through anything.'], ['Performance', 'Meshes merged by material: 349 draw calls to 119.']];
  add({ at: 11.6, dur: 3.2, html: `<div class="c1-room"></div><div class="c2-list"><span class="cap">The review came back</span>${FIVE.map(([t], i) => `<div class="c2-row"><em>${i + 1}</em><b>${t}</b></div>`).join('')}</div>`, fx: (lt, L) => {
    fades(L, lt, 0.3, 0.3);
    L.el.querySelectorAll('.c2-row').forEach((r, i) => {
      const e = E.outQuint(span(lt, 0.15 + i * 0.13, 0.95 + i * 0.13));
      css(r, { opacity: e, transform: `translateX(${(1 - e) * -36}px)` });
    });
  } });

  // ------------------------------------------------------------ the five problems
  const heading = (n, at, dur) => add({ titles: true, at: at + 0.1, dur: dur - 0.2, html: `<div class="s-shade"></div><div class="c2-fix"><span class="cap">Problem ${n + 1}</span><b>${FIVE[n][0]}</b><p>${FIVE[n][1]}</p></div>`, fx: (lt, L) => {
    const box = L.el.querySelector('.c2-fix'), a = E.outQuint(span(lt, 0, 0.9)), b = E.outQuint(span(lt, 0.9, 1.7)), o = 1 - E.cubic(span(lt, L.dur - 0.35, L.dur));
    css(L.el, { opacity: o });
    css(box.querySelector('b'), { opacity: a, transform: `translateY(${(1 - a) * 22}px)` });
    css(box.querySelector('.cap'), { opacity: a });
    css(box.querySelector('p'), { opacity: b, transform: `translateY(${(1 - b) * 14}px)` });
  } });
  // a wipe between two takes of one camera: the bronze line travels, then settles
  const wipe = (name, at, dur, from, [lb, la] = ['Before', 'After'], [b, a] = [`${name}_b`, `${name}_a`]) => {
    const pos = (lt) => { const u = lt / dur; return lerp(lerp(0.84, 0.16, E.cubic(span(u, 0.08, 0.5))), 0.5, E.cubic(span(u, 0.55, 0.85))); };
    add({ src: b, at, dur: dur + 0.2, from, fx: drift({ s: [1, 1], fin: 0.25 }) });
    add({ src: a, at, dur: dur + 0.2, from, fx: (lt, L) => {
      css(L.el, { clipPath: `inset(0 0 0 ${(pos(lt) * 100).toFixed(3)}%)`, opacity: E.sine(span(lt, 0, 0.25)) });
    } });
    add({ at, dur, html: '<i class="wipeline"></i>', fx: (lt, L) => {
      css(L.el.firstChild, { left: `${pos(lt) * 1920 - 1.5}px`, opacity: E.sine(span(lt, 0.1, 0.4)) * (1 - E.sine(span(lt, dur - 0.3, dur))) });
    } });
    add({ titles: true, at: at + 0.2, dur: dur - 0.35, html: `<span class="c2-tag" style="left:48px">${lb}</span><span class="c2-tag" style="right:48px">${la}</span>`, fx: (lt, L) => {
      css(L.el, { opacity: E.sine(span(lt, 0, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    } });
  };
  // two panels side by side, where the difference is the framing
  const PW = 900, PH = (PW * 9) / 16, X = [42, 978], Y = 200;
  const pairUp = (name, at, dur, from, caps = ['Before', 'After'], speed = 1) => {
    add({ at, dur: dur + 0.2, html: '<div class="c1-room"></div>' });
    ['b', 'a'].forEach((k, i) => {
      add({ src: `${name}_${k}`, at, dur: dur + 0.2, from, speed, cls: 'c1-panel c2-panel', fx: (lt, L) => {
        const e = E.outQuint(span(lt, i * 0.12, 0.8 + i * 0.12));
        css(L.el, { opacity: e, transform: `translate(${X[i]}px, ${Y + (1 - e) * 30}px) scale(${PW / 1920})` });
      } });
    });
    add({ titles: true, at: at + 0.2, dur: dur - 0.35, html: caps.map((c, i) => `<span class="c2-tag" style="left:${X[i] + 20}px;top:${Y + 18}px">${c}</span>`).join(''), fx: (lt, L) => {
      css(L.el, { opacity: E.sine(span(lt, 0.1, 0.5)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    } });
  };

  // 1 · 0:14.8 materials: the cliff, then the walls
  wipe('c2_cliff', 14.8, 5, 0.2);
  wipe('c2_wall', 19.8, 5, 0.2);
  heading(0, 14.8, 10);
  // 2 · 0:24.8 no golden hour
  wipe('c2_gold', 24.8, 10, 0.4);
  heading(1, 24.8, 10);
  // 3 · 0:34.8 the blank wall
  pairUp('c2_blank', 34.8, 10, 0.4, ['Stared at a blank wall', 'From the sea side']);
  heading(2, 34.8, 10);
  // 4 · 0:44.8 the sculpture
  pairUp('c2_sculpt', 44.8, 5, 0.2, ['An arbitrary shape', 'A stacked tower']);
  pairUp('c2_build', 49.8, 5, 0.2, ['Assembling', 'Assembling, bottom up']);
  heading(3, 44.8, 10);
  // 5 · 0:54.8 performance: every colour is one draw call
  pairUp('c2_calls', 54.8, 10, 0.4, ['Before', 'After']);
  heading(4, 54.8, 10);
  add({ titles: true, at: 55.3, dur: 9.2, html: `<div class="c2-count" style="left:${X[0]}px;width:${PW}px"><b data-n="349">0</b><span class="cap">draw calls</span></div><div class="c2-count" style="left:${X[1]}px;width:${PW}px"><b data-n="119">0</b><span class="cap">draw calls</span></div><div class="c2-hint cap">Every colour is one mesh</div>`, fx: (lt, L) => {
    L.el.querySelectorAll('[data-n]').forEach((b, i) => { b.textContent = Math.round(+b.dataset.n * E.outCubic(span(lt, 0.3 + i * 0.25, 1.9 + i * 0.25))); });
    css(L.el, { opacity: E.sine(span(lt, 0.1, 0.5)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
  } });

  // ------------------------------------------------------------ 1:04.8 the hard rule
  add({ src: 'c2_film', at: 64.8, dur: 4.9, from: 0.5, fx: (lt, L) => {
    drift({ s: [1, 1.03], fin: 0.3 })(lt, L);
    if (T) L.el.style.filter = `brightness(${lerp(1, 0.55, E.sine(span(lt, 0.2, 0.9)))})`;
  } });
  add({ titles: true, at: 65.1, dur: 4.3, html: `<div class="c2-sixty"><div class="c2-sixty__n">${masked('60')}</div><span class="cap">Frames per second · 16.7 ms a frame</span></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('.c2-sixty__n i')], lt, 0.1, { stagger: 0.08, dur: 1, out: L.dur - 0.45 });
    css(L.el.querySelector('.cap'), { opacity: E.sine(span(lt, 0.7, 1.2)) * (1 - E.sine(span(lt, L.dur - 0.45, L.dur))) });
  } });
  // 1:09.4 "turning off ambient occlusion in the wide landscape shots"
  wipe('c2_ao', 69.5, 6.4, 0.5, ['Ambient occlusion on', 'Off'], ['c2_ao_on', 'c2_ao_off']);
  // 1:16 "and capping the pixel ratio." the real line
  add({ at: 75.9, dur: 3.2, html: `<div class="c1-room"></div><div class="s-win c2-code"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">src/main.js</span></div><pre class="s-win__b c2-diff"></pre></div>`, fx: (lt, L) => {
    fades(L, lt, 0.3, 0.3);
    const lineAt = (at) => { const e = E.outCubic(span(lt, at, at + 0.35)); return `opacity:${e.toFixed(3)};transform:translateY(${((1 - e) * 8).toFixed(1)}px);display:block`; };
    L.el.querySelector('pre').innerHTML = `<span style="${lineAt(0.3)}" class="c2-del">- const maxDpr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75);</span><span style="${lineAt(0.9)}" class="c2-add">+ const maxDpr = Math.min(window.devicePixelRatio, 1.5);</span>`;
    css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.04, E.sine(lt / L.dur))})` });
  } });
  // 1:19 "You don't notice the difference. Your laptop fan does."
  add({ src: '17_end', at: 79, dur: 5.5, from: 1.2, fx: (lt, L) => {
    drift({ s: [1.05, 1], fin: 0.4 })(lt, L);
    if (T) L.el.style.filter = `brightness(${lerp(1, 0.58, E.sine(span(lt, 0.1, 0.8)))})`;
  } });
  add({ titles: true, at: 79.3, dur: 5, html: `<div class="c1-end" style="place-content:start center;padding-top:76px"><div class="c2-end__a">${masked('You don’t notice the difference.')}</div><div class="c1-end__b">${masked('Your laptop fan does.')}</div></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('.c2-end__a i')], lt, 0.05, { stagger: 0.016, dur: 0.8 });
    rise([...L.el.querySelectorAll('.c1-end__b i')], lt, 1.35, { stagger: 0.022, dur: 0.9 });
  } });

  return { duration: 84.5, fadeIn: 0.6, grain: () => 0.06 };
};
