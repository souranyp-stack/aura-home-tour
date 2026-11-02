// Serves the single-file build so the aura.build import dialog, open in a browser, can receive
// it. /send is a tiny page, opened from the Aura tab, that passes the file back as a message.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const SEND = `<!doctype html><script>
fetch('/').then((r) => r.text()).then((html) => (window.opener || window.parent).postMessage({ auraPage: html }, 'https://www.aura.build'));
</script>`;

createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(req.url === '/send' ? SEND : readFileSync('dist-aura/index.html'));
}).listen(4190, '127.0.0.1');
