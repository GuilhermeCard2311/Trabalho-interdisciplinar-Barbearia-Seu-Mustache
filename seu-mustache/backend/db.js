'use strict';
/* Banco SQLite (node:sqlite) + validação + CRUD genérico dos recursos do painel. */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'seumustache.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

/* ---------- datas (fuso da barbearia) ---------- */
const TZ = process.env.APP_TZ || 'America/Sao_Paulo';
const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5);

/* ---------- definição dos campos ---------- */
const str = (l, max, o = {}) => ({ t: 'str', l, max, ...o });
const en = (l, vals, def) => ({ t: 'enum', l, vals, def: def ?? vals[0] });
const int = (l, min, max, def = 0) => ({ t: 'int', l, min, max, def });
const num = (l, min, max, def = 0) => ({ t: 'num', l, min, max, def });
const date = (l, o = {}) => ({ t: 'date', l, ...o });
const time = (l) => ({ t: 'time', l });
const bool = (l) => ({ t: 'bool', l });

const RESOURCES = {
  services: { prefix: 'SV', newestFirst: false, public: true, fields: {
    name: str('Nome', 80, { req: true }),
    cat: en('Categoria', ['Cortes', 'Barba', 'Combos', 'Sobrancelha', 'Tratamentos']),
    dur: int('Duração', 1, 600, 30), price: num('Preço', 0, 100000),
    desc: str('Descrição', 300) } },
  barbers: { prefix: 'BB', newestFirst: false, fields: {
    name: str('Nome', 80, { req: true }), spec: str('Especialidade', 120, { req: true }),
    phone: str('Telefone', 30), email: str('E-mail', 120),
    status: en('Status', ['Ativo', 'Inativo']), comm: num('Comissão', 0, 100) } },
  clients: { prefix: 'CL', newestFirst: true, fields: {
    name: str('Nome', 80, { req: true }), phone: str('Telefone', 30), email: str('E-mail', 120),
    cpf: str('CPF', 20), status: en('Status', ['Ativo', 'Inativo']),
    city: str('Cidade', 80), uf: str('Estado', 40), obs: str('Observações', 500) } },
  appts: { prefix: 'AG-', newestFirst: true, fields: {
    type: en('Tipo', ['Agendado', 'Encaixe', 'Remarcação', 'Bloqueio']),
    client: str('Cliente', 40), service: str('Serviço', 40), barber: str('Barbeiro', 40),
    date: date('Data', { req: true }), time: time('Horário'),
    status: en('Status', ['Confirmado', 'Concluído', 'Cancelado', 'Faltou', 'Pendente']),
    notes: str('Observações', 300) } },
  sales: { prefix: 'P', newestFirst: true, day: { key: 'd', col: 'date', sign: -1 }, fields: {
    t: time('Hora'), client: str('Cliente', 40), service: str('Serviço', 40), barber: str('Barbeiro', 40),
    total: num('Total', 0, 1000000), status: en('Status', ['Pago', 'Pendente', 'Cancelado']),
    pay: en('Pagamento', ['Cartão', 'Pix', 'Dinheiro'], 'Pix') } },
  reviews: { prefix: 'R', newestFirst: true, public: true, fields: {
    n: str('Nome', 80, { req: true }), f: str('Função', 80), t: str('Avaliação', 500, { req: true }) } },
  notes: { prefix: 'N', newestFirst: true, fields: {
    title: str('Título', 120, { req: true }), cat: en('Categoria', ['Agenda', 'Financeiro', 'Equipe', 'Clientes']),
    urg: en('Urgência', ['Alta', 'Média', 'Baixa'], 'Média'), desc: str('Descrição', 500) } },
  alerts: { prefix: 'A', newestFirst: false, fields: {
    t: str('Título', 80, { req: true }), s: str('Subtítulo', 80), n: int('Quantidade', 0, 9999), fresh: bool('Novo') } },
  bills: { prefix: 'B', newestFirst: false, day: { key: 'd', col: 'due', sign: 1 }, fields: {
    t: str('Descrição', 100, { req: true }), v: num('Valor', 0, 10000000) } },
};

const SQLTYPE = { str: "TEXT NOT NULL DEFAULT ''", enum: 'TEXT NOT NULL', int: 'INTEGER NOT NULL DEFAULT 0',
  num: 'REAL NOT NULL DEFAULT 0', date: 'TEXT NOT NULL', time: "TEXT NOT NULL DEFAULT ''", bool: 'INTEGER NOT NULL DEFAULT 0' };
