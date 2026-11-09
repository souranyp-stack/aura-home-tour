// Renders the YouTube covers: node thumb/render.mjs [outDir]. 1920x1080 JPEG, under YouTube's 2 MB limit.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = process.argv[2] || 'out/thumbnails'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
for (const [v, name] of [['d', 'walkable-3d-house'], ['e', 'this-is-a-website-no-face']]) {
  await p.goto(`file://${resolve('thumb/compose.html')}?v=${v}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.load('100px Anton').then(() => document.fonts.ready));
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/aura-cover-${name}.jpg`, type: 'jpeg', quality: 90 });
}
await b.close();
