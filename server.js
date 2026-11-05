'use strict';
// Minimal production-ready server without dependencies:
// serves dist/ and handles POST /api/contact with server-side validation and anti-spam.
// Usage: node server.js   (PORT env var, default 3000)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 3000;
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ---------- contact form ----------

const REQUEST_TYPES = ['new-project', 'integration', 'support', 'partnership', 'other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 3000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}

function validate(body) {
  const str = (k) => (typeof body[k] === 'string' ? body[k].trim() : '');
  const data = {
    name: str('name'),
    email: str('email'),
    company: str('company'),
    phone: str('phone'),
    type: str('type') || 'other',
    message: str('message'),
    lang: str('lang').slice(0, 5),
    source: str('source').slice(0, 30),
  };
  const errors = {};
  const need = (k, max) => {
    if (!data[k]) errors[k] = 'required';
    else if (data[k].length > max) errors[k] = 'tooLong';
  };
  need('name', 100);
  need('email', 150);
  need('company', 150);
  need('message', 3000);
  if (!errors.email && !EMAIL_RE.test(data.email)) errors.email = 'email';
  if (!errors.message && data.message.length < 10) errors.message = 'tooShort';
  if (data.phone.length > 40) errors.phone = 'tooLong';
  if (!REQUEST_TYPES.includes(data.type)) errors.type = 'required';
  if (site.features.consentCheckbox && body.consent !== 'yes') errors.consent = 'consent';
  return { data, errors };
}

function isSpam(body) {
  if (body.website) return true; // honeypot filled
  const ts = Number(body.ts);
  if (ts && Date.now() - ts < MIN_FILL_MS) return true; // submitted too fast
  return false;
}

function saveSubmission(data, meta) {
  // Replace with CRM / email integration. Stored locally as JSON lines by default.
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const record = { ...data, receivedAt: new Date().toISOString(), ...meta };
  fs.appendFileSync(path.join(DATA_DIR, 'submissions.jsonl'), JSON.stringify(record) + '\n');
}

function readBody(req, limit = 20 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleContact(req, res) {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  const reply = (status, payload) => {
    if (wantsJson) return send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8');
    // No-JS fallback: redirect on success, simple page on error.
    if (payload.ok) {
      res.writeHead(303, { Location: '/contact/thank-you/', ...SECURITY_HEADERS });
      return res.end();
    }
    return send(res, status, `<!doctype html><meta charset="utf-8"><title>Request not sent</title><p>Please check the form and try again. <a href="/contact/">Back to the form</a></p>`, MIME['.html']);
  };

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'rateLimit' });

  let body;
  try {
    const raw = await readBody(req);
    const type = req.headers['content-type'] || '';
    body = type.includes('application/json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
  } catch (err) {
    return reply(err.status || 400, { ok: false, error: 'server' });
  }
  if (!body || typeof body !== 'object') return reply(400, { ok: false, error: 'server' });

  // Respond as success to bots so they do not retry, but do not store anything.
  if (isSpam(body)) return reply(200, { ok: true });

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) return reply(422, { ok: false, errors });

  try {
    saveSubmission(data, { userAgent: String(req.headers['user-agent'] || '').slice(0, 200) });
  } catch (err) {
    console.error('Failed to store submission:', err);
    return reply(500, { ok: false, error: 'server' });
  }
  return reply(200, { ok: true });
}

// ---------- static files ----------

function send(res, status, body, type, extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
  res.end(body);
}

function resolveFile(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const index = path.join(file, 'index.html');
  if (fs.existsSync(index)) return index;
  return null;
}

function serveStatic(req, res, urlPath) {
  // Clean URLs end with a slash.
  if (!path.extname(urlPath) && !urlPath.endsWith('/') && resolveFile(urlPath + '/')) {
    res.writeHead(301, { Location: urlPath + '/', ...SECURITY_HEADERS });
    return res.end();
  }
  const file = resolveFile(urlPath);
  if (!file) {
    const notFound = path.join(DIST, '404.html');
    return send(res, 404, fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found', MIME['.html']);
  }
  const ext = path.extname(file);
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
  send(res, 200, req.method === 'HEAD' ? '' : fs.readFileSync(file), MIME[ext] || 'application/octet-stream', { 'Cache-Control': cache });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/api/contact') {
    if (req.method !== 'POST') return send(res, 405, 'Method not allowed', MIME['.txt'], { Allow: 'POST' });
    return handleContact(req, res).catch((err) => {
      console.error(err);
      send(res, 500, JSON.stringify({ ok: false, error: 'server' }), MIME['.json']);
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', MIME['.txt']);
  serveStatic(req, res, urlPath);
});

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}
server.listen(PORT, () => console.log(`Site running at http://localhost:${PORT}`));
