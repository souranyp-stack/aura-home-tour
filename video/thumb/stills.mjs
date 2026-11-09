// Renders the thumbnail's source pictures from the real site at 3840x2160.
// node thumb/stills.mjs  (needs the aura dev server on 5288)
import { openPage } from '../lib/recorder.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'thumb/src';
mkdirSync(OUT, { recursive: true });
const dusk = { time: 20.35, mist: 0.04, interior: 1, fire: 1, veil: 0 }, gold = { time: 19.62, mist: 0.05, interior: 0.75, fire: 1, veil: 0 };
const list = [
  ['dusk', { kind: 'pose', env: dusk, door: 1, cam: { pos: [30, 8, -42], tgt: [3, 5, 0], fov: 32 } }],
  ['dusk_low', { kind: 'pose', env: dusk, door: 1, cam: { pos: [-30, 1, -46], tgt: [2, 6.5, 2], fov: 36 } }],
  ['gold', { kind: 'pose', env: gold, door: 1, cam: { pos: [30, 8, -42], tgt: [3, 5, 0], fov: 32 } }],
  ['rise', { kind: 'film', desk: 0.42, p: 0 }],
  ['plan', { kind: 'film', desk: 0.012, p: 0 }],
];
for (const [name, d] of list) {
  const s = await openPage({ url: 'http://localhost:5288/?capture', clean: true });
  await s.page.evaluate(() => window.__vt.enable());
  for (let f = 0; f < 60; f++) await s.page.evaluate((d) => { window.__aura.director = d; window.__vt.step(1000 / 60); }, d);
  const { data } = await s.cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 2 } });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
  await s.close();
  console.log(name);
}
