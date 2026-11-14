// Hustle Connect backend. No npm packages needed: just Node 18+.
// Run:  node server.js   (from the project folder)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET = process.env.SECRET || crypto.randomBytes(32).toString('hex'); // set SECRET in production so logins survive restarts
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // e.g. https://yourname.github.io
const CATEGORIES = ['Graphics Design', 'Web Development', 'Video Editing', 'Typing and CV Writing', 'Digital Marketing', 'Photography'];

/* ---------- tiny JSON database ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { users: [], providers: [], messages: [] };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch {}
const save = () => { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, DB_FILE); };

/* ---------- helpers ---------- */
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.end(JSON.stringify(obj));
};
const readBody = req => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 20000) { reject(new Error('Request too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
});
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const verify = (pw, stored) => {
  const [salt, h] = stored.split(':'); const a = Buffer.from(hash(pw, salt).split(':')[1], 'hex'), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('hex');
const makeToken = id => { const p = id + '.' + (Date.now() + 7 * 864e5); return p + '.' + sign(p); };
function authUser(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', ''); const [id, exp, sig] = t.split('.');
  if (!sig || sign(id + '.' + exp) !== sig || Date.now() > +exp) return null;
  return db.users.find(u => u.id === id) || null;
}
const pub = u => ({ name: u.name, email: u.email });
const hits = new Map(); // very small rate limiter: 20 write requests / minute / IP
function limited(req) {
  const ip = req.socket.remoteAddress, now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr); return arr.length > 20;
}

/* ---------- API routes ---------- */
async function api(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  if (req.method === 'GET' && url.pathname === '/api/providers') {
    const cat = url.searchParams.get('category');
    const list = db.providers.filter(p => !cat || p.category === cat).sort((a, b) => b.created - a.created)
      .map(({ id, title, category, description, price, contact, owner }) => ({ id, title, category, description, price, contact, owner }));
    return send(res, 200, { providers: list });
  }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const u = authUser(req); return u ? send(res, 200, { user: pub(u) }) : send(res, 401, { error: 'Not logged in' });
  }
  if (req.method !== 'POST') return send(res, 404, { error: 'Not found' });
  if (limited(req)) return send(res, 429, { error: 'Too many requests, please wait a minute' });
  const b = await readBody(req);

  if (url.pathname === '/api/signup') {
    const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), pw = String(b.password ?? '');
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Enter your name and a valid email' });
    if (pw.length < 8 || pw.length > 100) return send(res, 400, { error: 'Password must be 8 to 100 characters' });
    if (db.users.some(u => u.email === email)) return send(res, 409, { error: 'That email is already registered' });
    const u = { id: crypto.randomUUID(), name, email, password: hash(pw), created: Date.now() };
    db.users.push(u); save(); return send(res, 201, { token: makeToken(u.id), user: pub(u) });
  }
  if (url.pathname === '/api/login') {
    const u = db.users.find(x => x.email === clean(b.email, 120).toLowerCase());
    if (!u || !verify(String(b.password ?? ''), u.password)) return send(res, 401, { error: 'Wrong email or password' });
    return send(res, 200, { token: makeToken(u.id), user: pub(u) });
  }
  if (url.pathname === '/api/providers') {
    const u = authUser(req); if (!u) return send(res, 401, { error: 'Please log in first' });
    const p = { id: crypto.randomUUID(), title: clean(b.title, 80), category: clean(b.category, 40), description: clean(b.description, 300), price: clean(b.price, 30), contact: clean(b.contact, 80), owner: u.name, ownerId: u.id, created: Date.now() };
    if (!p.title || !p.description || !p.contact || !CATEGORIES.includes(p.category)) return send(res, 400, { error: 'Fill in title, category, description and contact' });
    db.providers.push(p); save(); return send(res, 201, { ok: true });
  }
  if (url.pathname === '/api/contact') {
    const m = { id: crypto.randomUUID(), name: clean(b.name, 80), email: clean(b.email, 120), message: clean(b.message, 1000), created: Date.now() };
    if (!m.name || !m.message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) return send(res, 400, { error: 'Fill in your name, a valid email and a message' });
    db.messages.push(m); save(); return send(res, 201, { ok: true });
  }
  return send(res, 404, { error: 'Not found' });
}

/* ---------- static files (only the public site, never server/ or data) ---------- */
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
  const ok = /^\/[\w-]+\.(html|css|jpg|png|svg)$/.test(rel) || ['/script.js', '/pages.js'].includes(rel);
  const file = path.join(ROOT, rel);
  if (!ok || !file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=300' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try { url.pathname.startsWith('/api/') ? await api(req, res, url) : serveStatic(req, res, url); }
  catch (e) { if (!res.headersSent) send(res, 400, { error: e.message || 'Bad request' }); }
}).listen(PORT, () => console.log(`Hustle Connect running at http://localhost:${PORT}`));
