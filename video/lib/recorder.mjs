// Frame-exact recorder: opens a page in headless Chrome on the real GPU, holds
// its clock (virtual-time.js), and for every frame sets the shot, advances time
// by exactly one frame and pipes the screenshot straight into ffmpeg, so no
// frames are written to disk.
import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const FPS = 60;

// everything that is page chrome rather than picture
export const CLEAN_CSS = `
  #top, #filmUi, #index, .loader, #walk, .cue, .controls { opacity: 0 !important; pointer-events: none !important; }
  html, body { cursor: none !important; scrollbar-width: none !important; }
  ::-webkit-scrollbar { display: none !important; }
`;

export async function openPage({ url, width = 1920, height = 1080, dsf = 2, clean = false, css = '', cleanCss = CLEAN_CSS }) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dsf });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.addInitScript({ content: readFileSync(join(here, 'virtual-time.js'), 'utf8') });
  await page.addInitScript({ content: readFileSync(join(here, 'ease.js'), 'utf8') });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('loader')?.classList.contains('is-done') || !document.getElementById('loader'), null, { timeout: 180000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1500);
  if (clean || css) await page.addStyleTag({ content: (clean ? CLEAN_CSS : '') + css });
  const cdp = await page.context().newCDPSession(page);
  return { browser, page, cdp, width, height, dsf, cleanCss, close: () => browser.close() };
}

function encoder(out, fps, crf = 12) {
  mkdirSync(dirname(out), { recursive: true });
  const ff = spawn(ffmpegPath, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-g', '30', '-bf', '2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  return {
    write: (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res))),
    end: () => { ff.stdin.end(); return done; },
  };
}

// frameFn runs in the page as (i, t, n) before each step: i = frame index,
// t = seconds into the shot, n = frame count. preroll frames are stepped but
// not kept, so eased values settle before the first kept frame.
// crop(i, n) -> {x, y, w} in CSS px picks a 16:9 window of the page to fill the
// frame; the canvas renders at twice CSS size, so crops down to half width stay
// sharp. Output is always 1920x1080.
// before(i, n, page) runs in Node ahead of each frame (e.g. to move the mouse).
export async function record(s, { out, seconds, frameFn, preroll = 30, fps = FPS, enable = true, crf, crop, before, clean = false }) {
  const { page, cdp, width, height } = s;
  const n = Math.round(seconds * fps);
  await page.evaluate(([src, clean, css]) => {
    window.__shotFrame = (0, eval)(`(${src})`); // eslint-disable-line no-eval
    window.__shot = {};
    let tag = document.getElementById('broll-clean');
    if (!tag) { tag = document.createElement('style'); tag.id = 'broll-clean'; tag.textContent = css; document.head.appendChild(tag); }
    tag.disabled = !clean;
  }, [typeof frameFn === "string" ? frameFn : frameFn.toString(), clean, s.cleanCss ?? CLEAN_CSS]);
  if (enable) await page.evaluate(() => window.__vt.enable());
  const step = async (i) => {
    if (before) await before(Math.max(0, i), n, page);
    return page.evaluate(([i, n, ms]) => { window.__shotFrame(i, i / 60, n); window.__vt.step(ms); return [scrollX, scrollY]; }, [i, n, 1000 / fps]);
  };
  for (let i = -preroll; i < 0; i++) await step(0);
  const enc = encoder(out, fps, crf);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    // screenshot clips are in document coordinates, so follow the scroll
    const [sx, sy] = await step(i);
    const c = crop ? crop(i, n) : { x: 0, y: 0, w: width };
    c.w = Math.min(width, c.w);
    c.x = Math.min(width - c.w, Math.max(0, c.x));
    c.y = Math.min(height - (c.w * 9) / 16, Math.max(0, c.y));
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 95, optimizeForSpeed: false,
      clip: { x: c.x + sx, y: c.y + sy, width: c.w, height: (c.w * 9) / 16, scale: 1920 / c.w },
    });
    await enc.write(Buffer.from(data, 'base64'));
    if (i % 120 === 0) process.stdout.write(`  ${out.split('/').pop()} ${i}/${n}\r`);
  }
  await enc.end();
  console.log(`  ${out.split('/').pop()} ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
