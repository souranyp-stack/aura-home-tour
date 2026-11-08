// "What I learned and outro" (script 12:45), about 1:08. Four lessons, each on the
// footage it came from; the real git log and the real branch the desk opening was
// built on; what Opus didn't decide; DesignCode; the live site; the end card.
window.CUTS = window.CUTS || {};
window.CUTS.outro = (api) => {
  const { add, drift, E, span, lerp, css, masked, rise, labelFx, drawCode } = api;

  const frameOf = (c) => {
    const w = Math.min(1920, c.w), x = Math.min(1920 - w, Math.max(0, c.x - w / 2)), y = Math.min(1080 - (w * 9) / 16, Math.max(0, c.y - (w * 9) / 32));
    return { x: x * 2, y: y * 2, w: w * 2 };
  };
  const FULL = frameOf({ x: 960, y: 540, w: 1920 });
  const fades = (L, lt, fin, fout) => css(L.el, { opacity: E.sine(span(lt, 0, fin)) * (1 - E.sine(span(lt, L.dur - fout, L.dur))) });
  const say = (at, dur, small, big, cls = '') => add({ titles: true, at, dur, html: `<div class="s-shade"></div><div class="label ${cls}"><div class="label__n cap">${small}</div><div class="label__w c3-w"><span class="mask"><i>${big}</i></span></div></div>`, fx: labelFx });
  const big = (at, dur, a) => add({ titles: true, at, dur, html: `<div class="c4-big"><div class="c4-big__a c5-big">${masked(a)}</div></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.02, dur: 0.8, out: L.dur - 0.4 });
  } });
  // a numbered lesson: the number, then the line, low on the left
  const lesson = (at, dur, n, line, sub = '') => add({ titles: true, at, dur, html: `<div class="s-shade c6-shade"></div><div class="c6-l"><em>${n}</em><div><b><span class="mask"><i>${line}</i></span></b>${sub ? `<span class="cap">${sub}</span>` : ''}</div></div>`, fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0.05, 0.8)), o = 1 - E.cubic(span(lt, L.dur - 0.3, L.dur));
    css(L.el.querySelector('em'), { opacity: e * o, transform: `translateY(${(1 - e) * 26}px)` });
    css(L.el.querySelector('b i'), { transform: `translateY(${(1 - E.outQuint(span(lt, 0.15, 0.95))) * 105}%)`, opacity: o });
    const cap = L.el.querySelector('.cap'); if (cap) css(cap, { opacity: E.sine(span(lt, 0.5, 1)) * o });
    css(L.el.firstChild, { opacity: o * E.sine(span(lt, 0, 0.3)) });
  } });
  const room = (at, dur, fout = 0.01) => add({ at, dur, html: '<div class="c1-room"></div>', fx: (lt, L) => fades(L, lt, 0.25, fout) });
  const wipe = (at, dur, under, over, uFrom, oFrom, speed, pos, crop) => {
    const c = crop ? { crop: () => crop } : {};
    add({ src: under, at, dur, from: uFrom, speed, ...c, fx: drift({ s: [1, 1], fin: 0.25 }) });
    add({ src: over, at, dur, from: oFrom, speed, ...c, fx: (lt, L) => css(L.el, { clipPath: `inset(0 0 0 ${(pos(lt) * 100).toFixed(3)}%)` }) });
    add({ at, dur, html: '<i class="wipeline"></i>', fx: (lt, L) => css(L.el.firstChild, { left: `${pos(lt) * 1920 - 1.5}px`, opacity: (pos(lt) > 0.002 && pos(lt) < 0.998 ? 1 : 0) * (1 - E.sine(span(lt, dur - 0.3, dur))) }) });
  };

  // ------------------------------------------------------------ 0:00 "So what actually made this work? Four things."
  add({ src: '04_golden', at: 0, dur: 3.4, from: 0.5, fx: drift({ s: [1.02, 1.05], filter: 'brightness(0.6)' }) });
  add({ titles: true, at: 0.2, dur: 3.1, html: '<div class="c1-label"><span class="cap">What I learned</span></div>', fx: (lt, L) => fades(L, lt, 0.4, 0.4) });
  big(0.7, 2.6, 'Four things.');

  // ------------------------------------------------------------ 0:03.4 "One: describe the experience, not the tech. Write your prompt like a storyboard."
  room(3.4, 5.6);
  const SW = 420, SH = (SW * 9) / 16, SX = (1920 - (4 * SW + 3 * 24)) / 2, SY = [140, 400];
  for (let i = 0; i < 8; i++) {
    const x = SX + (i % 4) * (SW + 24), y = SY[i > 3 ? 1 : 0], a = 0.05 + i * 0.08;
    add({ src: `c1_sb${i + 1}`, at: 3.4, dur: 5.6, from: 0.1, speed: 0.6, cls: 'c1-panel c3-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, a, a + 0.7));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 5.3, 5.6))), transform: `translate(${x}px, ${y + (1 - e) * 24}px) scale(${SW / 1920})` });
    } });
  }
  lesson(3.6, 5.3, 1, 'Describe the experience, not the tech.', 'Write your prompt like a storyboard');

  // ------------------------------------------------------------ 0:09 "Two: ask the AI to critique before it improves."
  const POS2 = (lt) => 1 - E.cubic(span(lt, 3.2, 5.4));
  wipe(9.0, 7.3, 'c2_cliff_b', 'c2_cliff_a', 0.2, 0.2, 0.68, POS2);
  add({ titles: true, at: 9.4, dur: 3.2, html: '<div class="c1-not c2-not"><div class="c1-not__w">“make it better”</div><i class="c1-not__line"></i></div>', fx: (lt, L) => {
    css(L.el.querySelector('.c1-not'), { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, 2.8, 3.2))), transform: 'translate(-50%, -50%)' });
    css(L.el.querySelector('.c1-not__line'), { transform: `scaleX(${E.cubic(span(lt, 0.6, 1.1))})` });
  } });
  add({ titles: true, at: 12.8, dur: 3.2, html: '<div class="c6-q">“Identify the five most important problems”</div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7));
    css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, 2.8, 3.2))), transform: `translate(-50%, ${(1 - e) * 16}px)` });
  } });
  lesson(9.2, 6.9, 2, 'Ask the AI to critique before it improves.');

  // ------------------------------------------------------------ 0:16.3 "Three: keep one source of truth, like walkPlan.js."
  const POS3 = (lt) => lerp(0.86, 0.14, E.cubic(span(lt, 0.1, 3.4)));
  wipe(16.3, 3.9, 'c5_plan_now', 'c5_now_cut', 0, 0.3, 0.08, POS3, FULL);
  lesson(16.5, 3.5, 3, 'Keep one source of truth.', 'walkPlan.js');

  // ------------------------------------------------------------ 0:20.2 "Four: commit every step."
  const log = (window.__SITE_LOG || []).map(([h, s]) => `<div class="c6-row${h === '616b83a' || h === '6b35f49' ? ' hot' : ''}"><span class="s-b">${h}</span> ${s.replace(/</g, '&lt;')}</div>`).join('');
  const SC = 3.2;
  add({ at: 20.2, dur: SC, html: `<div class="c1-room"></div><div class="s-win c6-log"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">git log --oneline</span></div><div class="c6-log__v"><div class="c6-log__t">${log}</div></div></div>`, fx: (lt, L) => {
    fades(L, lt, 0.25, 0.2);
    css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.03, E.sine(lt / SC))})` });
    const t = L.el.querySelector('.c6-log__t'), H = t.scrollHeight - 460;
    css(t, { transform: `translateY(${-E.sine(span(lt, 0.2, SC)) * H}px)` });
  } });
  add({ titles: true, at: 20.5, dur: SC - 0.4, html: '<div class="c6-count"><b>32</b><span class="cap">commits</span></div>', fx: (lt, L) => fades(L, lt, 0.4, 0.3) });
  lesson(20.4, SC - 0.2, 4, 'Commit every step.');

  // 0:23.4 "The desk opening started as an experiment on its own branch."
  const PS1 = '<span class="s-dim">~/Home Tour</span> <span class="s-b">$</span> ';
  const typed = (s, lt, a, b) => { const n = Math.floor(s.length * span(lt, a, b)); return s.slice(0, n); };
  const lineAt = (lt, at) => { const e = E.outCubic(span(lt, at, at + 0.3)); return `opacity:${e.toFixed(3)};transform:translateY(${((1 - e) * 8).toFixed(1)}px);display:block`; };
  add({ at: 23.4, dur: 4.2, html: '<div class="c1-room"></div><div class="s-win c6-term"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">Terminal</span></div><pre class="s-win__b"></pre></div>', fx: (lt, L) => {
    fades(L, lt, 0.2, 0.2);
    css(L.el.querySelector('.s-win'), { transform: `scale(${lerp(0.985, 1.03, E.sine(lt / 4.2))})` });
    L.el.querySelector('pre').innerHTML = `${PS1}${typed('git switch -c hero-desk-prologue', lt, 0.2, 1.3)}
