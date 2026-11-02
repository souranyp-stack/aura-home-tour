// Serves the single-file build so the aura.build import dialog, open in a browser, can read it.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin === 'https://www.aura.build' || origin === 'https://aura.build') res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(req.method === 'OPTIONS' ? '' : readFileSync('dist-aura/index.html'));
}).listen(4190, '127.0.0.1');