const q = (n) => '"' + n + '"';

/* ---------- esquema ---------- */
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE, phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('admin','client')), pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cats(seq INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fin(
  seq INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Entrada','Saída')), "desc" TEXT NOT NULL, v REAL NOT NULL);
CREATE TABLE IF NOT EXISTS tickets(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
`);
for (const [name, r] of Object.entries(RESOURCES)) {
  const cols = Object.entries(r.fields).map(([k, f]) => `${q(k)} ${SQLTYPE[f.t]}`);
  if (r.day) cols.push(`${q(r.day.col)} TEXT NOT NULL`);
  db.exec(`CREATE TABLE IF NOT EXISTS ${name}(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, ${cols.join(', ')});`);
}

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/* ---------- validação ---------- */
function coerce(f, v) {
  switch (f.t) {
    case 'str': {
      if (typeof v !== 'string' && typeof v !== 'number') throw 'valor inválido';
      const s = String(v).trim();
      if (s.length > f.max) throw `no máximo ${f.max} caracteres`;
      if (f.req && !s) throw 'campo obrigatório';
      return s;
    }
    case 'enum': if (!f.vals.includes(v)) throw 'opção inválida'; return v;
    case 'int': case 'num': {
      const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n)) throw 'número inválido';
      if (f.t === 'int' && !Number.isInteger(n)) throw 'use um número inteiro';
      if (n < f.min || n > f.max) throw `valor fora do intervalo (${f.min} a ${f.max})`;
      return f.t === 'num' ? Math.round(n * 100) / 100 : n;
    }
    case 'date': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v + 'T12:00:00Z'))) throw 'data inválida';
      return v;
    }
    case 'time': {
      if (v === '' || v == null) return '';
      if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw 'horário inválido (HH:MM)';
      return v;
    }
    case 'bool': return v === true || v === 1 || v === 'true' || v === '1' ? 1 : 0;
  }
}
function clean(r, input, partial) {
  const vals = {}, errs = {};
  for (const [k, f] of Object.entries(r.fields)) {
    if (input[k] === undefined || input[k] === null) {
      if (partial) continue;
      if (f.req) { errs[k] = `${f.l}: campo obrigatório`; continue; }
      if (f.t === 'date') { errs[k] = `${f.l}: campo obrigatório`; continue; }
      vals[k] = f.t === 'enum' ? f.def : f.t === 'bool' ? 0 : f.t === 'int' || f.t === 'num' ? f.def : '';
      continue;
    }
    try { vals[k] = coerce(f, input[k]); } catch (m) { errs[k] = `${f.l}: ${m}`; }
  }
  if (Object.keys(errs).length) throw new HttpError(422, Object.values(errs)[0], errs);
  return vals;
}

/* ---------- CRUD genérico ---------- */
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const getRes = (name) => { const r = RESOURCES[name]; if (!r) throw new HttpError(404, 'Recurso não encontrado.'); return r; };
const genId = (name, prefix) => {
  const has = db.prepare(`SELECT 1 FROM ${name} WHERE id = ?`);
  for (;;) { const id = prefix + crypto.randomBytes(3).toString('hex').toUpperCase(); if (!has.get(id)) return id; }
};
function toJSON(name, row) {
  const r = RESOURCES[name], o = { id: row.id };
  for (const [k, f] of Object.entries(r.fields)) o[k] = f.t === 'bool' ? !!row[k] : row[k];
  if (r.day) o[r.day.key] = r.day.sign * diffDays(row[r.day.col], todayISO());
  return o;
}
function list(name, { onlyPublicFields } = {}) {
  const r = getRes(name);
  const rows = db.prepare(`SELECT * FROM ${name} ORDER BY seq ${r.newestFirst ? 'DESC' : 'ASC'}`).all();
  return rows.map((row) => toJSON(name, row));
}
function get(name, id) { const row = db.prepare(`SELECT * FROM ${name} WHERE id = ?`).get(id); return row ? toJSON(name, row) : null; }

function create(name, input) {
  const r = getRes(name);
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Corpo inválido.');
  const vals = clean(r, input, false);
  if (name === 'sales' && input.total === undefined) {
    const s = db.prepare('SELECT price FROM services WHERE id = ?').get(vals.service);
    vals.total = s ? s.price : 0;
  }
  if (r.day) {
    let d = 0;
    if (input[r.day.key] !== undefined) {
      d = Number(input[r.day.key]);
      if (!Number.isInteger(d) || Math.abs(d) > 3650) throw new HttpError(422, 'Data inválida.', { [r.day.key]: 'Data inválida.' });
    }
    vals[r.day.col] = addDays(todayISO(), r.day.sign * d);
  }
  const id = typeof input.id === 'string' && ID_RE.test(input.id) && !get(name, input.id) ? input.id : genId(name, r.prefix);
  const keys = Object.keys(vals);
  db.prepare(`INSERT INTO ${name}(id, ${keys.map(q).join(', ')}) VALUES(?, ${keys.map(() => '?').join(', ')})`).run(id, ...keys.map((k) => vals[k]));
  return get(name, id);
}
function update(name, id, input) {
  const r = getRes(name);
  if (!get(name, id)) throw new HttpError(404, 'Registro não encontrado.');
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Corpo inválido.');
  const vals = clean(r, input, true), keys = Object.keys(vals);
  if (keys.length) db.prepare(`UPDATE ${name} SET ${keys.map((k) => q(k) + ' = ?').join(', ')} WHERE id = ?`).run(...keys.map((k) => vals[k]), id);
  return get(name, id);
}
function remove(name, id) {
  getRes(name);
  const res = db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id);
  if (!res.changes) throw new HttpError(404, 'Registro não encontrado.');
}

/* ---------- configurações, categorias, financeiro ---------- */
const SETTING_DEFAULTS = { phone: '', addr: '', email: '', insta: '', hours: '', android: '', ios: '', autoConfirm: true, remind: true, walkin: true };
const PUBLIC_SETTINGS = ['phone', 'addr', 'email', 'insta', 'hours', 'android', 'ios'];
function getSettings() {
  const out = { ...SETTING_DEFAULTS };
  for (const row of db.prepare('SELECT key, value FROM settings').all()) {
    if (row.key in out) { try { out[row.key] = JSON.parse(row.value); } catch { /* mantém padrão */ } }
  }
  return out;
}
function publicSettings() { const s = getSettings(), o = {}; PUBLIC_SETTINGS.forEach((k) => (o[k] = s[k])); return o; }
function saveSettings(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Corpo inválido.');
  const cur = getSettings(), errs = {};
  for (const k of Object.keys(SETTING_DEFAULTS)) {
    if (input[k] === undefined) continue;
    if (typeof SETTING_DEFAULTS[k] === 'boolean') { cur[k] = input[k] === true; continue; }
    if (typeof input[k] !== 'string' || input[k].trim().length > 200) { errs[k] = 'Valor inválido (máximo de 200 caracteres).'; continue; }
    const v = input[k].trim();
    if ((k === 'android' || k === 'ios') && v && !/^https?:\/\/\S+$/i.test(v)) { errs[k] = 'Use um link que comece com https://'; continue; }
    cur[k] = v;
  }
  if (Object.keys(errs).length) throw new HttpError(422, Object.values(errs)[0], errs);
  tx(() => { const up = db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [k, v] of Object.entries(cur)) up.run(k, JSON.stringify(v)); });
  return cur;
}
const getCats = () => db.prepare('SELECT name FROM cats ORDER BY seq').all().map((r) => r.name);
function saveCats(arr) {
  if (!Array.isArray(arr) || arr.length > 50) throw new HttpError(422, 'Lista de categorias inválida.');
  const names = arr.map((n) => { if (typeof n !== 'string' || !n.trim() || n.trim().length > 60) throw new HttpError(422, 'Cada categoria precisa ter de 1 a 60 caracteres.'); return n.trim(); });
  tx(() => { db.exec('DELETE FROM cats'); const ins = db.prepare('INSERT INTO cats(name) VALUES(?)'); names.forEach((n) => ins.run(n)); });
  return names;
}
const listFin = () => db.prepare('SELECT * FROM fin ORDER BY seq').all().map((r) => ({ d: diffDays(todayISO(), r.date), type: r.type, desc: r.desc, v: r.v }));
function addFin(o) {
  if (!['Entrada', 'Saída'].includes(o.type)) throw new HttpError(422, 'Tipo inválido.');
  db.prepare('INSERT INTO fin(date, type, "desc", v) VALUES(?, ?, ?, ?)').run(addDays(todayISO(), -Number(o.d || 0)), o.type, String(o.desc).slice(0, 200), Number(o.v));
}

module.exports = { db, tx, HttpError, RESOURCES, list, get, create, update, remove,
  getSettings, publicSettings, saveSettings, getCats, saveCats, listFin, addFin, todayISO, addDays, DB_PATH };
