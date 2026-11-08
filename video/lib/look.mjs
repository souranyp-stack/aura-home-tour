// Contact sheets for framing: render director states and tile them.
// node lib/look.mjs <out.jpg> '<json array of {director, frames?, label?}>' [url]
import { openPage } from './recorder.mjs';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, json, url = 'http://localhost:5288/?capture', css = ''] = process.argv.slice(2);
const list = JSON.parse(json);
const s = await openPage({ url, clean: !css, css });
await s.page.evaluate(() => window.__vt.enable());
const dir = mkdtempSync(join(tmpdir(), 'look-'));
const files = [];
for (const [i, item] of list.entries()) {
  const frames = item.frames ?? 20;
  for (let f = 0; f < frames; f++) {
    await s.page.evaluate(([d, f]) => {
      const v = typeof d === 'string' ? (0, eval)(`(${d})`)(f) : d;
      window.__aura.director = v;
      window.__vt.step(1000 / 60);
    }, [item.director, f]);
  }
  const { data } = await s.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 } });
  const cam = await s.page.evaluate(() => { const c = window.__aura.camera; return [c.position.toArray().map((v) => +v.toFixed(2)), +c.fov.toFixed(1)]; });
  console.log(item.label ?? i, JSON.stringify(cam));
  const file = join(dir, `${String(i).padStart(3, '0')}.jpg`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  files.push(file);
}
await s.close();
const cols = Math.min(3, files.length), rows = Math.ceil(files.length / cols);
const labels = list.map((it, i) => it.label ?? String(i));
const filter = files.map((_, i) => `[${i}:v]drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${labels[i].replace(/[':]/g, ' ')}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';')
  + `;${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 960}_${Math.floor(i / cols) * 540}`).join('|')}:fill=black`;
const args = ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f])];
if (files.length === 1) execFileSync(ffmpegPath, [...args, '-frames:v', '1', out]);
else execFileSync(ffmpegPath, [...args, '-filter_complex', filter, '-frames:v', '1', out]);
console.log(out, `${cols}x${rows}`);
