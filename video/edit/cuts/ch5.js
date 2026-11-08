// Chapter 5 · "Walking through the house" (script 10:25), about 1:15. The real walk
// mode, driven with a real mouse, keys and touch; what walking exposed in the first
// walkable version (9124819); walkPlan.js and the three things that read from it,
// shown by cutting the real model open and laying the drawn plan over it; and the
// real numbers behind the sound, as you walk in from the sea to the fire.
window.CUTS = window.CUTS || {};
window.CUTS.ch5 = (api) => {
  const { add, drift, E, span, lerp, css, masked, rise, labelFx } = api;

  const frameOf = (c) => {
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x - w / 2)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y - (w * 9) / 32));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const say = (at, dur, small, big, cls = '') => add({ titles: true, at, dur, html: `<div class="s-shade"></div><div class="label ${cls}"><div class="label__n cap">${small}</div><div class="label__w c3-w"><span class="mask"><i>${big}</i></span></div></div>`, fx: labelFx });
  const vtag = (at, dur, text) => add({ titles: true, at, dur, html: `<div class="tag"><i></i>${text}</div>`, fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0.05, 0.4)) * (1 - E.sine(span(lt, L.dur - 0.3, L.dur))) });
    css(L.el.querySelector('i'), { background: '#edc98f', boxShadow: '0 0 14px #edc98f' });
  } });
  const big = (at, dur, a) => add({ titles: true, at, dur, html: `<div class="c4-big"><div class="c4-big__a c5-big">${masked(a)}</div></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.02, dur: 0.8, out: L.dur - 0.4 });
  } });
  const head = (at, dur, small, word) => add({ titles: true, at, dur, html: `<div class="c1-label"><span class="cap">${small}</span><b>${word}</b></div>`, fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.9)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
    css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 12}px)` });
  } });
  const room = (at, dur, fout = 0.01) => add({ at, dur, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.25, fout) });
  // two pictures over each other with a line between them; pos(lt) is where the line is, 0..1
  const wipe = (at, dur, under, over, crop, pos) => {
    add({ src: under, at, dur, from: 0, speed: 0.05, crop: () => crop, fx: drift({ s: [1, 1], fin: 0.25 }) });
    add({ src: over, at, dur, from: 0.2, speed: 1, crop: () => crop, fx: (lt, L) => css(L.el, { clipPath: `inset(0 0 0 ${(pos(lt) * 100).toFixed(3)}%)`, opacity: E.sine(span(lt, 0, 0.25)) }) });
    add({ at, dur, html: '<i class="wipeline"></i>', fx: (lt, L) => css(L.el.firstChild, { left: `${pos(lt) * 1920 - 1.5}px`, opacity: E.sine(span(lt, 0.1, 0.4)) * (1 - E.sine(span(lt, dur - 0.4, dur))) * (pos(lt) > 0.002 && pos(lt) < 0.998 ? 1 : 0) }) });
  };
  const FULL = frameOf({ x: 960, y: 540, w: 1920 });

  // ------------------------------------------------------------ 0:00 "Then I wanted people to actually walk inside."
  add({ src: 'c5_enter', at: 0, dur: 3.6, from: 2.1, fx: drift({ s: [1, 1], fin: 0.3 }) });
  say(0.3, 2.2, '05', 'Walking through the house');
  // 0:03.6 "Drag to look,"
  add({ src: 'c5_drag', at: 3.6, dur: 2.1, from: 0.9, speed: 1.6, fx: drift({ s: [1, 1], fin: 0.15 }) });
  say(3.8, 1.8, 'The mouse', 'Drag to look');
  // 0:05.7 "walk with the keys"
  add({ src: 'c5_keys', at: 5.7, dur: 2.1, from: 0.7, fx: drift({ s: [1, 1], fin: 0.15 }) });
  add({ titles: true, at: 5.8, dur: 1.9, html: `<div class="c5-keys"><kbd class="w">W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>`, fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0, 0.25)) * (1 - E.sine(span(lt, L.dur - 0.25, L.dur))) });
    L.el.querySelector('.w').classList.toggle('on', lt > 0.05);
  } });
  // 0:07.8 "or a touch stick on your phone,"
  room(7.8, 2.2);
  add({ at: 7.8, dur: 2.2, html: '<div class="c5-phone"></div>', fx: (lt, L) => { const e = E.outQuint(span(lt, 0, 0.7)); css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, 1.95, 2.2))), transform: `translateY(${(1 - e) * 40}px)` }); } });
  add({ src: 'c5_phone', w: 780, h: 1688, at: 7.8, dur: 2.2, from: 2.0, cls: 'c5-screen', fx: (lt, L) => { const e = E.outQuint(span(lt, 0, 0.7)); css(L.el, { opacity: e * (1 - E.sine(span(lt, 1.95, 2.2))), transform: `translate(750px, ${85 + (1 - e) * 40}px) scale(${420 / 780})` }); } });
  say(8.0, 1.9, 'On your phone', 'A touch stick');
  // 0:10 "and jump to eight named places"
  add({ src: 'c5_places', at: 10.0, dur: 3.9, from: 0.45, speed: 2.2, fx: drift({ s: [1, 1], fin: 0.15 }) });
  // 0:13.9 "or four times of day."
  add({ src: 'c5_hours', at: 13.9, dur: 3.2, from: 1.0, speed: 2.4, fx: drift({ s: [1, 1], fin: 0.15 }) });

  // ------------------------------------------------------------ 0:17.1 "And walking exposed everything the camera had been hiding."
  add({ src: 'c5_old_walk', at: 17.1, dur: 3.9, from: 1.2, fx: drift({ s: [1, 1], fin: 0.3 }) });
  vtag(17.3, 19.9, 'First walkable version');
  say(17.5, 3.3, 'Walking exposed', 'What the camera had hidden');
  // 0:21 "The dining chairs faced backwards."
  add({ src: 'c5_old_chairs', at: 21.0, dur: 2.3, from: 0.6, fx: drift({ s: [1, 1], fin: 0.15 }) });
  say(21.2, 2.0, 'The dining chairs', 'Faced backwards');
  // 0:23.3 "The plans drew a stair that didn't exist."
  room(23.3, 3.6);
  const PLAN_ZOOM = frameOf({ x: 1600, y: 600, w: 640 });
  [['c5_plan_old', 56, 'The plan', () => PLAN_ZOOM, 0, 0.05], ['c5_old_west', 978, 'The model', null, 0.4, 1]].forEach(([src, x, tag, crop, from, speed], i) => {
    add({ src, at: 23.3, dur: 3.6, from, speed, crop: crop || undefined, cls: 'c1-panel c2-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, i * 0.5, 0.8 + i * 0.5));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 3.3, 3.6))), transform: `translate(${x}px, ${230 + (1 - e) * 30}px) scale(${886 / 1920})` });
    } });
    add({ titles: true, at: 23.4 + i * 0.5, dur: 3.3 - i * 0.5, html: `<span class="c2-tag" style="left:${x + 20}px;top:248px">${tag}</span>`, fx: (lt, L) => fades(L, lt, 0.3, 0.3) });
  });
  add({ titles: true, at: 23.6, dur: 3.2, html: '<svg class="c1-ring" width="1920" height="1080" viewBox="0 0 1920 1080"><circle cx="737" cy="612" r="70" pathLength="1"/></svg>', fx: (lt, L) => {
    css(L.el.querySelector('circle'), { strokeDashoffset: 1 - E.cubic(span(lt, 0, 0.7)) });
    css(L.el.firstElementChild, { opacity: 1 - E.sine(span(lt, L.dur - 0.3, L.dur)) });
  } });
  say(23.6, 3.1, 'The plans drew', 'A stair that didn’t exist');

  // 0:26.9 "And the plans showed bedrooms and bathrooms, but in the model the lower floor was a solid block,"
  const PLAN_POS = (lt) => 1 - E.cubic(span(lt, 3.4, 5.0));
  wipe(26.9, 5.4, 'c5_plan_old', 'c5_old_cut', FULL, PLAN_POS);
  add({ titles: true, at: 27.1, dur: 5.0, html: '<span class="c2-tag" style="left:48px">The plan</span><span class="c2-tag" style="right:48px">The model</span>', fx: (lt, L) => fades(L, lt, 0.4, 0.3) });
  say(27.2, 3.2, 'The plans showed', 'Bedrooms and bathrooms');
  add({ src: 'c5_old_front', at: 32.3, dur: 2.4, from: 1.0, fx: drift({ s: [1, 1], fin: 0.2 }) });
  say(30.6, 4.0, 'In the model', 'A solid block');
  // 0:34.7 "and there was no kitchen at all."
  add({ src: 'c5_old_kitchen', at: 34.7, dur: 2.9, from: 0.6, fx: drift({ s: [1, 1], fin: 0.2 }) });
  say(34.9, 2.5, 'At all', 'No kitchen');
  // 0:37.6 "Nowhere to cook, sleep or wash."
  add({ src: 'c5_old_front', at: 37.6, dur: 2.6, from: 3.0, fx: drift({ s: [1.02, 1.05], fin: 0.2, filter: 'brightness(0.4)' }) });
  big(37.7, 2.45, 'Nowhere to cook, sleep or wash.');

  // ------------------------------------------------------------ 0:40.2 "The fix was one file, walkPlan.js."
  const code = (s) => `<span class="r">${s}</span>`;
  add({ at: 40.2, dur: 2.7, html: `<div class="c1-room"></div><div class="s-win c4-win c4-code"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">src/world/walkPlan.js</span></div><pre class="s-win__b">${[
    '<span class="s-b">export const</span> LOWER_ROOMS = [',
    '  { n: <span class="s-g">1</span>, x0: <span class="s-g">-9</span>, x1: <span class="s-g">-3.5</span>, pass: [<span class="s-g">-9</span>, <span class="s-g">-7.4</span>], bath: [<span class="s-g">-7.3</span>, <span class="s-g">-3.5</span>] },',
    '  { n: <span class="s-g">2</span>, x0: <span class="s-g">-3.5</span>, x1: <span class="s-g">2</span>, pass: [<span class="s-g">-3.5</span>, <span class="s-g">-1.9</span>], bath: [<span class="s-g">-1.8</span>, <span class="s-g">2</span>] },',
    '  { n: <span class="s-g">3</span>, x0: <span class="s-g">2</span>, x1: <span class="s-g">7.5</span>, pass: [<span class="s-g">2</span>, <span class="s-g">3.6</span>], bath: [<span class="s-g">3.7</span>, <span class="s-g">7.5</span>] },',
    '  { n: <span class="s-g">4</span>, x0: <span class="s-g">7.5</span>, x1: <span class="s-g">14.4</span>, pass: [<span class="s-g">7.5</span>, <span class="s-g">9.1</span>], bath: [<span class="s-g">9.2</span>, <span class="s-g">14.4</span>] },',
    '];',
    ' ',
    '<span class="s-dim">// the inside stair, rising eastward from the corridor to the living room</span>',
    '<span class="s-b">export const</span> INSIDE_STAIR = { x0: <span class="s-g">-6.6</span>, x1: <span class="s-g">-0.66</span>, z0: <span class="s-g">7</span>, z1: <span class="s-g">8</span> };',
  ].map(code).join('')}</pre></div>`, fx: (lt, L) => {
    fades(L, lt, 0.25, 0.25);
    css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.04, E.sine(lt / L.dur))})` });
    [...L.el.querySelectorAll('.r')].forEach((r, i) => { const e = E.outCubic(span(lt, 0.15 + i * 0.07, 0.5 + i * 0.07)); css(r, { opacity: e, transform: `translateY(${(1 - e) * 8}px)` }); });
  } });
  head(40.4, 2.3, 'The fix', 'One file');

  // 0:42.9 "The room layout lives there, and the 3D walls, the walls you bump into, and the drawn plans all read from it."
  const DIA = 9.2, PW = 540, PH = 304, GX = 45, X0 = (1920 - (3 * PW + 2 * GX)) / 2, PY = 480;
  const when = [2.2, 4.0, 6.2];
  room(42.9, DIA);
  add({ titles: false, at: 42.9, dur: DIA, html: `<div class="c5-src">walkPlan.js</div><svg class="c5-lines" width="1920" height="1080" viewBox="0 0 1920 1080">${[0, 1, 2].map((i) => { const x = X0 + i * (PW + GX) + PW / 2; return `<path d="M960 262 C960 360 ${x} 360 ${x} ${PY - 8}" pathLength="1"/>`; }).join('')}</svg>`, fx: (lt, L) => {
    fades(L, lt, 0.3, 0.3);
    const e = E.outQuint(span(lt, 0, 0.8));
    css(L.el.querySelector('.c5-src'), { transform: `translate(-50%, ${(1 - e) * -20}px)`, opacity: e });
    [...L.el.querySelectorAll('path')].forEach((p, i) => css(p, { strokeDashoffset: 1 - E.cubic(span(lt, when[i] - 0.5, when[i] + 0.1)) }));
  } });
  [['c5_now_cut', '3D walls', 'rooms.js', 1, { x: 960, y: 540, w: 1920 }, 1], ['c5_collision', 'The walls you bump into', 'createFloorPlan()', -3.8, { x: 1151, y: 660, w: 700 }, 0.95], ['c5_plan_now', 'Drawn plans', 'drawings.js', 0, { x: 960, y: 540, w: 1920 }, 0.05]].forEach(([src, name, file, from, c, speed], i) => {
    const x = X0 + i * (PW + GX), a = when[i];
    add({ src, at: 42.9, dur: DIA, from, speed, crop: c ? () => frameOf(c) : undefined, cls: 'c1-panel c3-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, a, a + 0.8));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, DIA - 0.3, DIA))), transform: `translate(${x}px, ${PY + (1 - e) * 30}px) scale(${PW / 1920})` });
    } });
    add({ titles: true, at: 42.9, dur: DIA - 0.1, html: `<div class="c3-under" style="left:${x}px;width:${PW}px;top:${PY + PH + 16}px"><div class="c5-name">${name}</div><div class="cap">${file}</div></div>`, fx: (lt, L) => {
      css(L.el.firstChild, { opacity: E.sine(span(lt, a + 0.25, a + 0.7)) * (1 - E.sine(span(lt, DIA - 0.5, DIA - 0.1))) });
    } });
  });

  // 0:52.1 "So they can never disagree again."
  const P2 = (lt) => lerp(lerp(0.9, 0.1, E.cubic(span(lt, 0.05, 1.5))), 0.5, E.cubic(span(lt, 1.6, 2.5)));
  wipe(52.1, 3.0, 'c5_plan_now', 'c5_now_cut', FULL, P2);
  add({ titles: true, at: 52.2, dur: 2.7, html: '<span class="c2-tag" style="left:48px">The plan</span><span class="c2-tag" style="right:48px">The model</span>', fx: (lt, L) => fades(L, lt, 0.3, 0.3) });

  // 0:55.1 "If you take one engineering idea from this video, take that one: one source of truth."
  [['c5_tour_kitchen', 0.5], ['c5_tour_stair', 0.5], ['12_bedroom', 0.8], ['c5_tour_bath', 0.8]].forEach(([src, from], i) => {
    add({ src, at: 55.1 + i * 1.15, dur: 1.3, from, fx: drift({ s: [1, 1.02], fin: 0.14 }) });
  });
  add({ src: 'c5_now_cut', at: 59.7, dur: 3.0, from: 2, crop: () => FULL, fx: drift({ s: [1, 1.03], fin: 0.2, filter: 'brightness(0.42)' }) });
  big(59.8, 2.8, 'One source of truth.');

  // ------------------------------------------------------------ 1:02.7 "Then sound. The sea and wind follow where you stand..."
  const SP = 1.18, SD = 12.5;
  add({ src: 'c5_sound', at: 62.7, dur: SD, from: 0, speed: SP, fx: drift({ s: [1, 1], fin: 0.25 }) });
  say(62.9, 2.2, 'And then', 'Sound');
  add({ titles: true, at: 63.0, dur: SD - 0.6, html: `<div class="c5-meter">${[['Sea and wind', 'a'], ['Indoors filter', 'b'], ['Fire', 'c']].map(([n, k]) => `<div class="c5-m"><div class="c5-m__t"><span class="cap">${n}</span><b class="${k}v"></b></div><div class="c5-m__bar"><i class="${k}"></i></div></div>`).join('')}</div>`, fx: (lt, L) => {
    css(L.el.firstChild, { opacity: E.sine(span(lt, 0, 0.5)) * (1 - E.sine(span(lt, L.dur - 0.4, L.dur))) });
    const log = window.__C5_SOUND || [], at = Math.min(log.length - 1, Math.max(0, Math.round(((lt + 0.3) * SP) * 60)));
    const [out = 0, muffle = 0, fire = 0] = log[at] || [];
    const hz = 9000 * Math.pow(420 / 9000, muffle);
    const q = (s) => L.el.querySelector(s);
    q('.a').style.transform = `scaleX(${Math.min(1, out / 1.1)})`;
    q('.b').style.transform = `scaleX(${Math.log(hz / 420) / Math.log(9000 / 420)})`;
    q('.c').style.transform = `scaleX(${Math.min(1, fire / 1.6)})`;
    q('.av').textContent = `${Math.round(Math.min(1, out / 1.1) * 100)}%`;
    q('.bv').textContent = hz > 999 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
    q('.cv').textContent = `${Math.round(Math.min(1, fire / 1.6) * 100)}%`;
  } });

  return { duration: 75.2, fadeIn: 0.6, grain: () => 0.06 };
};
