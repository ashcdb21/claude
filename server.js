'use strict';

// Tactics Lab server: serves the static board and proxies POST /api/claude
// to the Anthropic Messages API so the API key never reaches the browser.
// No dependencies; Node 18+.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
loadDotEnv(path.join(ROOT, '.env'));

const PORT = process.env.PORT || 3000;
const API_BASE = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const EFFORT = process.env.ANTHROPIC_EFFORT || 'medium';
const MAX_BODY = 256 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Files that must never be served even though they live in the repo root.
const BLOCKED = new Set(['.env', 'server.js', 'package.json']);

// Minimal .env reader: KEY=VALUE lines, optional quotes, # comments.
// Real environment variables win over the file.
function loadDotEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// POST /api/claude { prompt, system?, maxTokens? } -> the upstream SSE stream,
// piped through unchanged. The model, effort and key are fixed server-side.
async function proxyClaude(req, res) {
  // Only the page this server serves may use the proxy.
  const origin = req.headers.origin;
  let sameOrigin = true;
  if (origin) { try { sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; } }
  if (!sameOrigin) return sendJSON(res, 403, { error: 'Cross-origin requests are not allowed.' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return sendJSON(res, 503, { error: 'ANTHROPIC_API_KEY is not set on the server. Add it to .env or the environment and restart.' });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJSON(res, 400, { error: 'Expected a JSON body.' });
  }
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) return sendJSON(res, 400, { error: 'Missing prompt.' });

  const payload = {
    model: MODEL,
    max_tokens: Math.min(Math.max(Number(body.maxTokens) || 16000, 256), 32000),
    stream: true,
    output_config: { effort: EFFORT },
    // On a safety-classifier decline, retry server-side on Anthropic's recommended fallback model.
    fallbacks: 'default',
    messages: [{ role: 'user', content: body.prompt }],
  };
  if (typeof body.system === 'string' && body.system) payload.system = body.system;

  const controller = new AbortController();
  res.on('close', () => controller.abort());
  let upstream;
  try {
    upstream = await fetch(`${API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    return sendJSON(res, 502, { error: `Could not reach the Anthropic API: ${err.message}` });
  }

  if (!upstream.ok) {
    let detail = '';
    try { detail = (await upstream.json()).error?.message || ''; } catch {}
    return sendJSON(res, upstream.status, { error: `Anthropic API error ${upstream.status}${detail ? `: ${detail}` : ''}` });
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  try {
    for await (const chunk of upstream.body) res.write(chunk);
  } catch {
    // Client went away or upstream dropped; nothing more to send.
  }
  res.end();
}

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.normalize(path.join(ROOT, pathname));
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some((p) => p.startsWith('.')) || BLOCKED.has(rel)) {
    res.writeHead(404);
    return res.end('Not found');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname === '/api/claude') {
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' });
      return res.end();
    }
    return proxyClaude(req, res).catch((err) => {
      if (!res.headersSent) sendJSON(res, 500, { error: err.message });
      else res.end();
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Tactics Lab running at http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? `AI features on (${MODEL}, effort ${EFFORT}).` : 'AI features off: set ANTHROPIC_API_KEY to enable them.');
});
