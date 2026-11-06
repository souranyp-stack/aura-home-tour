// The sponsor read: designcode.io in one browser window, cut to the script.
// Takes are recorded by sponsor/record.mjs (2880x1800 frames of a 1440x900 page
// with a drawn cursor); their cursor tracks and zoom keys arrive as
// window.__takes. The window zooms toward what the cursor is doing, the way a
// screen-recording editor would, and eases its framing across each cut.
window.CUTS = window.CUTS || {};
window.CUTS.sponsor = (api) => {
  const { add, E, span, lerp, clamp, css, TITLES, stage } = api;
  const TAKES = window.__takes || {};
  const PW = 1504, PH = 940, PX = 208, PY = 96, BAR = 52; // the page inside the window, in stage px
  const S = PW / 1440;

  // ------------------------------------------------------------ backdrop and window
  const back = add({ at: 0, dur: 999, html: '<div class="sp-back"></div>' });
  const win = add({ at: 0, dur: 999, cls: 'sp-wrap', html: `
    <div class="sp-win" style="left:${PX}px;top:${PY - BAR}px;width:${PW}px;height:${PH + BAR}px">
      <div class="sp-bar" style="height:${BAR}px">
        <i class="bw__dot"></i><i class="bw__dot"></i><i class="bw__dot"></i>
        <span class="sp-nav">‹ ›</span>
        <div class="sp-url"><svg viewBox="0 0 16 16"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z"/></svg><b>designcode.io</b><span class="sp-path"></span></div>
        <i class="sp-load"></i>
      </div>
      <div class="sp-page" style="top:${BAR}px;width:${PW}px;height:${PH}px"></div>
    </div>` });
  const page = win.el.querySelector('.sp-page'), pathEl = win.el.querySelector('.sp-path'), load = win.el.querySelector('.sp-load');

  // ------------------------------------------------------------ the takes, back to back
  // at: where it starts in the cut, from: where in the take, dur: how long,
  // speed: how fast the take plays
  const XF = 0.32;
  const plan = [
    ['dc1_hero', 0, 0.2, 13.6],
    ['dc2_founder', 13.6, 0.1, 9.6],
    ['dc3_courses', 23.2, 0.2, 19.4],
    ['dc4_calendar', 42.6, 0.6, 3.0],
    // designcode.io's "Included in package" list steps on the real clock, which
    // ran about 4x faster than the recording, so this stretch plays at 0.25x to
    // put it back at its own pace (Private Slack, Agent Skills, Certificates).
    // No click into the next page here: at full speed the pull-back would show
    // the hero's real-clock animations racing.
    ['dc5_included', 45.6, 7.75, 6.3, 0.25],
    ['dc6_pass', 51.9, 0.2, 18.3],
    ['dc7_pricing', 70.2, 0.3, 12.6],
  ];
  const DURATION = 83;
  const takes = plan.map(([src, at, from, dur, speed = 1, xf = XF], i) => {
    const info = TAKES[src] || { cursor: [[720, 450]], zoom: [[0, 1]], focus: [], path: '/' };
    // the frame follows the cursor with a little lag, like a camera operator
    const sm = []; let fx = info.cursor[0][0], fy = info.cursor[0][1];
    for (const [x, y] of info.cursor) { fx += (x - fx) * 0.045; fy += (y - fy) * 0.045; sm.push([fx, fy]); }
    const L = add({ src, at, dur: dur + (i < plan.length - 1 ? XF : 0), from, speed, w: 2880, h: 1800, parent: page, fx: (lt, L) => {
      css(L.el, { opacity: i === 0 || !xf ? 1 : E.sine(span(lt, 0, xf)) });
    } });
    return { L, src, at, from, dur, speed, xf, info, sm };
  });

  const keyed = (keys, t) => {
    if (!keys.length) return null;
    if (t <= keys[0][0]) return keys[0][1];
    for (let k = 1; k < keys.length; k++) {
      const [t0, a] = keys[k - 1], [t1, b] = keys[k];
      if (t <= t1) {
        if (typeof b === 'string' || typeof a === 'string') return t - t0 < (t1 - t0) ? (typeof a === 'string' ? a : a) : b;
        const u = E.sine((t - t0) / (t1 - t0));
        return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * u) : a + (b - a) * u;
      }
    }
    return keys[keys.length - 1][1];
  };
  // where the window sits for a take at take-time tt: zoom z about focus F
  function framing(tk, tt) {
    const z = keyed(tk.info.zoom, tt) ?? 1;
    const fi = Math.min(tk.sm.length - 1, Math.max(0, Math.round(tt * 60)));
    let f = keyed(tk.info.focus, tt);
    // a focus key of 'cursor' hands the frame back to the cursor; blend over 0.8 s
    const cur = tk.sm[fi];
    if (!f || f === 'cursor') f = cur;
    else {
      const last = tk.info.focus.findIndex((k) => k[1] === 'cursor');
      if (last >= 0 && tt > tk.info.focus[last - 1]?.[0]) {
        const u = E.sine(span(tt, tk.info.focus[last - 1][0], tk.info.focus[last][0]));
        f = [lerp(f[0], cur[0], u), lerp(f[1], cur[1], u)];
      }
    }
    const F = [PX + f[0] * S, PY + f[1] * S];
    const k = clamp((z - 1) / 0.5);
    const Sx = lerp(F[0], 960, k), Sy = lerp(F[1], 540, k);
    let tx = Sx - F[0] * z, ty = Sy - F[1] * z;
    // once the page is bigger than the frame, never show past its edges
    const keep = (t, lo, hi, w) => (lo <= hi ? lerp(t, clamp(t, lo, hi), w) : t);
    tx = keep(tx, 1920 - (PX + PW) * z, -PX * z, E.sine(span(z, 1.28, 1.45)));
    ty = keep(ty, 1080 - (PY + PH) * z, -(PY - BAR) * z, E.sine(span(z, 1.15, 1.32)));
    return { z, tx, ty };
  }

  // ------------------------------------------------------------ type
  if (TITLES) {
    add({ at: 0.5, dur: 3.9, html: '<div class="sp-tag"><i></i>Sponsored by <b>DesignCode</b></div>', fx: (lt, L) => {
      const e = E.outQuint(span(lt, 0, 0.8)), o = 1 - E.cubic(span(lt, L.dur - 0.4, L.dur));
      css(L.el.firstChild, { opacity: e * o, transform: `translateY(${(1 - e) * 16}px)` });
    } });
    add({ at: 77.6, dur: DURATION - 77.6, html: '<div class="sp-link"><span class="sp-link__u">designcode.io</span><span class="cap">Link in the description</span></div>', fx: (lt, L) => {
      const e = E.outQuint(span(lt, 0, 0.9));
      css(L.el.firstChild, { opacity: e, transform: `translate(-50%, ${(1 - e) * 24}px)` });
    } });
  }

  return {
    duration: DURATION,
    fadeIn: 0.6,
    grain: () => 0.045,
    frame(t) {
      // the take on screen, and the one it is cutting from
      let cur = takes[0];
      for (const tk of takes) if (t >= tk.at) cur = tk;
      const idx = takes.indexOf(cur), prev = takes[idx - 1];
      let { z, tx, ty } = framing(cur, cur.from + (t - cur.at) * cur.speed);
      const into = t - cur.at;
      if (prev && cur.xf && into < cur.xf) {
        const a = framing(prev, prev.from + (t - prev.at) * prev.speed), u = E.sine(into / cur.xf);
        z = lerp(a.z, z, u); tx = lerp(a.tx, tx, u); ty = lerp(a.ty, ty, u);
      }
      css(win.el, { transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: '0 0' });
      // the address bar and its loading line
      const path = (prev && into < XF / 2 ? prev : cur).info.path || '/';
      const shown = path === '/' ? '' : path;
      if (pathEl.textContent !== shown) pathEl.textContent = shown;
      // a page load only where the address changes
      const l = prev && prev.info.path !== cur.info.path ? span(into, 0, 0.55) : 1;
      css(load, { transform: `scaleX(${E.outCubic(l)})`, opacity: l >= 1 ? 0 : 1 - span(into, 0.45, 0.55) });
      // the backdrop breathes slowly
      css(back.el.firstChild, { backgroundPosition: `${50 + Math.sin(t * 0.11) * 6}% ${100 + Math.cos(t * 0.09) * 4}%, ${20 + Math.cos(t * 0.07) * 8}% 0%, 0 0` });
    },
  };
};
