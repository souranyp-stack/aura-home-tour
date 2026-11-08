// The intro, second version: the same 1:24 and the same words, in a kinetic-type
// language. Bold tight sans against italic serif, words replacing each other on the
// beat, cards in perspective, a real wireframe wiping into the real house, a tilted
// wall of frames, thin bronze light between scenes.
window.CUTS = window.CUTS || {};
window.CUTS.intro2 = (api) => {
  const { add, drift, E, span, lerp, css, bell, masked, rise, V1_LOOK, drawCode } = api;

  const frameOf = (c) => {
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x - w / 2)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y - (w * 9) / 32));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const moves = (keys) => (st) => {
    let c = keys[keys.length - 1][1];
    if (st <= keys[0][0]) c = keys[0][1];
    else for (let i = 1; i < keys.length; i++) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i];
      if (st <= t1) { const k = E.cubic((st - t0) / (t1 - t0)); c = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k) }; break; }
    }
    return frameOf(c);
  };
  const FULL = { x: 960, y: 540, w: 1920 };
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const room = (at, dur, fin = 0.2) => add({ at, dur, html: '<div class="k-room"></div>', fx: (lt, L) => fades(L, lt, fin, 0.01) });

  // ------------------------------------------------------------ type
  // parts: [[text, 'b' | 'i'], ...]; each word rises out of its own mask, sharp as it lands
  const words = (parts) => parts.map(([t, k]) => t.split(' ').map((w) => `<span class="k-m"><i class="k-${k}">${w}</i></span>`).join(' ')).join(' ');
  const type = (at, dur, parts, { x = 96, y, bottom, size = 128, width = 1700, align = 'left', shade = false, stagger = 0.06, keep = false } = {}) => add({ titles: true, at, dur, html: `${shade ? '<div class="k-shade"></div>' : ''}<div class="k-t" style="${align === 'center' ? 'left:0;right:0;text-align:center' : `left:${x}px;width:${width}px`};${y != null ? `top:${y}px` : `bottom:${bottom ?? 90}px`};font-size:${size}px">${words(parts)}</div>`, fx: (lt, L) => {
    const els = [...L.el.querySelectorAll('.k-m i')], out = 1 - E.inCubic(span(lt, L.dur - 0.16, L.dur));
    els.forEach((el, i) => {
      const e = E.outExpo(span(lt, i * stagger, i * stagger + 0.62)), left = keep ? 0 : E.inCubic(span(lt, L.dur - 0.22, L.dur));
      css(el, { transform: `translateY(${(1 - e) * 112 - left * 112}%) rotate(${(1 - e) * 5}deg)`, filter: e < 0.985 ? `blur(${((1 - e) * 9).toFixed(2)}px)` : 'none' });
    });
    const sh = L.el.querySelector('.k-shade'); if (sh) css(sh, { opacity: E.sine(span(lt, 0, 0.25)) * out });
  } });
  const eyebrow = (at, dur, text, x = 96, y = 74) => add({ titles: true, at, dur, html: `<div class="k-eye" style="left:${x}px;top:${y}px"><i></i>${text}</div>`, fx: (lt, L) => {
    const e = E.outExpo(span(lt, 0, 0.5)); css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, L.dur - 0.2, L.dur))), transform: `translateX(${(1 - e) * -18}px)` });
  } });

  // a thin line of bronze light across the frame, marking a change of scene
  const streak = (at, y = 540, dur = 0.75) => add({ at: at - dur / 2, dur, html: `<i class="k-streak" style="top:${y}px"></i><i class="k-glow" style="top:${y - 90}px"></i>`, fx: (lt, L) => {
    const u = lt / dur, w = E.outExpo(span(u, 0, 0.55)), o = bell(u, 0, 1, 0.12, 0.5);
    css(L.el.children[0], { transform: `scaleX(${w})`, opacity: o });
    css(L.el.children[1], { transform: `scaleX(${w * 1.1})`, opacity: o * 0.8 });
  } });

  // a clip on a card, turning in from depth and leaving towards the camera
  const card = (src, at, dur, from, { x = 830, y = 250, w = 940, speed = 1, tilt = -9, filter = '', crop } = {}) => add({ src, at, dur, from, speed, crop, cls: 'k-card', fx: (lt, L) => {
    const e = E.outExpo(span(lt, 0, 0.7)), o = E.inCubic(span(lt, L.dur - 0.22, L.dur)), k = E.sine(lt / L.dur), sc = w / 1920;
    css(L.el, {
      opacity: Math.min(1, e * 1.6) * (1 - o),
      transform: `translate(${x + (1 - e) * 260 + o * -80}px, ${y + (1 - e) * 60}px) perspective(1400px) rotateY(${(1 - e) * -34 + tilt + k * 4}deg) rotateX(${(1 - e) * 12}deg) scale(${sc * lerp(0.86, 1, e) * (1 + o * 0.08)})`,
      filter: `${filter}${e < 0.98 ? ` blur(${((1 - e) * 8).toFixed(2)}px)` : ''}` || 'none',
    });
  } });
  // sparks along a moving edge, the same every render
  const sparks = (at, dur, xAt, count = 150) => {
    let seed = 41; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const P = Array.from({ length: count }, () => ({ y: r() * 1080, born: r(), spd: 40 + r() * 170, drift: (r() - 0.5) * 70, s: 0.8 + r() * 2.4, life: 0.25 + r() * 0.5 }));
    add({ at, dur, html: '<canvas width="1920" height="1080" style="position:absolute;inset:0"></canvas>', fx: (lt, L) => {
      const g = L.el.firstChild.getContext('2d'); g.clearRect(0, 0, 1920, 1080); g.fillStyle = '#ffdca8';
      const now = lt / dur;
      P.forEach((p) => {
        const a = (now - p.born * 0.85) / (p.life / dur * 2.2); if (a < 0 || a > 1) return;
        const bx = xAt(p.born * 0.85 * dur) * 1920, t = a * p.life * 2.2;
        g.globalAlpha = (1 - a) * 0.9; g.beginPath(); g.arc(bx - p.spd * t, p.y + p.drift * t, p.s * (1 - a * 0.5), 0, 7); g.fill();
      });
      g.globalAlpha = 1;
    } });
  };
  const wipeTo = (at, dur, a, b, aFrom, bFrom, pos, speed = 1) => {
    add({ src: a, at, dur, from: aFrom, speed, fx: drift({ s: [1, 1] }) });
    add({ src: b, at, dur, from: bFrom, speed, fx: (lt, L) => css(L.el, { clipPath: `inset(0 ${(pos(lt) * 100).toFixed(3)}% 0 0)` }) });
    add({ at, dur, html: '<i class="wipeline"></i>', fx: (lt, L) => css(L.el.firstChild, { left: `${(1 - pos(lt)) * 1920 - 1.5}px`, opacity: pos(lt) > 0.003 && pos(lt) < 0.997 ? 1 : 0 }) });
    sparks(at, dur, (lt) => 1 - pos(lt));
  };

  // ------------------------------------------------------------ 0:00 "This is an architectural plan. Lines on paper."
  add({ src: 'c7_plan', at: 0, dur: 4.2, from: 0, speed: 1, crop: moves([[0, { x: 960, y: 540, w: 1920 }], [4.2, { x: 960, y: 540, w: 1740 }]]), fx: drift({ s: [1, 1], fin: 0.8 }) });
  type(0.5, 2.3, [['This is an', 'b'], ['architectural plan.', 'i']], { size: 104, bottom: 84, shade: true, stagger: 0.09 });
  type(2.85, 1.35, [['Lines', 'b'], ['on paper.', 'i']], { size: 104, bottom: 84, shade: true });
  // 0:04 "Walls, rooms, a stair." the plan's own lines, one close-up per word
  const PL = (a, b, c) => moves([[0, a], [0.5, b], [1.6, c]]);
  add({ src: 'c7_plan', at: 4.2, dur: 0.95, from: 4.4, speed: 0.4, crop: moves([[4.4, { x: 960, y: 540, w: 1740 }], [4.75, { x: 760, y: 700, w: 900 }]]), fx: drift({ s: [1, 1] }) });
  type(4.25, 0.9, [['Walls,', 'b']], { size: 190, bottom: 70, stagger: 0, shade: true });
  add({ src: 'c7_plan', at: 5.15, dur: 0.85, from: 5.0, speed: 0.4, crop: moves([[5.0, { x: 1180, y: 660, w: 760 }], [5.34, { x: 1120, y: 640, w: 700 }]]), fx: drift({ s: [1, 1] }) });
  type(5.2, 0.8, [['rooms,', 'i']], { size: 190, bottom: 70, stagger: 0, shade: true });
  add({ src: 'c7_plan', at: 6.0, dur: 1.2, from: 5.6, speed: 0.4, crop: moves([[5.6, { x: 800, y: 380, w: 760 }], [6.08, { x: 720, y: 360, w: 620 }]]), fx: drift({ s: [1, 1] }) });
  type(6.05, 1.1, [['a', 'b'], ['stair.', 'i']], { size: 190, bottom: 70, stagger: 0.05, shade: true });
  // 0:07 "Now watch what happens when I scroll."
  add({ src: 'c7_plan', at: 7.2, dur: 2.05, from: 6.5, speed: 0.2, crop: moves([[6.5, { x: 960, y: 540, w: 1500 }], [6.92, { x: 960, y: 540, w: 1420 }]]), fx: drift({ s: [1, 1], filter: 'brightness(0.32)' }) });
  type(7.3, 1.9, [['Now watch what happens', 'b'], ['when I scroll.', 'i']], { size: 104, align: 'center', y: 430, stagger: 0.05 });
  add({ titles: true, at: 7.5, dur: 1.75, html: '<div class="k-scroll"><i></i></div>', fx: (lt, L) => {
    const u = (lt * 1.2) % 1; css(L.el.firstChild, { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, 1.45, 1.75))) }); css(L.el.querySelector('i'), { transform: `translateY(${u * 30}px)`, opacity: 1 - u });
  } });

  // ------------------------------------------------------------ 0:09.25 the walls rise
  streak(9.25);
  add({ src: '02_rise', at: 9.25, dur: 8.55, crop: (st) => { const k = E.sine(Math.min(1, (st / 12) / 0.62)), c = { x: lerp(1300, 960, k), y: lerp(590, 540, k), w: 1560 + 360 * k }; return frameOf(c); }, fx: drift({ s: [1, 1], zin: 0.55 }) });
  type(9.7, 2.0, [['The walls', 'b'], ['rise', 'i']], { size: 150, bottom: 76, shade: true });
  type(11.7, 1.7, [['straight out of', 'b'], ['the paper.', 'i']], { size: 104, bottom: 76, shade: true });
  type(13.5, 1.5, [['The floors', 'b'], ['slide in,', 'i']], { size: 150, bottom: 76, shade: true });
  type(15.0, 1.3, [['the roof', 'b'], ['lands,', 'i']], { size: 150, bottom: 76, shade: true });
  type(16.3, 1.5, [['and the plan', 'b'], ['becomes', 'i']], { size: 130, bottom: 76, shade: true });

  // 0:17.8 "a real house, in 3D," its real wireframe, wiped into the real thing
  const POS = (lt) => 1 - E.cubic(span(lt, 0.7, 2.6));
  wipeTo(17.8, 3.6, 'c7_wire', 'c7_real', 1, 1, (lt) => POS(lt), 1);
  type(17.9, 1.4, [['a real house,', 'b']], { size: 150, align: 'center', y: 70 });
  type(19.4, 1.9, [['in', 'b'], ['3D,', 'i']], { size: 220, align: 'center', y: 60 });

  // 0:21.4 "standing on a cliff above the sea at golden hour."
  streak(21.4, 700);
  add({ src: '04_golden', at: 21.4, dur: 2.4, from: 0.7, fx: drift({ s: [1.0, 1.05], fin: 0.1 }) });
  type(21.5, 2.2, [['at', 'b'], ['golden hour.', 'i']], { size: 128, bottom: 76, shade: true });
  // 0:23.6 the sculpture, then it snaps together
  add({ src: '05_sculpture', at: 23.8, dur: 2.0, from: 0.7, fx: drift({ s: [1.04, 1.0], zin: 0.45 }) });
  add({ src: '06_assemble', at: 25.8, dur: 3.3, from: 0.6, speed: 1.55, fx: drift({ s: [1.05, 1.0], zin: 0.3 }) });

  // ------------------------------------------------------------ 0:29 "And this isn't a video. It's a website."
  room(29.1, 5.3);
  type(29.2, 1.4, [['This isn’t', 'b'], ['a video.', 'i']], { size: 170, align: 'center', y: 400 });
  add({ type: 'browser', src: 'c7_hover_top', at: 30.6, dur: 1.95, from: 0.1, fx: (lt, L) => {
    const e = E.outExpo(span(lt, 0, 0.9)), d = E.sine(lt / L.dur);
    css(L.el, { opacity: Math.min(1, e * 1.5) * (1 - E.sine(span(lt, 1.75, 1.95))) });
    css(L.win, { transform: `translate(250px, ${60 + (1 - e) * 240}px) scale(${lerp(0.5, 0.62, e) * lerp(1, 1.02, d)}) rotateX(${(1 - e) * 28 + 4}deg) rotateY(${-16 + (1 - e) * -14 + d * 4}deg) rotateZ(${(1 - e) * 5}deg)` });
    css(L.page, { borderRadius: '0 0 22px 22px' }); css(L.frameEl, { opacity: 1 });
    css(L.back, { opacity: 0 });
    L.chips.forEach((c) => css(c, { opacity: 0 }));
  } });
  type(30.7, 1.7, [['It’s a', 'b'], ['website.', 'i']], { x: 96, y: 390, width: 620, size: 150 });
  // the header's bronze link, picking up the same hover from the browser, up close
  card('c7_hover_top', 32.45, 1.95, 2.0, { tilt: -7, x: 800, crop: moves([[2.0, { x: 1660, y: 60, w: 620 }], [3.95, { x: 1720, y: 50, w: 470 }]]) });
  type(32.45, 1.9, [['Built with', 'b'], ['Three.js', 'i']], { x: 96, y: 390, width: 620, size: 120 });

  // ------------------------------------------------------------ 0:34.4 "Every stone, every board of oak, the sea, the sunset, even the sound of the fire"
  room(34.4, 6.2);
  [['08a_stone', 34.4, 1.3, 0.6, [['Every', 'b'], ['stone,', 'i']]], ['08b_oak', 35.7, 1.2, 0.8, [['every board', 'b'], ['of oak,', 'i']]], ['08c_sea', 36.9, 1.2, 0.8, [['the', 'b'], ['sea,', 'i']]], ['08d_sunset', 38.1, 1.2, 0.4, [['the', 'b'], ['sunset,', 'i']], 1.8], ['08e_fire', 39.3, 1.3, 0.8, [['even', 'b'], ['the fire', 'i']]]].forEach(([src, at, dur, from, parts, speed = 1], i) => {
    card(src, at, dur + 0.05, from, { speed, tilt: i % 2 ? -7 : -11, y: 240 + (i % 2) * 20 });
    type(at, dur, parts, { x: 96, y: 390, width: 760, size: 128, stagger: 0.04 });
  });
  eyebrow(34.5, 6.0, 'Generated live from code');

  // ------------------------------------------------------------ 0:40.6 "There's not a single image file on this page."
  streak(40.6);
  let seed = 3; const rd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const LIT = Array.from({ length: 384 }, () => ({ at: rd() * 3.2, len: 0.25 + rd() * 0.9, base: 0.34 + rd() * 0.26 }));
  add({ at: 40.6, dur: 3.9, html: '<div class="k-room"></div><div class="k-wallv"><div class="k-wall"><img src="assets/wall.jpg"/><canvas width="1200" height="800"></canvas></div></div>', fx: (lt, L) => {
    fades(L, lt, 0.2, 0.2);
    const k = E.sine(lt / L.dur);
    css(L.el.querySelector('.k-wall'), { transform: `translate(-50%, -50%) rotateX(52deg) rotateZ(-17deg) translate(${lerp(120, -180, k)}px, ${lerp(90, -120, k)}px) scale(${lerp(1.02, 0.9, k)})` });
    const g = L.el.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 1200, 800);
    LIT.forEach((c, i) => { const col = i % 24, row = Math.floor(i / 24), l = bell(lt, c.at, c.at + c.len, 0.08, 0.2); g.fillStyle = `rgba(6,5,4,${(1 - c.base - l * (1 - c.base)).toFixed(3)})`; g.fillRect(col * 50, row * 50, 50, 50); g.fillStyle = 'rgba(6,5,4,1)'; g.fillRect(col * 50 + 49, row * 50, 1, 50); g.fillRect(col * 50, row * 50 + 49, 50, 1); });
  } });
  add({ at: 40.6, dur: 3.9, html: '<div class="k-wallfade"></div>', fx: (lt, L) => fades(L, lt, 0.2, 0.2) });
  add({ titles: true, at: 40.95, dur: 3.5, html: '<div class="k-zero"><div class="k-m"><i class="k-b">0</i></div><div class="k-m k-zero__t"><i class="k-i">image files</i></div></div>', fx: (lt, L) => {
    L.el.querySelectorAll('.k-m i').forEach((el, i) => { const e = E.outExpo(span(lt, i * 0.2, i * 0.2 + 0.8)), o = E.inCubic(span(lt, L.dur - 0.22, L.dur)); css(el, { transform: `translateY(${(1 - e) * 112 - o * 112}%)` }); });
  } });

  // ------------------------------------------------------------ 0:44.5 "You can scroll through it like a film, or step inside and walk the whole house."
  add({ src: '09_door', at: 44.5, dur: 3.1, from: 0.8, fx: drift({ s: [1.03, 1], zin: 0.4 }) });
  type(44.7, 2.8, [['Scroll it', 'b'], ['like a film,', 'i']], { size: 128, bottom: 76, shade: true });
  // the hero's Walk the house, on a real hover, then the real click into the walk
  add({ src: 'c7_hover_walk', at: 47.6, dur: 2.5, from: 3.4, speed: 1.2, crop: moves([[3.4, { x: 180, y: 900, w: 560 }], [5.6, { x: 160, y: 930, w: 440 }], [6.3, { x: 960, y: 540, w: 1920 }]]), fx: drift({ s: [1.02, 1], zin: 0.3 }) });
  type(47.7, 2.3, [['or walk', 'b'], ['the whole house.', 'i']], { size: 128, bottom: 76, shade: true });
  // 0:50 "Down the stair, into the bedrooms, out onto the terrace." frames that grow out of the last one
  const grow = (src, at, dur, from) => add({ src, at, dur, from, fx: (lt, L) => {
    const e = E.outExpo(span(lt, 0, 0.75)), inset = (1 - e) * 26;
    css(L.el, { clipPath: `inset(${inset}% ${inset * 1.2}% ${inset}% ${inset * 1.2}% round ${(1 - e) * 60}px)`, transform: `scale(${lerp(1.16, 1, e)})` });
  } });
  grow('c5_tour_stair', 50.0, 1.7, 0.4); type(50.1, 1.5, [['Down the', 'b'], ['stair,', 'i']], { size: 128, bottom: 76, shade: true });
  grow('12_bedroom', 51.7, 1.4, 1.0); type(51.8, 1.25, [['into the', 'b'], ['bedrooms,', 'i']], { size: 128, bottom: 76, shade: true });
  grow('13_terrace', 53.1, 2.0, 1.4); type(53.2, 1.8, [['out onto the', 'b'], ['terrace.', 'i']], { size: 128, bottom: 76, shade: true });

  // ------------------------------------------------------------ 0:55.1 "Most of the code was written by Claude Opus 5.5."
  streak(55.1);
  add({ type: 'code', at: 55.1, dur: 3.3, fx: (lt, L) => { css(L.el, { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, L.dur - 0.2, L.dur))), filter: 'brightness(0.32)' }); drawCode(L, lt + 0.4); } });
  type(55.3, 3.0, [['Most of the code, written by', 'b']], { size: 76, align: 'center', y: 380 });
  type(55.6, 2.7, [['Claude Opus 5.5', 'i']], { size: 190, align: 'center', y: 470, keep: false });

  // ------------------------------------------------------------ 0:58.4 "But the first version looked nothing like this."
  room(58.4, 8.0);
  [['15a_v1_brick', 60.4, 2.0, 0.4, [['The cliff:', 'b'], ['crazy paving.', 'i']]], ['15c_v1_sculpture', 62.4, 2.0, 0.5, [['The hero:', 'b'], ['a random sculpture.', 'i']]], ['15d_v1_room', 64.4, 2.0, 0.5, [['And', 'b'], ['no kitchen.', 'i']]]].forEach(([src, at, dur, from, parts], i) => {
    card(i === 0 ? '15b_v1_cliff' : src, at, dur, from, { filter: V1_LOOK, tilt: i % 2 ? -7 : -11 });
    type(at, dur, parts, { x: 96, y: 370, width: 760, size: 112, stagger: 0.04 });
  });
  card('15a_v1_brick', 58.4, 2.0, 0.4, { filter: V1_LOOK, x: 480, y: 180, w: 960, tilt: 0 });
  type(58.5, 1.9, [['The first version', 'b'], ['looked nothing like this.', 'i']], { size: 100, align: 'center', y: 800 });
  eyebrow(60.4, 6.0, 'Version 1');
  // the quick flash of v1
  [['15a_v1_brick', 1.9], ['15b_v1_cliff', 2.4], ['15c_v1_sculpture', 2.2], ['15d_v1_room', 2.4], ['15b_v1_cliff', 0.6], ['15c_v1_sculpture', 1.2]]
    .forEach(([src, from], i) => add({ src, at: 66.4 + i * 0.1, dur: 0.1, from, speed: 0, fx: drift({ s: [1.04, 1.04], filter: `${V1_LOOK} contrast(1.2)` }) }));

  // ------------------------------------------------------------ 1:07 "...how I got from that to this."
  add({ cls: 'flash', at: 66.95, dur: 0.25, html: '', fx: (lt, L) => css(L.el, { background: '#fff4e2', opacity: 0.85 * (1 - E.outCubic(lt / L.dur)) }) });
  add({ src: '15b_v1_cliff', at: 67.0, dur: 3.5, from: 1.2, speed: 0.4, fx: drift({ s: [1.03, 1.05], filter: V1_LOOK }) });
  const P3 = (lt) => 1 - E.cubic(span(lt, 1.0, 2.5));
  add({ src: '17_end', at: 67.0, dur: 3.5, from: 0, fx: (lt, L) => { drift({ s: [1.04, 1] })(lt, L); L.el.style.clipPath = `inset(0 ${(P3(lt) * 100).toFixed(3)}% 0 0)`; } });
  add({ at: 67.0, dur: 3.5, html: '<i class="wipeline"></i>', fx: (lt, L) => css(L.el.firstChild, { left: `${(1 - P3(lt)) * 1920 - 1.5}px`, opacity: P3(lt) > 0.003 && P3(lt) < 0.997 ? 1 : 0 }) });
  sparks(67.0, 3.5, (lt) => 1 - P3(lt));
  type(67.2, 1.5, [['How I got', 'b'], ['from that', 'i']], { size: 130, bottom: 76, shade: true });
  type(68.9, 1.5, [['to', 'b'], ['this.', 'i']], { size: 190, bottom: 76, shade: true, x: 1200, width: 640 });

  // ------------------------------------------------------------ 1:10.5 "The prompts I used, the mistakes, and the few tricks..."
  room(70.5, 5.0);
  add({ at: 70.5, dur: 1.75, cls: 'k-prompt', html: '<div class="k-pc"><span class="cap">Prompt</span><p>“can it be a paper plan that we roll smoothly instead”</p></div>', fx: (lt, L) => {
    const e = E.outExpo(span(lt, 0, 0.7)), o = E.inCubic(span(lt, L.dur - 0.2, L.dur));
    css(L.el.firstChild, { opacity: Math.min(1, e * 1.5) * (1 - o), transform: `translate(${(1 - e) * 200}px, ${(1 - e) * 40}px) perspective(1400px) rotateY(${(1 - e) * -30 - 9}deg)` });
  } });
  type(70.5, 1.7, [['The', 'b'], ['prompts,', 'i']], { x: 96, y: 390, width: 760, size: 128, stagger: 0.04 });
  card('c4_accordion', 72.25, 1.65, 3.6, { tilt: -7 });
  type(72.25, 1.6, [['the', 'b'], ['mistakes,', 'i']], { x: 96, y: 390, width: 760, size: 128, stagger: 0.04 });
  card('c4_roll', 73.9, 1.65, 5.2, { speed: 1.4, tilt: -11 });
  type(73.9, 1.6, [['the few', 'b'], ['tricks.', 'i']], { x: 96, y: 390, width: 760, size: 128, stagger: 0.04 });

  // 1:15.5 "...turn an architectural plan, or any idea,"
  streak(75.55);
  add({ src: 'c7_plan', at: 75.55, dur: 2.55, from: 6.5, speed: 0.3, crop: moves([[6.5, { x: 960, y: 540, w: 1500 }], [7.3, { x: 960, y: 540, w: 1360 }]]), fx: drift({ s: [1, 1], filter: 'brightness(0.3)' }) });
  type(75.65, 1.3, [['An architectural', 'b'], ['plan,', 'i']], { size: 120, align: 'center', y: 450 });
  type(77.0, 1.1, [['or any', 'b'], ['idea,', 'i']], { size: 150, align: 'center', y: 450 });

  // ------------------------------------------------------------ 1:18 "...into something like this."
  streak(78.1);
  add({ src: '17_end', at: 78.1, dur: 5.9, from: 3.3, fx: drift({ s: [1.08, 1.0], zin: 0.6 }) });
  add({ titles: true, at: 79.2, dur: 4.4, html: `<div class="end"><div class="end__w">${masked('AURA')}</div><div class="end__s"><span class="mask"><i><em>The living</em> sanctuary</i></span></div></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('.end__w i')], lt, 0, { stagger: 0.09, dur: 1.3 });
    rise([L.el.querySelector('.end__s i')], lt, 0.7, { dur: 1.2 });
  } });

  return { duration: 84, fadeIn: 0.5, grain: () => 0.07 };
};
