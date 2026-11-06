/* همه‌ی مسیرهای API (به‌جز ورود/خروج). منطق فقط به «repo» وابسته است؛ نه Express و نه PostgreSQL. */
const { SPEC, STEP, validate, HttpError, addDays, daysBetween, weekStart } = require('./spec');

const routes = [];
const add = (method, pattern, h) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '(\\d+)'; }) + '/?$');
  routes.push({ method, re, keys, h });
};
async function dispatch(method, path, ctx) {
  if (!path.startsWith('/api')) path = '/api' + path; // دفاع در برابر مسیر بدون پیشوند
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.re.exec(path); if (!m) continue;
    ctx.params = {}; r.keys.forEach((k, i) => (ctx.params[k] = Number(m[i + 1])));
    return r.h(ctx);
  }
  throw new HttpError('مسیر پیدا نشد.', 404);
}

/* ---------- ابزارها ---------- */
const bad = (m) => { throw new HttpError(m); };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const descNullLast = (a, b) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : -cmp(a, b));
const nullLast = (a, b) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : cmp(a, b));
const iso = (v) => (v instanceof Date ? v.toISOString() : String(v || ''));
const sum = (arr, fn) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
async function getOr404(c, table, id = c.params.id) {
  const r = await c.repo.get(table, id); if (!r) throw new HttpError('مورد پیدا نشد.', 404); return r;
}
const loadAll = async (c, names) => { const out = {}; await Promise.all(names.map(async (n) => { out[n] = await c.repo.all(n); })); return out; };

/* CRUD عمومی با اعتبارسنجی سمت سرور */
function crud(name, table, o = {}) {
  add('GET', `/api/${name}`, (c) => (o.list ? o.list(c) : c.repo.all(table)));
  add('POST', `/api/${name}`, async (c) => {
    const v = validate(table, c.body, { today: c.today });
    if (o.check) await o.check(c, v, null);
    if (o.pre) o.pre(v, null);
    const row = await c.repo.insert(table, v);
    return o.after ? (await o.after(c, row, null)) || row : row;
  });
  add('PUT', `/api/${name}/:id`, async (c) => {
    const old = await getOr404(c, table);
    const v = validate(table, c.body, { today: c.today, partial: true });
    if (o.check) await o.check(c, { ...old, ...v }, old);
    if (o.pre) o.pre(v, old);
    const row = await c.repo.update(table, old.id, v);
    return o.after ? (await o.after(c, row, old)) || row : row;
  });
  add('DELETE', `/api/${name}/:id`, async (c) => { await c.repo.remove(table, c.params.id); return { ok: true }; });
}

/* پیشرفت از روی مراحل */
const stepsOf = (steps, fk, id) => steps.filter((s) => s[fk] === id).sort((a, b) => a.position - b.position || a.id - b.id);
const stepProgress = (steps) => (steps.length ? pct(steps.filter((s) => s.done).length, steps.length) : null);

/* والد + مراحل (مهارت‌ها و اهداف) */
function stepped(name, table, stepTable, fk, o = {}) {
  const view = (p, all) => {
    const steps = stepsOf(all, fk, p.id).map(({ id, title, done }) => ({ id, title, done }));
    const sp = stepProgress(steps);
    const progress = sp != null ? sp : (o.noStepProgress ? o.noStepProgress(p) : 0);
    return { ...p, steps, progress };
  };
  const list = async (c) => {
    const [ps, ss] = await Promise.all([c.repo.all(table), c.repo.all(stepTable)]);
    return ps.map((p) => view(p, ss)).sort((a, b) => b.id - a.id);
  };
  const parseSteps = (b) => {
    if (b.steps == null) return null;
    if (!Array.isArray(b.steps)) bad('مراحل نامعتبر است.');
    return b.steps.slice(0, 100).filter((s) => s && String(s.title || '').trim()).map((s) => validate(STEP, s)).map((s, i) => ({ ...s, position: i }));
  };
  const save = async (c, id, steps) => {
    if (steps) await c.repo.replace(stepTable, fk, id, steps.map((s) => ({ ...s, [fk]: id })));
    if (o.afterSteps) await o.afterSteps(c, id);
  };
  add('GET', `/api/${name}`, list);
  add('POST', `/api/${name}`, async (c) => {
    const v = validate(table, c.body, { today: c.today }); const steps = parseSteps(c.body);
    const row = await c.repo.insert(table, v); await save(c, row.id, steps || []); return { ok: true, id: row.id };
  });
  add('PUT', `/api/${name}/:id`, async (c) => {
    const old = await getOr404(c, table);
    const v = validate(table, c.body, { today: c.today, partial: true }); const steps = parseSteps(c.body);
    await c.repo.update(table, old.id, v); await save(c, old.id, steps); return { ok: true };
  });
  add('PATCH', `/api/${name}/:id/steps/:sid`, async (c) => {
    const st = await getOr404(c, stepTable, c.params.sid);
    if (st[fk] !== c.params.id) throw new HttpError('مرحله پیدا نشد.', 404);
    await c.repo.update(stepTable, st.id, { done: !!(c.body && c.body.done) });
    await save(c, c.params.id, null); return { ok: true };
  });
  add('DELETE', `/api/${name}/:id`, async (c) => { await c.repo.remove(table, c.params.id); return { ok: true }; });
  return { list, view };
}

