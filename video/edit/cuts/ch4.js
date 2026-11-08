// Chapter 4 · "The landing page sections with GSAP" (script 8:20), about 1:50.
// The real page below the film, one section at a time, then the two lessons: the
// CSS accordion (c68c346) that became the roll, and the pin that started too early
// (the real bug, put back in 7eadd7c), and last the liquid bronze button.
window.CUTS = window.CUTS || {};
window.CUTS.ch4 = (api) => {
  const { add, drift, E, span, lerp, css, T, masked, rise, labelFx } = api;

  const frameOf = (c) => {
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x - w / 2)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y - (w * 9) / 32));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const moves = (keys) => (st) => {
    let c = keys[keys.length - 1][1];
    if (st <= keys[0][0]) c = keys[0][1];
    else for (let i = 1; i < keys.length; i++) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i];
      if (st <= t1) { const k = E.sine((st - t0) / (t1 - t0)); c = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k) }; break; }
    }
    return frameOf(c);
  };
  const FULL = { x: 960, y: 540, w: 1920 };
  const still = (c) => () => frameOf(c);
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const say = (at, dur, small, big, cls = '') => add({ titles: true, at, dur, html: `<div class="s-shade"></div><div class="label ${cls}"><div class="label__n cap">${small}</div><div class="label__w c3-w"><span class="mask"><i>${big}</i></span></div></div>`, fx: labelFx });
  const vtag = (at, dur, text) => add({ titles: true, at, dur, html: `<div class="tag"><i></i>${text}</div>`, fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0.05, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.el.querySelector('i'), { background: '#edc98f', boxShadow: '0 0 14px #edc98f' });
  } });
  const big = (at, dur, a, b = '') => add({ titles: true, at, dur, html: `<div class="c4-big"><div class="c4-big__a">${masked(a)}</div>${b ? `<div class="c4-big__b">${masked(b)}</div>` : ''}</div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.02, dur: 0.8, out: L.dur - 0.4 });
  } });

  // code and files, in the same window as the stack section
  const window_ = (title, body, cls = '') => `<div class="c1-room"></div><div class="s-win c4-win ${cls}"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">${title}</span></div><pre class="s-win__b">${body}</pre></div>`;
  const push = (L, lt, dur) => css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.04, E.sine(lt / dur))})` });
  // rows arrive one after another; .hot rows then light up at `lit`
  const rows = (L, lt, at, lit) => {
    [...L.el.querySelectorAll('.r')].forEach((r, i) => {
      const e = E.outCubic(span(lt, at + i * 0.09, at + i * 0.09 + 0.35));
      css(r, { opacity: e, transform: `translateY(${(1 - e) * 8}px)` });
    });
    L.el.querySelectorAll('.hot').forEach((r) => r.style.setProperty('--k', E.cubic(span(lt, lit, lit + 0.7))));
  };
  const code = (s) => `<span class="r">${s}</span>`;
  const hot = (s) => `<span class="r hot">${s}</span>`;

  // ------------------------------------------------------------ 0:00 "After the film, the page becomes a proper landing page"
  add({ src: 'c4_handover', at: 0, dur: 4.2, from: 2.8, fx: drift({ s: [1, 1], fin: 0.3 }) });
  add({ titles: true, at: 0.3, dur: 3.4, html: '<div class="c1-label"><span class="cap">04</span><b>The landing page</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });
  // 0:04 "...and every section is animated with GSAP." six sections, all running
  const PW = 560, PH = 315, GX = 30, X0 = 90, Y0 = [120, 505];
  add({ at: 4.0, dur: 4.3, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.3, 0.01) });
  [['c4_manifesto', 'Manifesto', 2], ['c4_section', 'Drawings', 2.6], ['c4_materials', 'Materials', 3], ['c4_day', 'A day on the headland', 5], ['c4_roll', 'The drawing', 5], ['c4_approach', 'The approach', 4]].forEach(([src, name, from], i) => {
    const x = X0 + (i % 3) * (PW + GX), y = Y0[i > 2 ? 1 : 0], a = 0.1 + i * 0.13;
    add({ src, at: 4.0, dur: 4.3, from, speed: 1.2, cls: 'c1-panel c3-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, a, a + 0.8));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 3.95, 4.3))), transform: `translate(${x}px, ${y + (1 - e) * 30}px) scale(${PW / 1920})` });
    } });
    add({ titles: true, at: 4.0, dur: 4.2, html: `<div class="c3-under" style="left:${x}px;width:${PW}px;top:${y + PH + 12}px"><span class="cap">${name}</span></div>`, fx: (lt, L) => {
      css(L.el.firstChild, { opacity: E.sine(span(lt, a + 0.25, a + 0.7)) * (1 - E.sine(span(lt, 3.85, 4.2))) });
    } });
  });
  add({ titles: true, at: 4.6, dur: 3.6, html: `<div class="c4-gsap">${masked('Every section, animated with GSAP.')}</div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.016, dur: 0.8, out: L.dur - 0.4 });
  } });

  // ------------------------------------------------------------ the six sections
  // 0:08.3 Manifesto: one sentence, pinned, lit word by word
  add({ src: 'c4_manifesto', at: 8.3, dur: 6.0, from: 0.8, speed: 1.4, crop: moves([[0, FULL], [9, { x: 930, y: 520, w: 1740 }]]), fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(8.6, 5.5, 'SplitText, word by word', 'Manifesto', 'c4-r');
  // 0:14.3 Drawings: generated from the model, drawn on with DrawSVG
  add({ src: 'c4_section', at: 14.3, dur: 5.0, from: 0.8, speed: 1.3, crop: moves([[0, FULL], [8, { x: 960, y: 540, w: 1700 }]]), fx: drift({ s: [1, 1], fin: 0.25 }) });
  add({ src: 'c4_plans', at: 19.3, dur: 4.0, from: 1.2, speed: 1.3, crop: moves([[0, FULL], [7, { x: 960, y: 520, w: 1720 }]]), fx: drift({ s: [1, 1], fin: 0.2 }) });
  say(14.6, 4.5, 'Generated from the model’s own coordinates', 'Drawings');
  say(19.5, 3.6, 'Drawn on with DrawSVG as you scroll', 'Plans');
  // 0:23.3 Materials: a pinned horizontal gallery, rendered live
  add({ src: 'c4_materials', at: 23.3, dur: 6.5, from: 1.5, speed: 1.25, fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(23.6, 5.9, 'A pinned gallery, every sample rendered live', 'Materials');
  // 0:29.8 A day on the headland: eighteen hours, a 24-hour dial
  add({ src: 'c4_day', at: 29.8, dur: 7.0, from: 0.2, speed: 1.65, fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(30.1, 6.4, 'Eighteen hours, a 24-hour sun and moon dial', 'A day on the headland', 'c4-r c4-t');
  // 0:36.8 The drawing: a roll of paper that unrolls in 3D
  add({ src: 'c4_roll', at: 36.8, dur: 4.5, from: 2.0, speed: 2, fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(37.1, 3.9, 'A roll of paper that unrolls in 3D', 'The drawing');
  // 0:41.3 The approach: a relief map, the camera flying down the coast road
  add({ src: 'c4_approach', at: 41.3, dur: 7.0, from: 1.0, speed: 1.6, fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(41.6, 6.4, 'The camera flies down the coast road', 'The approach', 'c4-t');
  // the boxed map it replaced (008c734), as an inset
  add({ src: 'c4_boxed', at: 42.5, dur: 3.6, from: 1.0, speed: 1, cls: 'c1-panel c3-panel', titles: true, fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7)), o = 1 - E.sine(span(lt, 3.2, 3.6));
    css(L.el, { opacity: e * o, transform: `translate(1370px, ${60 + (1 - e) * 24}px) scale(${480 / 1920})` });
  } });
  add({ titles: true, at: 42.6, dur: 3.5, html: '<div class="c3-under" style="left:1370px;width:480px;top:342px"><span class="cap">First version</span></div>', fx: (lt, L) => fades(L, lt, 0.5, 0.4) });

  // ------------------------------------------------------------ 0:48.3 "Two lessons from this part."
  add({ at: 48.3, dur: 2.2, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.3, 0.01) });
  big(48.5, 1.9, 'Two lessons');
  // 0:50.5 "First, the paper roll."
  add({ src: 'c4_roll', at: 50.5, dur: 1.9, from: 0.2, speed: 0.6, fx: drift({ s: [1, 1.02], fin: 0.2 }) });
  say(50.7, 1.7, 'Lesson one', 'The paper roll');
  // 0:52.4 "The first version was CSS panels folding like an accordion"
  add({ src: 'c4_accordion', at: 52.4, dur: 4.4, from: 2.6, speed: 1.02, fx: drift({ s: [1, 1], fin: 0.2 }) });
  vtag(52.6, 8.0, 'First version');
  say(52.8, 3.9, 'CSS panels, folding', 'Like an accordion');
  // 0:56.8 "and it looked stiff, because CSS can only hinge."
  add({ src: 'c4_accordion', at: 56.8, dur: 3.9, from: 4.17, speed: 0.012, blend: true, fx: drift({ s: [1, 1], fin: 0.12 }) });
  const HX = [957, 430, 1014, 777];
  add({ titles: true, at: 57.0, dur: 3.6, html: `<svg class="c1-ring" width="1920" height="1080" viewBox="0 0 1920 1080"><path d="M${HX[0]} ${HX[1]} L${HX[2]} ${HX[3]}" pathLength="1"/></svg><div class="c1-note" style="left:1290px;top:620px"><span class="cap">All CSS can do</span><b>A hinge</b></div>`, fx: (lt, L) => {
    const k = E.cubic(span(lt, 0, 0.7)), o = 1 - E.sine(span(lt, L.dur - 0.3, L.dur));
    css(L.el.querySelector('path'), { strokeDashoffset: 1 - k });
    css(L.el.firstElementChild, { opacity: o });
    const e = E.outQuint(span(lt, 0.5, 1.1));
    css(L.el.querySelector('.c1-note'), { opacity: e * o, transform: `translateX(${(1 - e) * -20}px)` });
  } });
  // 1:00.7 "Paper curls."
  add({ src: 'c4_roll', at: 60.7, dur: 1.7, from: 5.0, speed: 0.5, fx: drift({ s: [1.02, 1.05], fin: 0.2, filter: 'brightness(0.7)' }) });
  big(60.8, 1.55, 'Paper curls.');
  // 1:02.4 "So it became a small Three.js scene that unrolls along a spiral, and the roll shrinks as it goes."
  add({ at: 62.4, dur: 5.2, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.3, 0.01) });
  add({ src: 'c4_roll', at: 62.4, dur: 5.2, from: 3.6, speed: 1, cls: 'c1-panel c3-panel', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.8));
    css(L.el, { opacity: e * (1 - E.sine(span(lt, 4.9, 5.2))), transform: `translate(60px, ${170 + (1 - e) * 26}px) scale(${1340 / 1920})` });
  } });
  add({ titles: true, at: 62.6, dur: 4.9, html: '<div class="c1-label c4-head"><span class="cap">A small Three.js scene</span><b>Unrolls along a spiral</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });
  // "and the roll shrinks as it goes." following the end of the roll, where the spiral shows
  const TRACK = [[5.6, 1130, 760], [7, 1245, 770], [8, 1350, 780], [9, 1521, 790], [9.2, 1550, 790]];
  add({ src: 'c4_roll', at: 67.6, dur: 3.1, from: 5.6, speed: 1.08, crop: (st) => {
    let i = 0; while (i < TRACK.length - 2 && st > TRACK[i + 1][0]) i++;
    const [t0, x0, y0] = TRACK[i], [t1, x1, y1] = TRACK[i + 1], k = Math.min(1, (st - t0) / (t1 - t0));
    return frameOf({ x: lerp(x0, x1, k), y: lerp(y0, y1, k), w: 1000 });
  }, fx: drift({ s: [1, 1], fin: 0.2 }) });
  say(67.8, 2.8, 'As it goes', 'The roll shrinks');
  // the spiral itself: the sheet's real numbers, side on
  const W = 16, TK = 0.07, R0 = 0.3, A = TK / (2 * Math.PI), SC = 190;
  const thetaOf = (len) => (-R0 + Math.sqrt(R0 * R0 + 2 * A * len)) / A;
  const TBL = 260, CX = 260;
  add({ titles: true, at: 62.6, dur: 4.9, html: `<div class="c4-sp"><svg width="440" height="300" viewBox="0 0 440 300"><line class="c4-sp__t" x1="0" y1="${TBL}" x2="440" y2="${TBL}"/><path class="c4-sp__p" fill="none"/></svg><div class="cap">Archimedean spiral</div></div>`, fx: (lt, L) => {
    const o = E.sine(span(lt, 0, 0.5)) * (1 - E.sine(span(lt, L.dur - 0.4, L.dur)));
    css(L.el.firstChild, { opacity: o });
    const u = E.sine(span(lt, 0.1, L.dur - 0.2)) * 0.94, wound = W * (1 - u), m = thetaOf(wound);
    const end = R0 + A * m, cy = TBL - end * SC, pts = [];
    for (let i = 0; i <= 360; i++) { const th = (m * i) / 360, r = (R0 + A * th) * SC, a = Math.PI / 2 - (m - th); pts.push(`${(CX + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`); }
    L.el.querySelector('path').setAttribute('d', `M0,${TBL} L${CX},${TBL} L${pts.reverse().join(' L')}`);
  } });

  // ------------------------------------------------------------ 1:10.7 "Second, a GSAP gotcha that cost me an hour."
  add({ at: 70.7, dur: 3.9, html: window_('src/ui/page.js', [
    code('<span class="s-dim">// materials: pinned horizontal gallery</span>'),
    code(`scrollTrigger: { trigger: <span class="s-g">'#materials'</span>, pin, start: <span class="s-g">'top top'</span> }`),
    code(' '),
    hot('<span class="s-dim">// Called from where its pin belongs in page order: ScrollTrigger measures each pin</span>'),
    hot('<span class="s-dim">// after the ones created before it, so this has to come after the Materials pin.</span>'),
    hot('<span class="s-b">setUpApproach</span>();'),
  ].join(''), 'c4-code'), fx: (lt, L) => { fades(L, lt, 0.25, 0.25); push(L, lt, L.dur); rows(L, lt, 0.15, 1.3); } });
  add({ titles: true, at: 70.9, dur: 3.5, html: '<div class="c1-label"><span class="cap">Lesson two</span><b>A GSAP gotcha</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });

  // 1:14.6 "ScrollTrigger measures pinned sections in the order you create them."
  // 1:19.3 "Create them out of order and your pin starts in the wrong place."
  // The page as a strip. Each section's pin is measured when it is created, so a
  // pin created before the Materials pin never hears about the room that adds.
  const S = 330, MX = 310, MW = 300, GW = 300, AW = 290, TOP = 450, DIA = 7.3;
  add({ at: 74.6, dur: DIA, html: `<div class="c1-room"></div><div class="c4-d">
      <div class="c4-d__head"><span class="cap c4-d__h1">Created in page order</span><span class="cap c4-d__h2">Created out of order</span></div>
      <div class="c4-d__blk c4-d__m" style="top:${TOP}px"><b>Materials pin</b><i class="c4-d__n"></i><u></u></div>
      <div class="c4-d__blk c4-d__g" style="top:${TOP}px;width:${GW}px"><b>The sections between</b></div>
      <div class="c4-d__blk c4-d__a" style="top:${TOP}px;width:${AW}px"><b>Approach pin</b><i class="c4-d__n"></i></div>
      <div class="c4-d__mark" style="top:${TOP - 110}px"><span class="cap">pin start</span></div>
      <div class="c4-d__gap" style="top:${TOP + 210}px"><span></span><b class="cap">Too early</b></div>
    </div>`, build: (L) => { L.q = (s) => L.el.querySelector(s); }, fx: (lt, L) => {
    fades(L, lt, 0.25, 0.25);
    const OUT = 4.7, late = lt >= OUT;
    // room the Materials pin adds to the page
    const grow = late ? E.cubic(span(lt, 6.0, 6.8)) * 1 : E.cubic(span(lt, 0.9, 1.7));
    const shrink = late ? 0 : 0;
    const room = (grow - shrink) * S, ax = MX + MW + room + 40 + GW + 40;
    css(L.q('.c4-d__m'), { left: `${MX}px`, width: `${MW + room}px` });
    css(L.q('.c4-d__g'), { left: `${MX + MW + room + 40}px` });
    css(L.q('.c4-d__a'), { left: `${ax}px` });
    const collapsed = MX + MW + 40 + GW + 40;
    // the marker lands where the approach was when it was measured
    const drop = late ? E.outCubic(span(lt, 5.25, 5.8)) : E.outCubic(span(lt, 2.1, 2.65));
    const mx = late ? collapsed : MX + MW + S + 40 + GW + 40;
    css(L.q('.c4-d__mark'), { left: `${mx}px`, opacity: Math.min(1, drop * 2), transform: `translateY(${(1 - drop) * -46}px)` });
    L.q('.c4-d__mark').classList.toggle('is-bad', late);
    const [nm, na] = [L.q('.c4-d__m .c4-d__n'), L.q('.c4-d__a .c4-d__n')];
    nm.textContent = late ? '2' : '1'; na.textContent = late ? '1' : '2';
    css(nm, { opacity: late ? E.sine(span(lt, 5.8, 6.1)) : E.sine(span(lt, 0.4, 0.8)) });
    css(na, { opacity: late ? E.sine(span(lt, 4.95, 5.25)) : E.sine(span(lt, 1.8, 2.1)) });
    css(L.q('.c4-d__h1'), { opacity: E.sine(span(lt, 0.2, 0.6)) * (1 - E.sine(span(lt, 4.3, 4.7))) });
    css(L.q('.c4-d__h2'), { opacity: E.sine(span(lt, 4.75, 5.1)) });
    const g = E.sine(span(lt, 6.1, 6.8));
    css(L.q('.c4-d__gap'), { left: `${collapsed}px`, width: `${room}px`, opacity: late ? g : 0 });
  } });
  // 1:21.9 the real bug: the map arrives on top of the section before it
  add({ src: 'c4_bug', at: 81.9, dur: 3.0, from: 3.1, speed: 1, fx: drift({ s: [1, 1], fin: 0.15 }) });
  vtag(82.1, 6.1, 'The real bug');
  // 1:24.9 "Mine started 1,400 pixels too early."
  add({ src: 'c4_bug', at: 84.9, dur: 3.5, from: 6.1, speed: 0.04, blend: true, fx: drift({ s: [1, 1.02], fin: 0.1, filter: 'brightness(0.55)' }) });
  add({ titles: true, at: 85.0, dur: 3.3, html: '<div class="c4-px"><b>0</b><span class="cap">pixels too early</span></div>', fx: (lt, L) => {
    const k = E.outCubic(span(lt, 0.1, 1.2));
    L.el.querySelector('b').textContent = Math.round(1400 * k).toLocaleString('en-US');
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0, 0.25)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
  } });

  // ------------------------------------------------------------ 1:28.4 "And this button comes from ThreeUI, the Liquid Metal Button."
  const BTN = { x: 1255, y: 558 };
  add({ src: 'c4_button', at: 88.4, dur: 7.6, from: 0.2, crop: moves([[0.2, FULL], [3.2, { ...BTN, w: 760 }], [7.8, { ...BTN, w: 640 }]]), fx: drift({ s: [1, 1], fin: 0.3 }) });
  say(88.7, 4.0, 'From ThreeUI', 'The Liquid Metal Button');
  say(92.9, 2.9, 'When you hover', 'Metal pours across it');
  // 1:36 "It's MIT licensed, so I kept the license notice in the project,"
  add({ at: 96.0, dur: 5.1, html: window_('THIRD_PARTY_NOTICES.md', [
    code('<span class="s-b">## ThreeUI: Liquid Metal Button</span>'),
    code(' '),
    code('<span class="s-dim">`src/ui/metalButton.js` is adapted from the Liquid Metal Button in</span>'),
    code('<span class="s-dim">ThreeUI’s community package, `@designcodeio/threeui` 1.2.0.</span>'),
    code(' '),
    hot('MIT License'),
    code(' '),
    hot('Copyright (c) 2026 Meng To'),
  ].join(''), 'c4-code'), fx: (lt, L) => { fades(L, lt, 0.25, 0.25); push(L, lt, L.dur); rows(L, lt, 0.15, 1.5); } });
  // 1:41.1 "and I wired it to upgrade normal links,"
  add({ at: 101.1, dur: 3.4, html: window_('index.html · metalButton.js', [
    hot('&lt;a class=<span class="s-g">"pill"</span> href=<span class="s-g">"#enquire"</span> <span class="s-b">data-metal</span>&gt;Request a viewing&lt;/a&gt;'),
    code(' '),
    code('<span class="s-b">export function</span> initMetalButtons() {'),
    code(`  document.querySelectorAll(<span class="s-g">'[data-metal]'</span>).forEach(upgrade);`),
    code('}'),
  ].join(''), 'c4-code'), fx: (lt, L) => { fades(L, lt, 0.2, 0.2); push(L, lt, L.dur); rows(L, lt, 0.1, 0.5); } });
  // 1:44.5 "so it still works without WebGL." the same link, with and without
  const PILL = { x: 240, y: 670, w: 480 };
  add({ at: 104.5, dur: 5.5, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.25, 0.01) });
  [['c4_link', 'WebGL', 56], ['c4_link_nogl', 'No WebGL', 978]].forEach(([src, tag, x], i) => {
    add({ src, at: 104.5, dur: 5.5, from: 1.2, crop: still(PILL), cls: 'c1-panel c2-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, i * 0.12, 0.8 + i * 0.12));
      css(L.el, { opacity: e, transform: `translate(${x}px, ${250 + (1 - e) * 30}px) scale(${886 / 1920})` });
    } });
    add({ titles: true, at: 104.6, dur: 4.2, html: `<span class="c2-tag" style="left:${x + 20}px;top:268px">${tag}</span>`, fx: (lt, L) => fades(L, lt, 0.4, 0.3) });
  });
  say(104.8, 4.0, 'No WebGL, still a link', 'It still works');

  return { duration: 110, fadeIn: 0.6, grain: () => 0.06 };
};
