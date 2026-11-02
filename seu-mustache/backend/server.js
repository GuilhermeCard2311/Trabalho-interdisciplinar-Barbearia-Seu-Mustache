'use strict';
/* Servidor HTTP: API REST em /api e arquivos estáticos do site. Sem dependências externas. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const D = require('./db');
const A = require('./auth');
const { bootstrap } = require('./seed');
const { HttpError, db, tx } = D;

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const MAX_BODY = 1024 * 1024;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

/* ---------- utilidades ---------- */
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    if (!type.startsWith('application/json')) return reject(new HttpError(415, 'Envie o corpo como application/json.'));
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'Corpo muito grande.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new HttpError(400, 'JSON inválido.')); } });
    req.on('error', reject);
  });
}
const clientIp = (req) => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
const bearer = (req) => { const m = /^Bearer (\S+)$/.exec(String(req.headers.authorization || '')); return m ? m[1] : null; };
function auth(req, role) {
  const u = A.userFromToken(bearer(req));
  if (!u) throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  if (role && u.role !== role) throw new HttpError(403, 'Acesso restrito a administradores.');
  return u;
}
function checkAccount(b, { phone }) {
  const f = {};
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const ph = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (name.length < 3 || name.length > 80) f.name = 'Informe o nome completo.';
  if (!EMAIL_RE.test(email) || email.length > 120) f.email = 'Informe um e-mail válido.';
  if (password.length < 6 || password.length > 200) f.password = 'A senha precisa ter 6 caracteres ou mais.';
  if (phone && (ph.replace(/\D/g, '').length < 10 || ph.length > 30)) f.phone = 'Informe o telefone com DDD.';
  if (Object.keys(f).length) throw new HttpError(422, Object.values(f)[0], f);
  return { name, email, password, phone: ph };
}
const emailTaken = (email) => !!db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
const dupEmail = () => new HttpError(409, 'Este e-mail já tem cadastro.', { email: 'Este e-mail já tem cadastro.' });
const sessionOut = (u, token) => ({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });

