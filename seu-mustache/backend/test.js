'use strict';
/* Testes de integração: node --test backend/test.js */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
delete process.env.NODE_ENV; delete process.env.SEED_DEMO;

const { createServer } = require('./server');
const { bootstrap } = require('./seed');

let base, server;
test.before(async () => {
  await bootstrap();
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

async function call(method, url, body, token) {
  const h = {}; if (body !== undefined) h['Content-Type'] = 'application/json'; if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(base + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null; try { data = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, data };
}
const login = async (email, password) => (await call('POST', '/api/auth/login', { email, password })).data;

test('público: serviços, barbeiros sem dados sensíveis e configurações públicas', async () => {
  const { status, data } = await call('GET', '/api/public');
  assert.equal(status, 200);
  assert.equal(data.demo, true);
  assert.equal(data.services.length, 6);
  assert.equal(data.barbers.length, 3);
  assert.deepEqual(Object.keys(data.barbers[0]).sort(), ['id', 'name', 'spec', 'status']);
  assert.ok(!('autoConfirm' in data.settings));
});

test('rotas do admin exigem login e perfil de administrador', async () => {
  assert.equal((await call('GET', '/api/admin/state')).status, 401);
  const c = await login('cliente@seumustache.demo', 'cliente123');
  assert.equal(c.user.role, 'client');
  assert.equal((await call('GET', '/api/admin/state', undefined, c.token)).status, 403);
  assert.equal((await call('POST', '/api/admin/services', { name: 'x' }, c.token)).status, 403);
});

test('login: senha errada = 401 e logout invalida o token', async () => {
  assert.equal((await call('POST', '/api/auth/login', { email: 'admin@seumustache.demo', password: 'errada' })).status, 401);
  const a = await login('admin@seumustache.demo', 'admin123');
  assert.equal((await call('GET', '/api/auth/me', undefined, a.token)).status, 200);
  await call('POST', '/api/auth/logout', {}, a.token);
  assert.equal((await call('GET', '/api/auth/me', undefined, a.token)).status, 401);
});

test('estado completo do painel', async () => {
  const a = await login('admin@seumustache.demo', 'admin123');
  const { status, data } = await call('GET', '/api/admin/state', undefined, a.token);
  assert.equal(status, 200);
  assert.equal(data.appts.length, 8);
  assert.equal(data.sales.length, 14);
  assert.equal(data.sales[0].id, 'P001');
  assert.equal(data.sales[0].d, 0);
  assert.equal(data.sales.find((s) => s.id === 'P014').d, 20);
  assert.equal(data.cats.length, 6);
  assert.equal(data.fin.length, 4);
  assert.equal(data.settings.autoConfirm, true);
  assert.ok(data.barbers[0].email);
});

test('CRUD de serviços com validação', async () => {
  const a = (await login('admin@seumustache.demo', 'admin123')).token;
  const bad = await call('POST', '/api/admin/services', { name: '', cat: 'Cortes', dur: 30, price: 10 }, a);
  assert.equal(bad.status, 422);
  assert.equal((await call('POST', '/api/admin/services', { name: 'Teste', cat: 'Inexistente', dur: 30, price: 10 }, a)).status, 422);
  assert.equal((await call('POST', '/api/admin/services', { name: 'Teste', cat: 'Cortes', dur: 30, price: -5 }, a)).status, 422);
  const c = await call('POST', '/api/admin/services', { id: 'SV001', name: 'Platinado', cat: 'Tratamentos', dur: 90, price: '120.5', desc: 'x' }, a);
  assert.equal(c.status, 201);
  assert.notEqual(c.data.id, 'SV001'); // id repetido é substituído por um novo
  assert.equal(c.data.price, 120.5);
  const u = await call('PUT', '/api/admin/services/' + c.data.id, { price: 99 }, a);
  assert.equal(u.data.price, 99); assert.equal(u.data.name, 'Platinado');
  assert.equal((await call('GET', '/api/public')).data.services.length, 7);
  assert.equal((await call('DELETE', '/api/admin/services/' + c.data.id, undefined, a)).status, 200);
  assert.equal((await call('DELETE', '/api/admin/services/' + c.data.id, undefined, a)).status, 404);
});

test('venda nova usa o preço do serviço e data de hoje', async () => {
  const a = (await login('admin@seumustache.demo', 'admin123')).token;
  const s = await call('POST', '/api/admin/sales', { client: '', service: 'SV003', barber: 'BB01', pay: 'Pix', status: 'Pago', t: '10:15', d: 0 }, a);
  assert.equal(s.status, 201);
  assert.equal(s.data.total, 80); assert.equal(s.data.d, 0);
  const list = (await call('GET', '/api/admin/sales', undefined, a)).data;
  assert.equal(list[0].id, s.data.id); // mais nova primeiro
});

test('cadastro de cliente cria conta + ficha e bloqueia e-mail repetido', async () => {
  const body = { name: 'Fulano de Tal', email: 'Fulano@Exemplo.com', phone: '(31) 98888-7777', password: 'segredo1' };
  const s = await call('POST', '/api/auth/signup', body);
  assert.equal(s.status, 201); assert.equal(s.data.user.role, 'client');
  assert.equal((await call('POST', '/api/auth/signup', body)).status, 409);
  assert.equal((await call('POST', '/api/auth/signup', { ...body, email: 'x@y.com', phone: '123' })).status, 422);
  const a = (await login('admin@seumustache.demo', 'admin123')).token;
  const clients = (await call('GET', '/api/admin/clients', undefined, a)).data;
  assert.ok(clients.some((c) => c.email === 'fulano@exemplo.com'));
  assert.equal((await login('fulano@exemplo.com', 'segredo1')).user.name, 'Fulano de Tal');
});

test('configurações e categorias', async () => {
  const a = (await login('admin@seumustache.demo', 'admin123')).token;
  assert.equal((await call('PUT', '/api/admin/settings', { ios: 'ftp://x' }, a)).status, 422);
  const ok = await call('PUT', '/api/admin/settings', { phone: '(31) 3333-0000', android: 'https://play.google.com/x', remind: false }, a);
  assert.equal(ok.status, 200);
  const pub = (await call('GET', '/api/public')).data.settings;
  assert.equal(pub.phone, '(31) 3333-0000');
  assert.equal((await call('PUT', '/api/admin/cats', ['A', 'B'], a)).status, 200);
  assert.deepEqual((await call('GET', '/api/admin/state', undefined, a)).data.cats, ['A', 'B']);
});

test('novo administrador e ticket', async () => {
  const a = (await login('admin@seumustache.demo', 'admin123')).token;
  assert.equal((await call('POST', '/api/admin/users', { name: 'Outro Admin', email: 'outro@x.com', password: 'abcdef' }, a)).status, 201);
  assert.equal((await call('POST', '/api/admin/users', { name: 'Outro Admin', email: 'outro@x.com', password: 'abcdef' }, a)).status, 409);
  assert.equal((await login('outro@x.com', 'abcdef')).user.role, 'admin');
  assert.equal((await call('POST', '/api/admin/tickets', { name: 'A B', email: 'a@b.com', message: 'oi' }, a)).status, 201);
});

test('arquivos estáticos: só site público, nada do backend', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/backend/db.js')).status, 404);
  assert.equal((await fetch(base + '/backend/data/test.db')).status, 404);
  assert.equal((await fetch(base + '/js/../backend/auth.js')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/package.json')).status, 404);
});

test('limite de tentativas de login', async () => {
  let last;
  for (let i = 0; i < 10; i++) last = await call('POST', '/api/auth/login', { email: 'brute@x.com', password: 'x' + i });
  assert.equal(last.status, 429);
});

test('corpo inválido e rota inexistente', async () => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(r.status, 400);
  assert.equal((await call('GET', '/api/nada')).status, 404);
});
