// Renders a cut to out/. node edit/render.mjs [--cut=intro|sponsor] [--clean] [--from=s --to=s] [--still=s,s,...]
import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}`))?.split('=')[1];
const clean = process.argv.includes('--clean');
const cutName = arg('cut') || 'intro';
const stills = arg('still')?.split(',').map(Number);

// the code typed on screen: the move that raises the house out of the plan
const desk = readFileSync(join(root, '..', 'src/world/desk.js'), 'utf8').split('\n');
const start = desk.findIndex((l) => l.includes('the drawn walls come up first'));
const code = desk.slice(start, start + 9).map((l) => l.replace(/^ {2}/, '')).join('\n');

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page]', e.message));
// the sponsor cut reads the cursor tracks its takes were recorded with
const takes = {};
for (const f of readdirSync(join(root, 'clips')).filter((f) => f.endsWith('.json'))) takes[f.replace('.json', '')] = JSON.parse(readFileSync(join(root, 'clips', f), 'utf8'));
await page.addInitScript(`window.__takes = ${JSON.stringify(takes)};`);
await page.goto(`${pathToFileURL(join(here, 'index.html')).href}?cut=${cutName}${clean ? '&titles=0' : ''}`);
await page.evaluate(async (code) => { window.__code = code; await window.__edit.ready; }, code);
const total = await page.evaluate(() => window.__edit.frames);
const cdp = await page.context().newCDPSession(page);
const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 })).data, 'base64');

mkdirSync(join(root, 'out'), { recursive: true });
if (stills) {
  for (const s of stills) {
    await page.evaluate((i) => window.__edit.frame(i), Math.round(s * 60));
    writeFileSync(join(root, 'out', `still-${cutName}-${s}.jpg`), await shot());
  }
  await browser.close();
  process.exit(0);
}

const from = Math.round(Number(arg('from') ?? 0) * 60), to = Math.min(total, Math.round(Number(arg('to') ?? total / 60) * 60));
const base = cutName === 'sponsor' ? 'aura-sponsor-designcode' : 'aura-intro-broll';
const out = join(root, 'out', `${base}${clean ? '-clean' : ''}${arg('from') || arg('to') ? `-${from / 60}-${to / 60}` : ''}.mp4`);
const ff = spawn(ffmpegPath, [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-g', '60', '-bf', '2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
const t0 = Date.now();
for (let i = from; i < to; i++) {
  await page.evaluate((i) => window.__edit.frame(i), i);
  const buf = await shot();
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 300 === 0) process.stdout.write(`  frame ${i}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s\r`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`\n${out} (${to - from} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
