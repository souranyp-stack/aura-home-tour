// Builds edit/assets/wall.jpg for the second intro: 384 real frames of the site,
// picked at random from the recorded clips. Run after the clips exist.
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const clips = readdirSync('clips').filter((f) => /^(0[4-9]|1[0-3]|16|c[345]_(tour|materials|day|roll|approach|section|manifesto|now|old_chairs|places))/.test(f) && f.endsWith('.mp4'));
const dir = mkdtempSync(join(tmpdir(), 'wall-'));
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const list = [];
for (let i = 0; i < 384; i++) {
  const clip = clips[Math.floor(rnd() * clips.length)], t = (0.4 + rnd() * 3).toFixed(2), f = join(dir, `${String(i).padStart(3, '0')}.jpg`);
  execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-ss', t, '-i', `clips/${clip}`, '-frames:v', '1', '-vf', 'scale=320:180', '-update', '1', f]);
  list.push(`file '${f}'`);
}
writeFileSync(join(dir, 'l.txt'), list.join('\n'));
mkdirSync('edit/assets', { recursive: true });
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'l.txt'), '-vf', 'tile=24x16', '-frames:v', '1', '-q:v', '4', '-update', '1', 'edit/assets/wall.jpg']);
console.log('edit/assets/wall.jpg');