/* ---------- rotas da API ---------- */
async function api(req, res, url) {
  const seg = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const m = req.method, ip = clientIp(req);

  if (m === 'GET' && seg[0] === 'health') return send(res, 200, { ok: true });

  if (m === 'GET' && seg[0] === 'public' && seg.length === 1) {
    const demo = !!db.prepare("SELECT 1 FROM users WHERE email = 'admin@seumustache.demo'").get();
    return send(res, 200, {
      demo,
      services: D.list('services'),
      barbers: D.list('barbers').filter((b) => b.status === 'Ativo').map(({ id, name, spec, status }) => ({ id, name, spec, status })),
      reviews: D.list('reviews'),
      settings: D.publicSettings(),
    });
  }

  if (seg[0] === 'auth') {
    if (m === 'POST' && seg[1] === 'login') {
      const b = await readJson(req);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const password = typeof b.password === 'string' ? b.password : '';
      const key = 'login:' + ip + ':' + email;
      if (A.tooMany(key, 8, 15 * 60e3)) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      const u = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
      const ok = await A.verifyPassword(password, u && u.pass_hash);
      if (!u || !ok) { A.addHit(key, 15 * 60e3); throw new HttpError(401, 'E-mail ou senha incorretos. Confira os dados e tente de novo.'); }
      A.clearHits(key);
      return send(res, 200, sessionOut(u, A.createSession(u.id)));
    }
    if (m === 'POST' && seg[1] === 'signup') {
      const key = 'signup:' + ip;
      if (A.tooMany(key, 15, 60 * 60e3)) throw new HttpError(429, 'Muitos cadastros por aqui. Tente mais tarde.');
      const c = checkAccount(await readJson(req), { phone: true });
      if (emailTaken(c.email)) throw dupEmail();
      A.addHit(key, 60 * 60e3);
      const hash = await A.hashPassword(c.password);
      const id = tx(() => {
        const r = db.prepare('INSERT INTO users(name, email, phone, role, pass_hash) VALUES(?, ?, ?, ?, ?)').run(c.name, c.email, c.phone, 'client', hash);
        if (!db.prepare('SELECT 1 FROM clients WHERE email = ?').get(c.email)) D.create('clients', { name: c.name, phone: c.phone, email: c.email, status: 'Ativo' });
        return Number(r.lastInsertRowid);
      });
      return send(res, 201, sessionOut({ id, name: c.name, email: c.email, role: 'client' }, A.createSession(id)));
    }
    if (m === 'POST' && seg[1] === 'logout') { A.destroySession(bearer(req)); return send(res, 200, { ok: true }); }
    if (m === 'GET' && seg[1] === 'me') { const u = auth(req); return send(res, 200, { user: u }); }
    throw new HttpError(404, 'Rota não encontrada.');
  }

  if (seg[0] === 'admin') {
    const me = auth(req, 'admin');
    const r = seg[1];

    if (m === 'GET' && r === 'state' && seg.length === 2) {
      const out = { settings: D.getSettings(), cats: D.getCats(), fin: D.listFin() };
      for (const k of Object.keys(D.RESOURCES)) out[k] = D.list(k);
      return send(res, 200, out);
    }
    if (m === 'PUT' && r === 'settings') return send(res, 200, D.saveSettings(await readJson(req)));
    if (m === 'PUT' && r === 'cats') return send(res, 200, D.saveCats(await readJson(req)));
    if (m === 'POST' && r === 'users') {
      const c = checkAccount(await readJson(req), { phone: false });
      if (emailTaken(c.email)) throw dupEmail();
      const hash = await A.hashPassword(c.password);
      db.prepare('INSERT INTO users(name, email, role, pass_hash) VALUES(?, ?, ?, ?)').run(c.name, c.email, 'admin', hash);
      return send(res, 201, { ok: true });
    }
    if (m === 'POST' && r === 'tickets') {
      const b = await readJson(req);
      const name = String(b.name || '').trim(), email = String(b.email || '').trim(), message = String(b.message || '').trim();
      if (!name || name.length > 80 || !EMAIL_RE.test(email) || !message || message.length > 2000) throw new HttpError(422, 'Preencha nome, e-mail válido e mensagem.');
      db.prepare('INSERT INTO tickets(name, email, message) VALUES(?, ?, ?)').run(name, email, message);
      return send(res, 201, { ok: true });
    }
    if (D.RESOURCES[r]) {
      if (m === 'GET' && seg.length === 2) return send(res, 200, D.list(r));
      if (m === 'POST' && seg.length === 2) return send(res, 201, D.create(r, await readJson(req)));
      if (m === 'PUT' && seg.length === 3) return send(res, 200, D.update(r, seg[2], await readJson(req)));
      if (m === 'DELETE' && seg.length === 3) { D.remove(r, seg[2]); return send(res, 200, { ok: true }); }
    }
    void me;
  }
  throw new HttpError(404, 'Rota não encontrada.');
}

/* ---------- arquivos estáticos (somente index.html, css/ e js/) ---------- */
function serveStatic(req, res, url) {
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!/^\/(index\.html|(css|js)\/[A-Za-z0-9._-]+\.(css|js))$/.test(rel)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
  const file = path.join(ROOT, rel);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/') || url.pathname === '/api') return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método não permitido.');
      return serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, fields: e.fields });
      console.error(e);
      return send(res, 500, { error: 'Erro interno do servidor.' });
    }
  });
}

async function start() {
  await bootstrap();
  A.cleanupSessions();
  setInterval(A.cleanupSessions, 3600e3).unref();
  const server = createServer();
  server.listen(PORT, HOST, () => console.log(`Seu Mustache rodando em http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (banco: ${D.DB_PATH})`));
  return server;
}
module.exports = { createServer, start };
if (require.main === module) start();
