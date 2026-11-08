// Chapter 3 · "The hero: plans that become a house" (script 6:20), about 1:20.
// The hero's three real versions: the tower (09a5de2), the exploded axonometric
// (9c39d09) and the desk opening, with the window-in-the-paper attempt (616b83a)
// that came before the walls rose out of the plan.
window.CUTS = window.CUTS || {};
window.CUTS.ch3 = (api) => {
  const { add, drift, E, span, lerp, css, T, masked, rise, labelFx } = api;

  const frameOf = (c) => {
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x - w / 2)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y - (w * 9) / 32));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  // a crop that moves between framings: keys are [source seconds, {x, y, w}], centres in 1920x1080
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
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const vtag = (at, dur, text) => add({ titles: true, at, dur, html: `<div class="tag"><i></i>${text}</div>`, fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0.05, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.el.querySelector('i'), { background: '#edc98f', boxShadow: '0 0 14px #edc98f' });
  } });
  const say = (at, dur, small, big) => add({ titles: true, at, dur, html: `<div class="s-shade"></div><div class="label"><div class="label__n cap">${small}</div><div class="label__w c3-w"><span class="mask"><i>${big}</i></span></div></div>`, fx: labelFx });

  // ------------------------------------------------------------ 0:00 "three versions... taste matters more than code"
  const PW = 590, PH = (PW * 9) / 16, GX = 30, X0 = (1920 - (3 * PW + 2 * GX)) / 2, PY = 300;
  add({ at: 0, dur: 6.8, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.5, 0.01) });
  [['c3_tower_ui', 'Version 1', 0.2], ['c3_axo_ui', 'Version 2', 0.2], ['c3_now_ui', 'Version 3', 0.6]].forEach(([src, tag, from], i) => {
    const x = X0 + i * (PW + GX), appear = 0.15 + i * 0.28;
    add({ src, at: 0, dur: 6.8, from, cls: 'c1-panel c3-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, appear, appear + 0.9));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 6.4, 6.8))), transform: `translate(${x}px, ${PY + (1 - e) * 34}px) scale(${PW / 1920})` });
    } });
    add({ titles: true, at: 0, dur: 6.6, html: `<div class="c3-under" style="left:${x}px;width:${PW}px;top:${PY + PH + 18}px"><span class="cap">${tag}</span></div>`, fx: (lt, L) => {
      css(L.el.firstChild, { opacity: E.sine(span(lt, appear + 0.3, appear + 0.8)) * (1 - E.sine(span(lt, 6.2, 6.6))) });
    } });
  });
  add({ titles: true, at: 0.3, dur: 3.2, html: '<div class="c1-label"><span class="cap">03</span><b>The hero</b></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });
  add({ titles: true, at: 3.5, dur: 3.1, html: `<div class="c3-taste">${masked('Taste matters more than code.')}</div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.018, dur: 0.8, out: L.dur - 0.4 });
  } });

  // ------------------------------------------------------------ 0:06.6 version one, the tower
  add({ src: 'c3_tower', at: 6.6, dur: 6.9, from: 0.3, fx: drift({ s: [1, 1.03], fin: 0.3 }) });
  vtag(6.8, 6.5, 'Version 1');
  say(7.0, 6.2, 'Looked cool. An arbitrary shape.', 'A stacked tower sculpture');
  // 0:13.2 "It had nothing to do with the house."
  const P2 = 900, H2 = (P2 * 9) / 16, X2 = [42, 978], Y2 = 240;
  add({ at: 13.3, dur: 3.3, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.25, 0.01) });
  [['c3_tower', 6.9], ['04_golden', 1.0]].forEach(([src, from], i) => {
    add({ src, at: 13.3, dur: 3.3, from, cls: 'c1-panel c2-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, i * 0.14, 0.8 + i * 0.14));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 3.0, 3.3))), transform: `translate(${X2[i]}px, ${Y2 + (1 - e) * 30}px) scale(${P2 / 1920})` });
    } });
  });
  add({ titles: true, at: 13.5, dur: 3.0, html: `<div class="c3-ne">≠</div><span class="c2-tag" style="left:${X2[0] + 20}px;top:${Y2 + 18}px">The sculpture</span><span class="c2-tag" style="left:${X2[1] + 20}px;top:${Y2 + 18}px">The house</span>`, fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0.25, 0.9));
    css(L.el, { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.el.querySelector('.c3-ne'), { opacity: e, transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, e)})` });
  } });

  // ------------------------------------------------------------ 0:16.6 version two: one continuous shot, the frame travelling over it
  const LINES = { x: 1130, y: 400, w: 860 }, DUST = { x: 1400, y: 290, w: 960 };
  add({ src: 'c3_axo4k', at: 16.6, dur: 13.9, from: 0.4, crop: moves([[0.4, FULL], [5.2, { x: 1040, y: 530, w: 1760 }], [6.0, LINES], [9.6, { ...LINES, x: LINES.x + 30, w: LINES.w - 40 }], [10.4, DUST], [14.3, { ...DUST, y: DUST.y + 16, w: DUST.w - 40 }]]), fx: drift({ s: [1, 1], fin: 0.3 }) });
  vtag(16.8, 13.4, 'Version 2');
  say(17.0, 4.8, 'The real house, lifted apart in layers', 'An exploded axonometric');
  say(22.0, 3.9, 'Where each piece lands', 'Bronze lines');
  say(26.0, 4.0, 'And dust floating in it', 'A beam of gallery light');
  // 0:30.2 "Much better, because now the opening image is the product."
  add({ src: 'c3_axo_ui', at: 30.3, dur: 3.3, from: 1.5, fx: drift({ s: [1, 1.03], fin: 0.3 }) });

  // ------------------------------------------------------------ 0:33.4 version three
  add({ src: 'c3_now_ui', at: 33.4, dur: 3.2, from: 1.0, fx: drift({ s: [1, 1.03], fin: 0.3 }) });
  vtag(33.6, 19.0, 'Version 3');
  // 0:36.4 "The page opens on the actual plans, lying on a walnut desk."
  const push = (u) => { const k = E.sine(u), w = 1920 - 300 * k; return { x: (1180 - w / 2) * k, y: (575 - (w * 9) / 32) * k, w }; };
  add({ src: '01_plan', at: 36.4, dur: 4.4, from: 0.6, crop: (st) => { const c = push(Math.min(1, st / 8)); const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y)); return { x: x * 2, y: y * 2, w: w * 2 }; }, fx: drift({ s: [1, 1], fin: 0.3 }) });
  // 0:40.6 "the camera comes down, and the walls rise straight out of the drawing"
  add({ src: 'c3_rise4k', at: 40.6, dur: 6.2, from: 0.7, speed: 1.6, crop: moves([[0, FULL], [14, FULL]]), fx: drift({ s: [1, 1], fin: 0.25 }) });
  // 0:46.6 "Walls first, so you see the lines become walls, then the floors, then the roof."
  add({ src: 'c3_rise4k', at: 46.6, dur: 6.2, from: 1.4, speed: 2, crop: moves([[1.4, { x: 1150, y: 480, w: 1260 }], [8, { x: 1240, y: 500, w: 1220 }], [13.8, { x: 1290, y: 540, w: 1180 }]]), fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(46.8, 2.5, 'The lines become', 'Walls');
  say(49.3, 1.7, 'Then', 'Floors');
  say(51.0, 1.7, 'Then', 'The roof');

  // ------------------------------------------------------------ 0:52.8 the desk, close up
  ['weight', 'mug', 'rule', 'pencils', 'lamp'].forEach((n, i) => {
    add({ src: `c3_macro_${n}`, at: 52.8 + i * 1.1, dur: 1.25, from: 0.8, fx: drift({ s: [1, 1.02], fin: 0.14 }) });
  });

  // ------------------------------------------------------------ 0:58.3 "My first attempt... a window cut into the paper"
  add({ src: 'c3_win', at: 58.3, dur: 6.4, from: 0.6, speed: 0.82, fx: drift({ s: [1, 1], fin: 0.3 }) });
  vtag(58.5, 8.6, 'First attempt');
  say(58.8, 5.6, 'Showing the 3D scene behind it', 'A window cut into the paper');
  // 1:04.6 "It read as a square overlay."
  const R = { x: 650, y: 304, w: 728, h: 516 };
  add({ src: 'c3_win', at: 64.6, dur: 2.7, from: 5.85, speed: 0.06, blend: true, fx: drift({ s: [1, 1], fin: 0.1 }) });
  add({ titles: true, at: 64.8, dur: 2.4, html: `<svg class="c1-ring" width="1920" height="1080" viewBox="0 0 1920 1080"><rect x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="4" pathLength="1"/></svg><div class="c1-note" style="left:${R.x + R.w + 26}px;top:${R.y - 6}px"><span class="cap">First attempt</span><b>A square overlay</b></div>`, fx: (lt, L) => {
    const k = E.cubic(span(lt, 0, 0.75)), o = 1 - E.sine(span(lt, L.dur - 0.3, L.dur));
    css(L.el.querySelector('rect'), { strokeDashoffset: 1 - k });
    css(L.el.firstElementChild, { opacity: o });
    const e = E.outQuint(span(lt, 0.6, 1.2));
    css(L.el.querySelector('.c1-note'), { opacity: e * o, transform: `translateX(${(1 - e) * -20}px)` });
  } });

  // ------------------------------------------------------------ 1:07.3 "one camera and one house the whole way through"
  add({ src: 'c3_onecam', at: 67.3, dur: 6.1, from: 0.2, speed: 1.4, fx: drift({ s: [1, 1], fin: 0.3 }) });
  say(67.6, 5.5, 'The whole way through', 'One camera. One house.');

  // ------------------------------------------------------------ 1:13.3 "baked from the real floor plans, so it always matches the model"
  const PLAN = frameOf({ x: 1300, y: 590, w: 1240 });
  const at = 73.3, dur = 6.7;
  const pos = (lt) => { const u = lt / dur; return lerp(lerp(0.86, 0.14, E.cubic(span(u, 0.1, 0.55))), 0.5, E.cubic(span(u, 0.6, 0.86))); };
  add({ src: 'c3_plan_flat', at, dur, from: 0.2, crop: () => PLAN, fx: drift({ s: [1, 1], fin: 0.3 }) });
  add({ src: 'c3_plan_risen', at, dur, from: 0.2, crop: () => PLAN, fx: (lt, L) => {
    css(L.el, { clipPath: `inset(0 0 0 ${(pos(lt) * 100).toFixed(3)}%)`, opacity: E.sine(span(lt, 0, 0.3)) });
  } });
  add({ at, dur, html: '<i class="wipeline"></i>', fx: (lt, L) => {
    css(L.el.firstChild, { left: `${pos(lt) * 1920 - 1.5}px`, opacity: E.sine(span(lt, 0.1, 0.4)) * (1 - E.sine(span(lt, dur - 0.4, dur))) });
  } });
  add({ titles: true, at: at + 0.2, dur: dur - 0.5, html: '<span class="c2-tag" style="left:48px">The plan</span><span class="c2-tag" style="right:48px">The model</span>', fx: (lt, L) => {
    css(L.el, { opacity: E.sine(span(lt, 0, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
  } });
  say(at + 0.4, dur - 0.9, 'Baked from the real floor plans', 'It always matches');

  return { duration: 80, fadeIn: 0.6, grain: () => 0.06 };
};
