// Folds the build into one self-contained page for hosts like aura.build that
// cap a site's size, and fails loudly if it has grown past that cap.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const LIMIT = 5 * 1024 * 1024;
const files = readdirSync('dist/assets');
const read = (ext) => readFileSync(`dist/assets/${files.find((f) => f.endsWith(ext))}`, 'utf8');

let html = readFileSync('dist/index.html', 'utf8')
  .replace(/<script type="module"[^>]*><\/script>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\n\s*/g, ' ');
const notice = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8').replace(/--/g, '- -');
html = html
  .replace('</head>', () => `<style>${read('.css')}</style></head>`)
  .replace('</body>', () => `<script type="module">${read('.js').replace(/<\/script/g, '<\\/script')}</script></body>`)
  .replace('</html>', () => `</html>\n<!--\n${notice}-->\n`);

mkdirSync('dist-aura', { recursive: true });
writeFileSync('dist-aura/index.html', html);
const size = Buffer.byteLength(html);
console.log(`dist-aura/index.html ${(size / 1024).toFixed(0)} KB of ${LIMIT / 1024 / 1024} MB`);
if (size > LIMIT) process.exit(1);
