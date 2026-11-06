// Records shots into clips/. node record.mjs [name-prefix ...] [--force]
import { existsSync } from 'node:fs';
import { openPage, record } from './lib/recorder.mjs';
import { SHOTS } from './shots.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const want = args.filter((a) => !a.startsWith('--'));
const list = SHOTS.filter((s) => (!want.length || want.some((w) => s.name.startsWith(w))) && (force || !existsSync(`clips/${s.name}.mp4`)));
// a fresh page for every shot, so nothing one shot leaves behind (scroll,
// eased progress, GPU memory) reaches the next
for (const shot of list) {
  const session = await openPage({ url: shot.url, ...(shot.cleanCss ? { cleanCss: shot.cleanCss } : {}) });
  await record(session, { out: `clips/${shot.name}.mp4`, ...shot });
  await session.close();
}