<span style="${lineAt(lt, 1.4)}"><span class="s-dim">Switched to a new branch</span> 'hero-desk-prologue'</span><span style="${lineAt(lt, 1.8)}">&nbsp;</span><span style="${lineAt(lt, 2.0)}"><span class="s-b">616b83a</span> Open on the plans lying on a desk, then zoom into the hero</span><span style="${lineAt(lt, 2.5)}"><span class="s-b">6b35f49</span> Raise the real house out of the plan instead of a window onto it</span>`;
  } });
  // 0:27.6 "If it hadn't worked, I could have thrown it away in one command."
  add({ src: '01_plan', at: 27.6, dur: 4.6, from: 0.4, fx: drift({ s: [1, 1.03], fin: 0.2, filter: 'brightness(0.55) blur(3px)' }) });
  add({ at: 27.6, dur: 4.6, html: '<div class="s-win c6-term c6-term--one"><div class="c1-card__bar"><i></i><i></i><i></i><span class="cap s-win__t">If it hadn’t worked</span></div><pre class="s-win__b"></pre></div>', fx: (lt, L) => {
    fades(L, lt, 0.3, 0.25);
    L.el.querySelector('pre').innerHTML = `${PS1}${typed('git branch -D hero-desk-prologue', lt, 0.5, 1.8)}<i class="caret c1-caret" style="opacity:${Math.floor(lt * 2.4) % 2 && lt > 1.8 ? 0 : 1}"></i>`;
  } });
  add({ titles: true, at: 29.4, dur: 2.6, html: '<div class="c6-one">One command.</div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7)); css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, 2.2, 2.6))), transform: `translate(-50%, ${(1 - e) * 14}px)` });
  } });

  // ------------------------------------------------------------ 0:32.2 "Opus wrote most of the code."
  add({ type: 'code', at: 32.2, dur: 2.7, fx: (lt, L) => {
    css(L.el, { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, L.dur - 0.2, L.dur))) });
    drawCode(L, lt + 1);
  } });
  say(32.4, 2.4, 'Co-author on all 32 commits', 'Opus wrote most of the code');
  // 0:34.9 "But it didn't decide that the tower was the wrong hero,"
  add({ src: 'c3_tower', at: 34.9, dur: 4.7, from: 1.0, fx: drift({ s: [1, 1.03], fin: 0.2 }) });
  say(35.1, 4.3, 'Didn’t decide', 'The tower was the wrong hero');
  // 0:39.6 "or that paper should curl."
  add({ src: 'c4_roll', at: 39.6, dur: 2.2, from: 5.0, speed: 0.9, fx: drift({ s: [1, 1.03], fin: 0.2 }) });
  say(39.8, 1.9, 'Didn’t decide', 'That paper should curl');
  // 0:41.8 "That part is still you."
  add({ src: '17_end', at: 41.8, dur: 2.8, from: 1.0, fx: drift({ s: [1.03, 1.06], fin: 0.2, filter: 'brightness(0.5)' }) });
  big(41.9, 2.6, 'That part is still you.');

  // ------------------------------------------------------------ 0:44.6 "If you want to train that part, check out DesignCode, link in the description."
  add({ src: 'dc1_hero', w: 1920, h: 1200, at: 44.6, dur: 6.0, from: 0.4, cls: 'c6-dc', fx: (lt, L) => {
    css(L.el, { opacity: E.sine(span(lt, 0, 0.3)), transform: `translateY(-60px) scale(${lerp(1, 1.03, E.sine(lt / 6))})` });
  } });
  add({ titles: true, at: 45.6, dur: 4.8, html: '<div class="sp-link"><span class="sp-link__u">designcode.io</span><span class="cap">Link in the description</span></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7));
    css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, 4.4, 4.8))), transform: `translate(-50%, ${(1 - e) * 18}px)` });
  } });

  // ------------------------------------------------------------ 0:50.6 "The live site is linked below, so go walk around the house."
  add({ type: 'browser', src: 'c5_keys', at: 50.6, dur: 5.1, from: 0.3, speed: 0.62, fx: (lt, L) => {
    css(L.el, { opacity: E.sine(span(lt, 0, 0.3)) * (1 - E.sine(span(lt, L.dur - 0.25, L.dur))) });
    const d = E.sine(lt / L.dur);
    css(L.win, { transform: `translateY(-10px) scale(${0.76 * lerp(1, 1.02, d)}) rotateX(${lerp(4, 2, d)}deg) rotateY(${lerp(-5, 2, d)}deg)` });
    css(L.page, { borderRadius: '0 0 22px 22px' });
    css(L.frameEl, { opacity: 1 });
    css(L.back, { opacity: 1, filter: 'blur(38px) brightness(0.3) saturate(1.25)', transform: 'scale(1.2)' });
    L.chips.forEach((c) => css(c, { opacity: 0 }));
  } });
  add({ titles: true, at: 51.4, dur: 4.1, html: '<div class="sp-link c6-site"><span class="sp-link__u">aura-living-sanctuary.aura.build</span><span class="cap">Link below</span></div>', fx: (lt, L) => {
    const e = E.outQuint(span(lt, 0, 0.7));
    css(L.el.firstChild, { opacity: e * (1 - E.sine(span(lt, 3.7, 4.1))), transform: `translate(-50%, ${(1 - e) * 18}px)` });
  } });

  // ------------------------------------------------------------ 0:55.7 "Tell me in the comments which part you want a deep dive on."
  room(55.7, 5.6);
  const PW = 560, PH = 315, GX = 30, X0 = 90, Y0 = [80, 455];
  [['c1_float', 'The first prompt', 0.5, 0.8], ['c2_cliff_a', 'The review', 0.5, 0.8], ['c3_rise4k', 'The hero', 4, 1.2], ['c4_materials', 'The GSAP sections', 3, 1], ['c4_roll', 'The paper roll', 5, 1], ['c5_tour_kitchen', 'Walking the house', 0.3, 0.7]].forEach(([src, name, from, speed], i) => {
    const x = X0 + (i % 3) * (PW + GX), y = Y0[i > 2 ? 1 : 0], a = 0.05 + i * 0.1;
    add({ src, at: 55.7, dur: 5.6, from, speed, cls: 'c1-panel c3-panel', fx: (lt, L) => {
      const e = E.outQuint(span(lt, a, a + 0.8));
      css(L.el, { opacity: e * (1 - E.sine(span(lt, 5.3, 5.6))), transform: `translate(${x}px, ${y + (1 - e) * 26}px) scale(${PW / 1920})` });
    } });
    add({ titles: true, at: 55.7, dur: 5.5, html: `<div class="c3-under" style="left:${x}px;width:${PW}px;top:${y + PH + 10}px"><span class="cap">${name}</span></div>`, fx: (lt, L) => css(L.el.firstChild, { opacity: E.sine(span(lt, a + 0.25, a + 0.7)) * (1 - E.sine(span(lt, 5.1, 5.5))) }) });
  });
  add({ titles: true, at: 56.2, dur: 4.9, html: `<div class="c4-gsap c6-ask">${masked('Which part should I go deeper on?')}</div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('i')], lt, 0, { stagger: 0.016, dur: 0.8, out: L.dur - 0.4 });
  } });

  // ------------------------------------------------------------ 1:01.3 "Subscribe, and I'll see you in the next one."
  add({ src: '17_end', at: 61.3, dur: 7.5, from: 1.3, speed: 1, fx: drift({ s: [1.06, 1.0], zin: 0.6 }) });
  add({ titles: true, at: 62.0, dur: 6.4, html: `<div class="end"><div class="end__w">${masked('AURA')}</div><div class="end__s"><span class="mask"><i><em>See you</em> in the next one</i></span></div></div>`, fx: (lt, L) => {
    rise([...L.el.querySelectorAll('.end__w i')], lt, 0, { stagger: 0.09, dur: 1.3 });
    rise([L.el.querySelector('.end__s i')], lt, 0.7, { dur: 1.2 });
  } });

  return { duration: 68.8, fadeIn: 0.6, grain: () => 0.06 };
};
