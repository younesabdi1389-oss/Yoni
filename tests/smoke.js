/* تست منطق API با مخزن درون‌حافظه‌ای (بدون نیاز به دیتابیس):  node tests/smoke.js */
const assert = require('assert');
const { dispatch } = require('../lib/routes');
const { createMemRepo } = require('../lib/memrepo');
const repo = createMemRepo();
let today = '2026-11-05';
const call = (m, p, body, query = {}) => dispatch(m, p, { body, query, today, repo });
const fails = async (fn, re) => { try { await fn(); } catch (e) { assert(e.status, 'not HttpError: ' + e.stack); if (re) assert(re.test(e.message), e.message); return; } assert.fail('expected failure'); };
let n = 0; const ok = (name) => console.log('✓', name, ++n);

(async () => {
  // درس‌ها
  await fails(() => call('POST', '/api/subjects', { title: '  ' }), /الزامی/);
  const s1 = await call('POST', '/api/subjects', { title: 'فیزیک ۱', status: 'done', category: 'تخصصی', study_date: '2026-11-04' });
  const s2 = await call('POST', '/api/subjects', { title: 'ریاضی', plan_date: '2026-11-07' });
  await call('PATCH', `/api/subjects/${s2.id}/status`, { status: 'done' });
  assert.equal((await call('GET', '/api/subjects'))[0].status, 'done');
  await fails(() => call('POST', '/api/subjects', { title: 'x', study_date: '2026-13-45' }), /تاریخ/);
  ok('subjects');

  // مالی
  await fails(() => call('POST', '/api/transactions', { type: 'income', title: 'a', amount: -5 }), /صفر/);
  await call('POST', '/api/transactions', { type: 'income', title: 'حقوق', amount: 1000, tx_date: '2026-11-01' });
  await call('POST', '/api/transactions', { type: 'expense', title: 'خرید', amount: 300.5, category: 'خوراک', tx_date: '2026-10-20' });
  const sm = await call('GET', '/api/money/summary');
  assert.equal(sm.balance, 699.5); assert.equal(sm.month.income, 1000); assert.equal(sm.monthly.length, 6);
  const rep = await call('GET', '/api/money/report', null, { year: '2026' });
  assert.equal(rep.months[9].expense, 300.5); assert.equal(rep.expense_by_category[0].category, 'خوراک');
  ok('money');

  // وظایف و پروژه
  const pr = await call('POST', '/api/projects', { title: 'پایان‌نامه', start_date: '2026-11-10', end_date: '2026-11-01' }).catch((e) => e);
  assert(pr instanceof Error);
  const p = await call('POST', '/api/projects', { title: 'مقاله' });
  await fails(() => call('POST', '/api/tasks', { title: 't', project_id: 9999 }), /پروژه/);
  const t1 = await call('POST', '/api/tasks', { title: 'مرور', due_date: today, priority: 'high', project_id: p.id });
  await call('POST', '/api/tasks', { title: 'نگارش', project_id: p.id });
  await call('PATCH', `/api/tasks/${t1.id}/done`, { done: true });
  let pj = (await call('GET', '/api/projects'))[0];
  assert.equal(pj.progress, 50); assert.equal(pj.total, 2);
  await call('PUT', `/api/tasks/${t1.id}`, { title: 'مرور ۲' });                 // done نباید ریست شود
  assert.equal((await repo.get('tasks', t1.id)).done, true);
  await fails(() => call('POST', '/api/tasks', { title: 'a', due_time: '25:99' }), /ساعت/);
  await call('DELETE', `/api/projects/${p.id}`);
  assert.equal((await repo.get('tasks', t1.id)).project_id, null);
  ok('tasks/projects');

  // مهارت و هدف با مراحل
  await call('POST', '/api/skills', { title: 'پایتون', steps: [{ title: 'الف' }, { title: 'ب' }, { title: '' }] });
  let sk = (await call('GET', '/api/skills'))[0];
  assert.equal(sk.steps.length, 2); assert.equal(sk.progress, 0);
  await call('PATCH', `/api/skills/${sk.id}/steps/${sk.steps[0].id}`, { done: true });
  sk = (await call('GET', '/api/skills'))[0]; assert.equal(sk.progress, 50); assert.equal(sk.status, 'learning');
  await call('PATCH', `/api/skills/${sk.id}/steps/${sk.steps[1].id}`, { done: true });
  sk = (await call('GET', '/api/skills'))[0]; assert.equal(sk.status, 'completed');
  await fails(() => call('POST', '/api/skills', { title: 'x', link: 'ftp://a' }), /http/);
  await call('POST', '/api/goals', { title: 'کنکور ارشد', term: 'long', steps: [{ title: 'منبع' }, { title: 'آزمون' }] });
  const g = (await call('GET', '/api/goals'))[0];
  await call('PATCH', `/api/goals/${g.id}/steps/${g.steps[0].id}`, { done: true });
  assert.equal((await call('GET', '/api/goals'))[0].progress, 50);
  ok('skills/goals');

  // عادت‌ها
  const h = await call('POST', '/api/habits', { title: 'ورزش' });
  for (const d of ['2026-11-03', '2026-11-04', '2026-11-05']) await call('POST', `/api/habits/${h.id}/toggle`, { date: d });
  let hs = (await call('GET', '/api/habits'))[0];
  assert.equal(hs.streak, 3); assert.equal(hs.done_now, true); assert.equal(hs.total, 3);
  await call('POST', `/api/habits/${h.id}/toggle`, { date: '2026-11-05' });          // برداشتن تیک
  hs = (await call('GET', '/api/habits'))[0]; assert.equal(hs.streak, 2); assert.equal(hs.done_now, false);
  await fails(() => call('POST', `/api/habits/${h.id}/toggle`, { date: '2026-11-09' }), /آینده/);
  const hw = await call('POST', '/api/habits', { title: 'مرور هفتگی', frequency: 'weekly' });
  await call('POST', `/api/habits/${hw.id}/toggle`, { date: '2026-11-05' });
  assert.equal((await call('GET', '/api/habits')).find((x) => x.id === hw.id).streak, 1);
  ok('habits');

  // یادداشت، دوره، امتحان
  const nt = await call('POST', '/api/notes', { title: 'ایده', content: 'متن' });
  await call('PUT', `/api/notes/${nt.id}`, { content: 'متن جدید', pinned: true });
  assert.equal((await call('GET', '/api/notes'))[0].content, 'متن جدید');
  const co = await call('POST', '/api/courses', { title: 'دوره', total_sessions: 4, done_sessions: 1 });
  await call('PATCH', `/api/courses/${co.id}/progress`, { done_sessions: 99 });
  const c2 = (await call('GET', '/api/courses'))[0]; assert.equal(c2.done_sessions, 4); assert.equal(c2.status, 'completed'); assert.equal(c2.progress, 100);
  await call('POST', '/api/exams', { title: 'میان‌ترم', exam_date: '2026-11-20' });
  await call('POST', '/api/exams', { title: 'پایان‌ترم', exam_date: '2026-11-02', score: 17, max_score: 20 });
  await fails(() => call('POST', '/api/exams', { title: 'x', exam_date: '2026-11-02', score: 30, max_score: 20 }), /بیشتر/);
  const ex = await call('GET', '/api/exams'); assert.equal(ex.find((e) => e.score != null).score20, 17);
  ok('notes/courses/exams');

  // تمرکز و پس‌انداز
  await call('PUT', '/api/focus/active', { active: { label: 'x', accumMs: 1000, running: false } });
  assert.equal((await call('GET', '/api/focus')).active.label, 'x');
  await call('POST', '/api/focus/sessions', { label: 'مطالعه', duration_seconds: 1800 });
  const fc = await call('GET', '/api/focus'); assert.equal(fc.today_min, 30); assert.equal(fc.active, null);
  await fails(() => call('POST', '/api/focus/sessions', { duration_seconds: 0 }), /نامعتبر/);
  const sg = await call('POST', '/api/savings', { title: 'لپ‌تاپ', target_amount: 1000, initial_amount: 100 });
  await call('POST', `/api/savings/${sg.id}/deposits`, { amount: 150 });
  const sv = (await call('GET', '/api/savings'))[0]; assert.equal(sv.current, 250); assert.equal(sv.progress, 25); assert.equal(sv.remaining, 750);
  await call('DELETE', `/api/savings/deposits/${sv.deposits[0].id}`);
  assert.equal((await call('GET', '/api/savings'))[0].current, 100);
  ok('focus/savings');

  // تنظیمات، داشبورد، گزارش
  await fails(() => call('PUT', '/api/settings', { theme: 'pink' }), /تم/);
  const st = await call('PUT', '/api/settings', { currency: 'ریال', display_name: 'علی', dash_layout: [{ id: 'a', visible: true }] });
  assert.equal(st.currency, 'ریال'); assert.equal(st.dash_layout[0].id, 'a');
  const d = await call('GET', '/api/dashboard');
  assert.equal(d.subjects.done, 2); assert.equal(d.tasks.week.length, 7); assert.equal(d.focus.today_min, 30);
  assert.equal(d.habits.total, 1);
  for (const period of ['day', 'week', 'month']) {
    const r = await call('GET', '/api/reports', null, { period });
    assert(r.current && r.previous && r.trend.length === 30);
  }
  assert.equal((await call('GET', '/api/reports', null, { period: 'day' })).current.focus_min, 30);
  await fails(() => call('GET', '/api/nope'), /پیدا/);
  ok('settings/dashboard/reports');
  console.log('\nهمه‌ی تست‌ها موفق بود.');
})().catch((e) => { console.error('✗ FAIL', e); process.exit(1); });
