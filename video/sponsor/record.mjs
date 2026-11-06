// Records the sponsor takes on designcode.io into clips/<name>.mp4 (2880x1800,
// 60 fps) with a drawn cursor, plus clips/<name>.json holding the cursor track
// and zoom keys for the edit. node sponsor/record.mjs [name-prefix ...] [--force]
import { existsSync, writeFileSync } from 'node:fs';
import { openPage, record } from '../lib/recorder.mjs';
import { TAKES } from './takes.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const want = args.filter((a) => !a.startsWith('--'));
const list = TAKES.filter((t) => (!want.length || want.some((w) => t.name.startsWith(w))) && (force || !existsSync(`clips/${t.name}.mp4`)));

const FPS = 60;
const cubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const sine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
// value at t from [t, v] keys, eased between neighbours
function track(keys, t, ease = cubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [t0, a] = keys[k - 1], [t1, b] = keys[k];
    if (t <= t1) { const u = ease((t - t0) / (t1 - t0)); return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * u) : a + (b - a) * u; }
  }
  return keys[keys.length - 1][1];
}

const CURSOR = `
  <div id="__ring" style="position:absolute;left:-23px;top:-23px;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.92);box-shadow:0 0 18px rgba(170,150,255,.55);opacity:0"></div>
  <svg id="__arrow" width="27" height="27" viewBox="0 0 24 24" style="position:absolute;left:-3.4px;top:-2.3px;overflow:visible;transform-origin:3px 2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))">
    <path d="M3 2 L3 19.4 L7.5 15.3 L10.5 22 L13.6 20.6 L10.7 14.2 L16.8 14.2 Z" fill="#0d0d10" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;

for (const take of list) {
  const s = await openPage({ url: take.url, width: 1440, height: 900, dsf: 2 });
  const { page } = s;
  await page.waitForTimeout(2500);
  await page.evaluate((html) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const c = document.createElement('div');
    c.id = '__cur';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform';
    c.innerHTML = html;
    document.body.appendChild(c);
  }, CURSOR);

  // anchors: centre of the first visible element whose text matches
  const find = (spec) => page.evaluate((spec) => {
    const re = new RegExp(spec.a, 'i');
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    let el = [...document.querySelectorAll('a, button, [role="button"]')].find((e) => re.test(e.textContent.trim()) && e.textContent.trim().length < 60 && visible(e));
    if (!el) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) if (re.test(n.textContent.trim()) && visible(n.parentElement)) { el = n.parentElement; break; }
    }
    if (!el) return null;
    let fixed = false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') { fixed = true; break; } }
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2 + (spec.dx || 0), y: r.y + r.height / 2 + (fixed ? 0 : scrollY) + (spec.dy || 0), fixed };
  }, spec);
  const resolved = new Map();
  const at = async (p) => {
    if (Array.isArray(p) || typeof p === 'string') return p;
    const key = JSON.stringify(p);
    if (!resolved.has(key)) {
      const r = await find(p);
      if (!r) throw new Error(`${take.name}: nothing matches ${p.a}`);
      resolved.set(key, r);
    }
    return resolved.get(key);
  };
  const scrollKeys = [];
  for (const [t, v] of take.scroll) scrollKeys.push([t, typeof v === 'number' ? v : (await at(v)).y]);
  const scrollAt = (t) => track(scrollKeys, t, sine);
  // a point in viewport coordinates as it is at time t
  const view = async (p, t) => {
    const r = await at(p);
    if (Array.isArray(r) || typeof r === 'string') return r;
    return [r.x, r.fixed ? r.y : r.y - scrollAt(t)];
  };
  const cursorKeys = [];
  for (const [t, p] of take.cursor) cursorKeys.push([t, await view(p, t)]);
  const focusKeys = [];
  for (const [t, p] of take.focus ?? []) focusKeys.push([t, await view(p, t)]);
  // a hand moves in a slight arc, not a ruler line
  const cursorAt = (t) => {
    const k = cursorKeys;
    if (t <= k[0][0]) return k[0][1];
    for (let j = 1; j < k.length; j++) {
      const [t0, a] = k[j - 1], [t1, b] = k[j];
      if (t <= t1) {
        const u = cubic((t - t0) / (t1 - t0)), dx = b[0] - a[0], dy = b[1] - a[1], bow = Math.sin(Math.PI * u) * 0.07;
        return [a[0] + dx * u - dy * bow, a[1] + dy * u + dx * bow];
      }
    }
    return k[k.length - 1][1];
  };

  const presses = (take.press ?? []).map((t) => Math.round(t * FPS));
  const cursorTrack = [];
  await record(s, {
    out: `clips/${take.name}.mp4`, seconds: take.seconds, preroll: 60, outW: 2880, crf: 16,
    frameFn: '() => {}',
    before: async (i, n, pg) => {
      const t = i / FPS;
      const [x, y] = cursorAt(t);
      const since = presses.map((f) => (i - f) / FPS).filter((d) => d >= 0).sort((a, b) => a - b)[0];
      await pg.evaluate(([sy, x, y, since]) => {
        window.scrollTo({ top: sy, behavior: 'instant' });
        document.getElementById('__cur').style.transform = `translate(${x}px, ${y}px)`;
        const ring = document.getElementById('__ring'), arrow = document.getElementById('__arrow');
        const k = since === null ? 1 : Math.min(1, since / 0.5);
        ring.style.opacity = since === null ? 0 : (1 - k) * 0.95;
        ring.style.transform = `scale(${0.35 + k * 1.05})`;
        arrow.style.transform = `scale(${since === null ? 1 : 1 - 0.14 * Math.sin(Math.PI * Math.min(1, since / 0.22))})`;
      }, [scrollAt(t), x, y, since ?? null]);
      await pg.mouse.move(x, y);
      if (presses.includes(i) && cursorTrack.length === i) await pg.mouse.down();
      if (cursorTrack.length === i) cursorTrack.push([+x.toFixed(1), +y.toFixed(1)]);
    },
  });
  writeFileSync(`clips/${take.name}.json`, JSON.stringify({
    name: take.name, path: take.path, seconds: take.seconds, fps: FPS, viewport: [1440, 900],
    zoom: take.zoom, focus: focusKeys, cursor: cursorTrack,
  }));
  await s.close();
}
