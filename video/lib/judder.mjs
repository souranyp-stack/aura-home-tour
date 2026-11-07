// Judder meter: node lib/judder.mjs clip.mp4 [from s] [to s]
// A smooth move changes the picture by a steady amount every frame; a move that
// steps (pixel snapping, a held frame) alternates near-still frames with jumps.
// Prints the share of "stalled" frames (change under 40% of the local median)
// and the frame-to-frame unevenness (mean |d - median| / median).
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';

const [file, from = '0', to] = process.argv.slice(2);
const args = ['-hide_banner', '-ss', from, ...(to ? ['-to', to] : []), '-i', file,
  '-vf', 'scale=960:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'];
const out = execFileSync(ffmpegPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });
const d = [...out.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
let stalls = 0, uneven = 0, n = 0;
for (let i = 4; i < d.length - 4; i++) {
  const m = med(d.slice(i - 4, i + 5));
  if (m < 0.05) continue; // the picture is still here; nothing to judge
  n++;
  if (d[i] < 0.4 * m) { stalls++; if (process.env.SHOW) process.stdout.write(`${(+from + (i + 1) / 60).toFixed(2)} `); }
  uneven += Math.abs(d[i] - m) / m;
}
console.log(`${file.split('/').pop()} ${from}-${to ?? 'end'}s  moving frames ${n}  stalled ${(100 * stalls / Math.max(1, n)).toFixed(1)}%  unevenness ${(100 * uneven / Math.max(1, n)).toFixed(1)}%`);