/* ---------- درس‌ها ---------- */
const logStudy = async (c, row, old) => {
  if (old ? old.status !== row.status : row.status === 'done') await c.repo.insert('study_records', { subject_id: row.id, status: row.status, rec_date: c.today });
};
crud('subjects', 'subjects', {
  list: async (c) => (await c.repo.all('subjects')).sort((a, b) => descNullLast(a.study_date || a.plan_date, b.study_date || b.plan_date) || b.id - a.id),
  after: async (c, row, old) => { await logStudy(c, row, old); },
});
add('PATCH', '/api/subjects/:id/status', async (c) => {
  const old = await getOr404(c, 'subjects');
  const status = c.body && c.body.status === 'done' ? 'done' : 'todo';
  const row = await c.repo.update('subjects', old.id, { status, ...(status === 'done' && !old.study_date ? { study_date: c.today } : {}) });
  await logStudy(c, row, old); return row;
});

/* ---------- مالی ---------- */
function moneySummary(txs, today) {
  const inc = (f) => sum(txs.filter((t) => t.type === 'income' && f(t)), (t) => t.amount);
  const exp = (f) => sum(txs.filter((t) => t.type === 'expense' && f(t)), (t) => t.amount);
  const cm = today.slice(0, 7);
  const monthly = [];
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1)); const key = d.toISOString().slice(0, 7);
    monthly.push({ month: key, income: inc((t) => t.tx_date.startsWith(key)), expense: exp((t) => t.tx_date.startsWith(key)) });
  }
  const income = inc(() => true), expense = exp(() => true);
  return { income, expense, balance: income - expense, month: { income: inc((t) => t.tx_date.startsWith(cm)), expense: exp((t) => t.tx_date.startsWith(cm)) }, monthly };
}
crud('transactions', 'transactions', { list: async (c) => (await c.repo.all('transactions')).sort((a, b) => cmp(b.tx_date, a.tx_date) || b.id - a.id) });
add('GET', '/api/money/summary', async (c) => moneySummary(await c.repo.all('transactions'), c.today));
add('GET', '/api/money/report', async (c) => {
  const txs = await c.repo.all('transactions');
  const years = [...new Set(txs.map((t) => t.tx_date.slice(0, 4)))].sort().reverse();
  const year = /^\d{4}$/.test(c.query.year || '') ? c.query.year : (years[0] || c.today.slice(0, 4));
  const yt = txs.filter((t) => t.tx_date.startsWith(year));
  const months = Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`; const mt = yt.filter((t) => t.tx_date.startsWith(k));
    return { month: k, income: sum(mt.filter((t) => t.type === 'income'), (t) => t.amount), expense: sum(mt.filter((t) => t.type === 'expense'), (t) => t.amount) };
  });
  const byCat = (type) => {
    const mp = {}; yt.filter((t) => t.type === type).forEach((t) => { const k = t.category || 'بدون دسته'; mp[k] = (mp[k] || 0) + t.amount; });
    return Object.entries(mp).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  };
  const income = sum(months, (m) => m.income), expense = sum(months, (m) => m.expense);
  return { year, years: years.includes(year) ? years : [year, ...years], months, income, expense, net: income - expense, expense_by_category: byCat('expense'), income_by_category: byCat('income') };
});

/* ---------- مهارت‌ها ---------- */
const skillsMod = stepped('skills', 'skills', 'skill_steps', 'skill_id', {
  noStepProgress: (p) => (p.status === 'completed' ? 100 : 0),
  afterSteps: async (c, id) => {
    const steps = await c.repo.all('skill_steps'); const mine = steps.filter((s) => s.skill_id === id);
    if (!mine.length) return;
    const done = mine.filter((s) => s.done).length; const cur = await c.repo.get('skills', id);
    const status = done === mine.length ? 'completed' : done > 0 ? 'learning' : (cur.status === 'completed' ? 'not_started' : cur.status);
    if (status !== cur.status) await c.repo.update('skills', id, { status });
  },
});

/* ---------- اهداف ---------- */
stepped('goals', 'goals', 'goal_steps', 'goal_id');

/* ---------- وظایف و پروژه‌ها ---------- */
const PRI = { high: 0, medium: 1, low: 2 };
crud('tasks', 'tasks', {
  list: async (c) => (await c.repo.all('tasks')).sort((a, b) => (a.done - b.done) || nullLast(a.due_date, b.due_date) || (PRI[a.priority] - PRI[b.priority]) || b.id - a.id),
  check: async (c, v) => { if (v.project_id != null && !(await c.repo.get('projects', v.project_id))) bad('پروژه‌ی انتخاب‌شده وجود ندارد.'); },
});
add('PATCH', '/api/tasks/:id/done', async (c) => {
  const t = await getOr404(c, 'tasks'); const done = !!(c.body && c.body.done);
  return c.repo.update('tasks', t.id, { done, done_date: done ? c.today : null, done_at: done ? new Date().toISOString() : null });
});
crud('projects', 'projects', {
  list: async (c) => {
    const [ps, ts] = await Promise.all([c.repo.all('projects'), c.repo.all('tasks')]);
    return ps.map((p) => {
      const mine = ts.filter((t) => t.project_id === p.id);
      return { ...p, total: mine.length, done: mine.filter((t) => t.done).length, progress: pct(mine.filter((t) => t.done).length, mine.length),
        tasks: mine.sort((a, b) => a.done - b.done || a.id - b.id).map((t) => ({ id: t.id, title: t.title, done: t.done, due_date: t.due_date })) };
    }).sort((a, b) => b.id - a.id);
  },
  check: async (c, v) => { if (v.start_date && v.end_date && v.end_date < v.start_date) bad('تاریخ پایان نباید قبل از تاریخ شروع باشد.'); },
});

/* ---------- عادت‌ها ---------- */
function habitStats(h, logs, today) {
  const dates = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
  const created = iso(h.created_at).slice(0, 10) || today;
  let streak = 0, doneNow, adherence;
  if (h.frequency === 'daily') {
    doneNow = dates.has(today);
    for (let d = doneNow ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) streak++;
    const span = Math.max(1, Math.min(30, daysBetween(created, today) + 1));
    let n = 0; for (let i = 0; i < span; i++) if (dates.has(addDays(today, -i))) n++;
    adherence = pct(n, span);
  } else {
    const weeks = new Set([...dates].map(weekStart)); const wk = weekStart(today);
    doneNow = weeks.has(wk);
    for (let w = doneNow ? wk : addDays(wk, -7); weeks.has(w); w = addDays(w, -7)) streak++;
    const span = Math.max(1, Math.min(4, Math.floor(daysBetween(weekStart(created), wk) / 7) + 1));
    let n = 0; for (let i = 0; i < span; i++) if (weeks.has(addDays(wk, -7 * i))) n++;
    adherence = pct(n, span);
  }
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { date: d, done: dates.has(d) }; });
  return { ...h, done_now: doneNow, streak, adherence, total: dates.size, last7 };
}
crud('habits', 'habits', {
  list: async (c) => { const [hs, ls] = await Promise.all([c.repo.all('habits'), c.repo.all('habit_logs')]); return hs.map((h) => habitStats(h, ls, c.today)).sort((a, b) => b.active - a.active || a.id - b.id); },
});
add('POST', '/api/habits/:id/toggle', async (c) => {
  const h = await getOr404(c, 'habits');
  const date = (c.body && c.body.date) || c.today;
  validate({ d: SPEC.transactions.tx_date }, { d: date });
  if (date > addDays(c.today, 0)) bad('ثبت برای روز آینده ممکن نیست.');
  const logs = (await c.repo.all('habit_logs')).filter((l) => l.habit_id === h.id && l.log_date === date);
  if (logs.length) { await c.repo.remove('habit_logs', logs[0].id); return { done: false }; }
  await c.repo.insert('habit_logs', { habit_id: h.id, log_date: date }); return { done: true };
});

/* ---------- یادداشت‌ها ---------- */
crud('notes', 'notes', {
  list: async (c) => (await c.repo.all('notes')).sort((a, b) => (b.pinned - a.pinned) || cmp(iso(b.updated_at), iso(a.updated_at))),
  pre: (v) => { v.updated_at = new Date().toISOString(); },
});

/* ---------- دوره‌ها ---------- */
const courseFix = (v) => { if (v.total_sessions > 0 && v.done_sessions > v.total_sessions) v.done_sessions = v.total_sessions; v.status = v.total_sessions > 0 && v.done_sessions >= v.total_sessions ? 'completed' : 'learning'; };
crud('courses', 'courses', {
  list: async (c) => (await c.repo.all('courses')).map((x) => ({ ...x, progress: pct(x.done_sessions, x.total_sessions) })).sort((a, b) => b.id - a.id),
  check: async (c, v) => courseFix(v), // v در PUT ترکیبی از قبلی و جدید است
  pre: (v, old) => { if (old) { const m = { ...old, ...v }; courseFix(m); v.done_sessions = m.done_sessions; v.status = m.status; } else courseFix(v); },
});
add('PATCH', '/api/courses/:id/progress', async (c) => {
  const x = await getOr404(c, 'courses'); let n = Math.trunc(Number(c.body && c.body.done_sessions));
  if (!Number.isFinite(n) || n < 0) bad('تعداد جلسه نامعتبر است.');
  if (x.total_sessions > 0) n = Math.min(n, x.total_sessions);
  return c.repo.update('courses', x.id, { done_sessions: n, status: x.total_sessions > 0 && n >= x.total_sessions ? 'completed' : 'learning' });
});

/* ---------- امتحانات ---------- */
crud('exams', 'exams', {
  list: async (c) => (await c.repo.all('exams')).map((e) => ({ ...e, score20: e.score == null ? null : round((e.score / e.max_score) * 20, 2) })).sort((a, b) => cmp(b.exam_date, a.exam_date)),
  check: async (c, v) => { if (v.score != null && v.score > v.max_score) bad('نمره نمی‌تواند بیشتر از نمره‌ی کل باشد.'); },
});

/* ---------- تایمر تمرکز ---------- */
const FOCUS_KEY = 'focus_active';
const parseJSON = (s, d = null) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
add('GET', '/api/focus', async (c) => {
  const [sessions, st] = await Promise.all([c.repo.all('focus_sessions'), c.repo.settings()]);
  const day = (d) => sum(sessions.filter((s) => s.session_date === d), (s) => s.duration_seconds);
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(c.today, i - 6); return { date: d, minutes: round(day(d) / 60) }; });
  return { active: parseJSON(st[FOCUS_KEY]), today_min: round(day(c.today) / 60), week_min: round(sum(week, (w) => w.minutes)), total_min: round(sum(sessions, (s) => s.duration_seconds) / 60), week,
    sessions: sessions.sort((a, b) => b.id - a.id).slice(0, 100) };
});
add('PUT', '/api/focus/active', async (c) => {
  const a = c.body && c.body.active;
  if (a == null) { await c.repo.setSetting(FOCUS_KEY, ''); return { ok: true }; }
  const o = { label: String(a.label || '').slice(0, 100), accumMs: Math.max(0, Math.min(Number(a.accumMs) || 0, 864e5)), running: !!a.running, startedAt: a.running ? Number(a.startedAt) || Date.now() : null };
  await c.repo.setSetting(FOCUS_KEY, JSON.stringify(o)); return { ok: true };
});
add('POST', '/api/focus/sessions', async (c) => {
  const secs = Math.trunc(Number(c.body && c.body.duration_seconds));
  if (!Number.isFinite(secs) || secs < 1 || secs > 86400) bad('مدت جلسه نامعتبر است.');
  const row = await c.repo.insert('focus_sessions', { label: String((c.body && c.body.label) || '').trim().slice(0, 100), duration_seconds: secs, session_date: c.today });
  await c.repo.setSetting(FOCUS_KEY, ''); return row;
});
add('DELETE', '/api/focus/sessions/:id', async (c) => { await c.repo.remove('focus_sessions', c.params.id); return { ok: true }; });

/* ---------- پس‌انداز ---------- */
crud('savings', 'savings_goals', {
  list: async (c) => {
    const [gs, ds] = await Promise.all([c.repo.all('savings_goals'), c.repo.all('savings_deposits')]);
    return gs.map((g) => {
      const deposits = ds.filter((d) => d.goal_id === g.id).sort((a, b) => cmp(b.dep_date, a.dep_date) || b.id - a.id);
      const current = g.initial_amount + sum(deposits, (d) => d.amount);
      return { ...g, deposits, current, remaining: Math.max(0, g.target_amount - current), progress: Math.min(100, pct(current, g.target_amount)) };
    }).sort((a, b) => b.id - a.id);
  },
});
add('POST', '/api/savings/:id/deposits', async (c) => {
  const g = await getOr404(c, 'savings_goals');
  return c.repo.insert('savings_deposits', { ...validate('savings_deposits', c.body, { today: c.today }), goal_id: g.id });
});
add('DELETE', '/api/savings/deposits/:id', async (c) => { await c.repo.remove('savings_deposits', c.params.id); return { ok: true }; });

/* ---------- تنظیمات ---------- */
const settingsView = (s) => ({ theme: s.theme === 'light' ? 'light' : 'dark', currency: s.currency || 'تومان', display_name: s.display_name || '', dash_layout: parseJSON(s.dash_layout) });
add('GET', '/api/settings', async (c) => settingsView(await c.repo.settings()));
add('PUT', '/api/settings', async (c) => {
  const b = c.body || {};
  if ('theme' in b) { if (!['light', 'dark'].includes(b.theme)) bad('تم نامعتبر است.'); await c.repo.setSetting('theme', b.theme); }
  if ('currency' in b) { const v = String(b.currency).trim().slice(0, 20); if (!v) bad('واحد پول نمی‌تواند خالی باشد.'); await c.repo.setSetting('currency', v); }
  if ('display_name' in b) await c.repo.setSetting('display_name', String(b.display_name).trim().slice(0, 60));
  if ('dash_layout' in b) {
    if (!Array.isArray(b.dash_layout) || b.dash_layout.length > 30) bad('چیدمان داشبورد نامعتبر است.');
    await c.repo.setSetting('dash_layout', JSON.stringify(b.dash_layout.map((x) => ({ id: String(x.id).slice(0, 30), visible: !!x.visible }))));
  }
  return settingsView(await c.repo.settings());
});

/* ---------- داشبورد و گزارش‌ها ---------- */
const lastDays = (today, n) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
const NAMES = ['subjects', 'transactions', 'tasks', 'skills', 'skill_steps', 'goals', 'goal_steps', 'habits', 'habit_logs', 'savings_goals', 'savings_deposits', 'focus_sessions', 'study_records', 'projects'];
const progressList = (T) => ({
  skills: T.skills.map((k) => { const st = stepsOf(T.skill_steps, 'skill_id', k.id); const sp = stepProgress(st); return { id: k.id, title: k.title, status: k.status, progress: sp != null ? sp : k.status === 'completed' ? 100 : 0 }; }),
  goals: T.goals.map((g) => ({ id: g.id, title: g.title, term: g.term, target_date: g.target_date, progress: stepProgress(stepsOf(T.goal_steps, 'goal_id', g.id)) || 0 })),
  projects: T.projects.map((p) => { const mine = T.tasks.filter((t) => t.project_id === p.id); return { id: p.id, title: p.title, status: p.status, progress: pct(mine.filter((t) => t.done).length, mine.length) }; }),
});

add('GET', '/api/dashboard', async (c) => {
  const T = await loadAll(c, NAMES); const today = c.today;
  const pl = progressList(T);
  const open = T.tasks.filter((t) => !t.done);
  const dueToday = T.tasks.filter((t) => t.due_date === today);
  const rank = (t) => (t.due_date && t.due_date < today ? 0 : t.due_date === today ? 1 : 2);
  const focusDay = (d) => sum(T.focus_sessions.filter((s) => s.session_date === d), (s) => s.duration_seconds);
  const activeHabits = T.habits.filter((h) => h.active).map((h) => habitStats(h, T.habit_logs, today));
  const daily = activeHabits.filter((h) => h.frequency === 'daily');
  const act = [
    ...T.study_records.map((r) => { const s = T.subjects.find((x) => x.id === r.subject_id); return s && { kind: 'study', title: s.title, info: r.status, happened: iso(r.recorded_at || r.created_at) }; }).filter(Boolean),
    ...T.transactions.map((t) => ({ kind: 'tx', title: t.title, info: `${t.type}:${t.amount}`, happened: iso(t.created_at) })),
    ...T.skills.map((k) => ({ kind: 'skill', title: k.title, info: k.status, happened: iso(k.created_at) })),
    ...T.tasks.filter((t) => t.done && t.done_at).map((t) => ({ kind: 'task', title: t.title, info: 'done', happened: iso(t.done_at) })),
    ...T.goals.map((g) => ({ kind: 'goal', title: g.title, info: g.term, happened: iso(g.created_at) })),
  ].sort((a, b) => cmp(b.happened, a.happened)).slice(0, 8);
  const sCur = (g) => g.initial_amount + sum(T.savings_deposits.filter((d) => d.goal_id === g.id), (d) => d.amount);
  return {
    subjects: { done: T.subjects.filter((s) => s.status === 'done').length, todo: T.subjects.filter((s) => s.status === 'todo').length },
    money: moneySummary(T.transactions, today),
    tasks: { today_total: dueToday.length, today_done: dueToday.filter((t) => t.done).length, overdue: open.filter((t) => t.due_date && t.due_date < today).length, open: open.length,
      list: open.sort((a, b) => rank(a) - rank(b) || PRI[a.priority] - PRI[b.priority] || nullLast(a.due_date, b.due_date)).slice(0, 6).map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority })),
      week: lastDays(today, 7).map((d) => ({ date: d, count: T.tasks.filter((t) => t.done_date === d).length })) },
    skills: pl.skills.filter((k) => k.status === 'learning'),
    goals: pl.goals.filter((g) => g.progress < 100).sort((a, b) => nullLast(a.target_date, b.target_date)).slice(0, 4),
    projects: pl.projects.filter((p) => p.status === 'active').slice(0, 4),
    habits: { total: daily.length, done_today: daily.filter((h) => h.done_now).length, list: activeHabits.slice(0, 6).map((h) => ({ id: h.id, title: h.title, done_now: h.done_now, streak: h.streak, frequency: h.frequency })) },
    savings: { current: sum(T.savings_goals, sCur), target: sum(T.savings_goals, (g) => g.target_amount), count: T.savings_goals.length },
    focus: { today_min: round(focusDay(today) / 60), week: lastDays(today, 7).map((d) => ({ date: d, minutes: round(focusDay(d) / 60) })) },
    activity: act,
  };
});

add('GET', '/api/reports', async (c) => {
  const T = await loadAll(c, NAMES); const today = c.today;
  const period = ['day', 'week', 'month'].includes(c.query.period) ? c.query.period : 'week';
  const start = period === 'day' ? today : period === 'week' ? weekStart(today) : today.slice(0, 8) + '01';
  const len = daysBetween(start, today) + 1;
  const metric = (from, to) => {
    const inR = (d) => d && d >= from && d <= to;
    const tx = T.transactions.filter((t) => inR(t.tx_date));
    return {
      focus_min: round(sum(T.focus_sessions.filter((s) => inR(s.session_date)), (s) => s.duration_seconds) / 60),
      tasks_done: T.tasks.filter((t) => inR(t.done_date)).length,
      subjects_done: T.study_records.filter((r) => r.status === 'done' && inR(r.rec_date)).length,
      habit_checkins: T.habit_logs.filter((l) => inR(l.log_date)).length,
      income: sum(tx.filter((t) => t.type === 'income'), (t) => t.amount),
      expense: sum(tx.filter((t) => t.type === 'expense'), (t) => t.amount),
    };
  };
  const prevEnd = addDays(start, -1);
  const trend = lastDays(today, 30).map((d) => ({ date: d,
    focus_min: round(sum(T.focus_sessions.filter((s) => s.session_date === d), (s) => s.duration_seconds) / 60),
    tasks_done: T.tasks.filter((t) => t.done_date === d).length,
    expense: sum(T.transactions.filter((t) => t.type === 'expense' && t.tx_date === d), (t) => t.amount) }));
  const habits = T.habits.filter((h) => h.active).map((h) => habitStats(h, T.habit_logs, today)).map((h) => ({ id: h.id, title: h.title, adherence: h.adherence, streak: h.streak }));
  const pl = progressList(T);
  return { period, from: start, to: today, current: metric(start, today), previous: metric(addDays(prevEnd, -(len - 1)), prevEnd), trend, habits, skills: pl.skills, goals: pl.goals, projects: pl.projects };
});

module.exports = { dispatch, routes, habitStats };
