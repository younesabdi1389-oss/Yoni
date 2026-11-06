/* تست لایه‌ی Express (نیازمند npm install): مسیرها، ترتیب middleware و نشست — با مخزن حافظه‌ای، بدون دیتابیس
   اجرا:  node tests/http.js */
const assert = require('assert');
const Module = require('module');
const { createMemRepo } = require('../lib/memrepo');
Object.assign(process.env, { APP_USERNAME: 'u', APP_PASSWORD: 'pass-1234', SESSION_SECRET: 'test-secret', PORT: '38123', NODE_ENV: 'test' });
const mem = createMemRepo();
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === './db') return { pool: { query: async () => ({ rows: [{}] }) }, initSchema: async () => {} };
  if (req === './lib/pgrepo') return mem;
  return origLoad.call(this, req, ...rest);
};
require('../server.js');

const base = 'http://127.0.0.1:38123';
let cookie = '';
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Client-Date': '2026-11-05', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data, headers: r.headers };
};
(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(base + '/api/me'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  assert.equal((await call('GET', '/api/settings')).status, 401, 'بدون ورود باید 401 باشد');
  assert.equal((await call('POST', '/api/login', { username: 'u', password: 'bad' })).status, 401);
  const ok = await call('POST', '/api/login', { username: 'u', password: 'pass-1234' });
  assert.equal(ok.status, 200); cookie = ok.headers.get('set-cookie').split(';')[0];
  for (const p of ['/api/settings', '/api/dashboard', '/api/subjects', '/api/transactions', '/api/skills', '/api/tasks', '/api/projects', '/api/goals', '/api/habits', '/api/notes', '/api/courses', '/api/exams', '/api/focus', '/api/savings', '/api/money/summary', '/api/money/report', '/api/reports?period=week', '/api/health']) {
    const r = await call('GET', p); assert.equal(r.status, 200, `${p} → ${r.status} ${JSON.stringify(r.data)}`);
  }
  const t = await call('POST', '/api/tasks', { title: 'تست', due_date: '2026-11-05' }); assert.equal(t.status, 200, 'POST task');
  assert.equal((await call('PATCH', `/api/tasks/${t.data.id}/done`, { done: true })).status, 200);
  assert.equal((await call('PUT', '/api/settings', { theme: 'light' })).data.theme, 'light');
  assert.equal((await call('POST', '/api/tasks', { title: '' })).status, 400);
  assert.equal((await call('GET', '/api/nope')).status, 404);
  assert.equal((await call('PUT', '/api/account/password', { current: 'x', next: '12345678' })).status, 400);
  console.log('✓ لایه‌ی Express درست کار می‌کند');
  process.exit(0);
})().catch((e) => { console.error('✗ FAIL', e); process.exit(1); });
