// Folds the build into one self-contained page for hosts like aura.build that
// cap a site's size, and fails loudly if it has grown past that cap.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parseAst } from 'rollup/parseAst';

// Aura's project import takes up to 1 MB per HTML file; stay clear of it either way it counts a MB
const LIMIT = 1000 * 1000;
const files = readdirSync('dist/assets');
const read = (ext) => readFileSync(`dist/assets/${files.find((f) => f.endsWith(ext))}`, 'utf8');
// Shaders are by far the most compressible text left in the bundle: strip their comments and
// formatting. Directive lines keep their own line, since three.js matches them line by line.
const looksLikeGLSL = (t) => t.includes('\n') && /\b(?:void main|uniform |varying |vec[234]\b|#if|#define|#include|gl_\w)/.test(t);
const tidy = (line) => line.replace(/\s+/g, ' ')
  .replace(/ ?([(){}[\];,=*/<>&|?:!]) ?/g, '$1')
  .replace(/ ?\+(?! *\+) ?/g, '+')
  .replace(/ ?-(?! *-) ?/g, '-');
function squeezeGLSL(text) {
  const lead = /^\s/.test(text) ? (text.match(/^\s*\n/) ? '\n' : ' ') : '';
  const tail = /\s$/.test(text) ? (text.match(/\n\s*$/) ? '\n' : ' ') : '';
  let out = '', wasDirective = true;
  for (const raw of text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;
    const directive = line.startsWith('#');
    const joint = !out ? '' : directive || wasDirective ? '\n' : /[;{}]$/.test(out) ? '' : ' ';
    out += joint + (directive ? line : tidy(line));
    wasDirective = directive;
  }
  return lead + out + tail;
}
function squeeze(js) {
  const edits = [], searches = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    // the code patches shaders by searching their text, so the search has to be squeezed the same way
    if (node.type === 'CallExpression' && node.callee.property?.name === 'replace') {
      const search = node.arguments[0];
      if (search?.type === 'Literal' && typeof search.value === 'string' && /\b(?:uniform |float |gl_\w|vec[234]\b|void )/.test(search.value) && !looksLikeGLSL(search.value)) {
        const text = squeezeGLSL(search.value);
        searches.push(text);
        edits.push([search.start, search.end, JSON.stringify(text)]);
      }
    }
    if (node.type === 'Literal' && typeof node.value === 'string' && looksLikeGLSL(node.value)) {
      edits.push([node.start, node.end, JSON.stringify(squeezeGLSL(node.value))]);
    } else if (node.type === 'TemplateElement' && looksLikeGLSL(node.value.cooked ?? '')) {
      edits.push([node.start, node.end, squeezeGLSL(node.value.cooked).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')]);
    }
    for (const key in node) if (key !== 'value' || typeof node[key] === 'object') visit(node[key]);
  };
  visit(parseAst(js));
  for (const [a, b, text] of edits.sort((x, y) => y[0] - x[0])) js = js.slice(0, a) + text + js.slice(b);
  const lost = searches.filter((text) => js.split(JSON.stringify(text).slice(1, -1)).length < 3);
  if (lost.length) throw new Error(`shader patches no longer match: ${lost.join(' | ')}`);
  console.log(`${edits.length} shader strings squeezed, ${searches.length} patches still match`);
  return js;
}

let html = readFileSync('dist/index.html', 'utf8')
  .replace(/<script type="module"[^>]*><\/script>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\n\s*/g, ' ');
const notice = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8').replace(/--/g, '- -');
html = html
  .replace('</head>', () => `<style>${read('.css')}</style></head>`)
  .replace('</body>', () => `<script type="module">${squeeze(read('.js')).replace(/<\/script/g, '<\\/script')}</script></body>`)
  .replace('<head>', () => `<head><!--\n${notice}-->`);

mkdirSync('dist-aura', { recursive: true });
writeFileSync('dist-aura/index.html', html);
const size = Buffer.byteLength(html);
console.log(`dist-aura/index.html ${size} bytes of ${LIMIT}`);
if (size > LIMIT) process.exit(1);
