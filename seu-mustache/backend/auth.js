'use strict';
/* Senhas (scrypt), sessões por token e limite de tentativas. */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { db } = require('./db');
const scrypt = promisify(crypto.scrypt);

const SESSION_DAYS = 7;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${h.toString('base64')}`;
}
let DUMMY = null; // usado para gastar o mesmo tempo quando o e-mail não existe
async function verifyPassword(pw, stored) {
  if (!stored) { DUMMY = DUMMY || (await hashPassword('dummy-password')); stored = DUMMY; pw = pw + '!'; }
  const [alg, s, h] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(h, 'base64');
  const got = await scrypt(pw, Buffer.from(s, 'base64'), want.length);
  return crypto.timingSafeEqual(want, got);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?, ?, ?)').run(sha(token), userId, exp);
  return token;
}
function userFromToken(token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha(token), Date.now());
  return row || null;
}
const destroySession = (token) => { if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token)); };
const cleanupSessions = () => db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

/* limitador simples em memória (por IP/e-mail) */
const hits = new Map();
function tooMany(key, max, windowMs) {
  const now = Date.now(), h = hits.get(key);
  if (!h || h.reset < now) return false;
  return h.n >= max;
}
function addHit(key, windowMs) {
  const now = Date.now(), h = hits.get(key);
  if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + windowMs }); else h.n++;
}
const clearHits = (key) => hits.delete(key);
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 600000).unref();

module.exports = { hashPassword, verifyPassword, createSession, userFromToken, destroySession, cleanupSessions, tooMany, addHit, clearHits };
