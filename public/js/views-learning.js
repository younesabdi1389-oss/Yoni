/* یادگیری: درس‌ها، دوره‌ها، امتحانات، مهارت‌ها، تایمر تمرکز */
const SUBJECT_STATUS = { todo: 'باید بخوانم', done: 'خوانده‌ام' };
const SKILL_STATUS = { not_started: 'شروع‌نشده', learning: 'در حال یادگیری', completed: 'تکمیل‌شده' };
const stepsBody = (it, base) => `${it.steps.length ? `<ul class="steps">${it.steps.map((s) => `<li><label><input type="checkbox" data-step="${s.id}" ${s.done ? 'checked' : ''}><span>${esc(s.title)}</span></label></li>`).join('')}</ul>` : ''}`;
const stepToggle = (base) => async (e, it, { reload }) => { const sid = e.target.dataset.step; if (!sid) return; await api(`${base}/${it.id}/steps/${sid}`, 'PATCH', { done: e.target.checked }); reload(); };

/* ----- درس‌ها ----- */
RENDER.subjects = crudView({
  key: 'subjects', url: '/api/subjects', title: 'درس‌های من', sub: 'برنامه و پیشرفت مطالعه', addLabel: 'افزودن درس', addTitle: 'افزودن درس', editTitle: 'ویرایش درس', icon: 'book',
  empty: 'هنوز درسی ثبت نکرده‌اید. اولین درس را اضافه کنید.', confirm: (s) => `درس «${s.title}» حذف شود؟`,
  search: (s) => [s.title, s.source, s.chapter, s.topic, s.category, s.notes].join(' '),
  filters: (list) => {
    const cats = [...new Set(list.map((s) => s.category).filter(Boolean))];
    return [{ key: 'all', label: 'همه', count: list.length, fn: () => true },
      { key: 'todo', label: 'باید بخوانم', count: list.filter((s) => s.status === 'todo').length, fn: (s) => s.status === 'todo' },
      { key: 'done', label: 'خوانده‌ام', count: list.filter((s) => s.status === 'done').length, fn: (s) => s.status === 'done' },
      ...cats.map((c) => ({ key: 'c:' + c, label: esc(c), fn: (s) => s.category === c }))];
  },
  top: (list) => { const done = list.filter((s) => s.status === 'done').length, p = list.length ? Math.round(done / list.length * 100) : 0;
    return `<div class="panel"><div class="row" style="justify-content:space-between"><b>پیشرفت کلی مطالعه</b><span class="muted">${nf.format(done)} از ${nf.format(list.length)} درس • ${nf.format(p)}٪</span></div>${bar(p)}</div>`; },
  fields: [{ name: 'title', label: 'عنوان درس', required: true }, { name: 'category', label: 'دسته‌بندی (مثلاً تخصصی، عمومی)' }, { name: 'source', label: 'نام کتاب یا منبع' },
    { name: 'chapter', label: 'فصل' }, { name: 'topic', label: 'مبحث' }, { name: 'plan_date', label: 'تاریخ برنامه مطالعه', type: 'date' }, { name: 'study_date', label: 'تاریخ مطالعه', type: 'date' },
    { name: 'status', label: 'وضعیت مطالعه', type: 'select', options: Object.entries(SUBJECT_STATUS) }, { name: 'notes', label: 'توضیحات و یادداشت', type: 'textarea' }],
  card: (s) => `<h3>${esc(s.title)}</h3><div class="meta">${badge(SUBJECT_STATUS[s.status], s.status === 'done' ? 'completed' : '')}${s.category ? badge(esc(s.category)) : ''}${s.source ? `<span>📚 ${esc(s.source)}</span>` : ''}${s.chapter ? `<span>فصل: ${esc(s.chapter)}</span>` : ''}${s.topic ? `<span>مبحث: ${esc(s.topic)}</span>` : ''}${s.plan_date && s.status === 'todo' ? `<span>🗓 برنامه: ${fdate(s.plan_date)}</span>` : ''}${s.study_date ? `<span>📅 مطالعه: ${fdate(s.study_date)}</span>` : ''}</div>`,
  body: (s) => s.notes ? `<div class="note">${esc(s.notes)}</div>` : '',
  tools: (s) => `<button class="icon-btn" data-act="toggle" title="${s.status === 'todo' ? 'خواندم' : 'بازگشت به فهرست'}">${ic(s.status === 'todo' ? 'check' : 'undo')}</button>`,
  actions: { toggle: async (s, { reload }) => { await api(`/api/subjects/${s.id}/status`, 'PATCH', { status: s.status === 'todo' ? 'done' : 'todo' }); reload(); } },
});

/* ----- دوره‌ها ----- */
RENDER.courses = crudView({
  key: 'courses', url: '/api/courses', title: 'دوره‌های آموزشی', addLabel: 'افزودن دوره', addTitle: 'افزودن دوره', editTitle: 'ویرایش دوره', icon: 'cap',
  empty: 'دوره‌ای ثبت نشده است.', confirm: (c) => `دوره «${c.title}» حذف شود؟`, search: (c) => [c.title, c.instructor, c.notes].join(' '),
  filters: (l) => [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, { key: 'learning', label: 'در حال یادگیری', count: l.filter((c) => c.status === 'learning').length, fn: (c) => c.status === 'learning' }, { key: 'completed', label: 'تکمیل‌شده', count: l.filter((c) => c.status === 'completed').length, fn: (c) => c.status === 'completed' }],
  fields: [{ name: 'title', label: 'عنوان دوره', required: true }, { name: 'instructor', label: 'نام مدرس یا منبع' }, { name: 'link', label: 'لینک دوره', type: 'url' },
    { name: 'total_sessions', label: 'تعداد جلسات', type: 'number', min: 0, default: 0 }, { name: 'done_sessions', label: 'جلسات انجام‌شده', type: 'number', min: 0, default: 0 }, { name: 'notes', label: 'یادداشت', type: 'textarea' }],
  card: (c) => `<h3>${esc(c.title)}</h3><div class="meta">${badge(c.status === 'completed' ? 'تکمیل‌شده' : 'در حال یادگیری', c.status === 'completed' ? 'completed' : 'learning')}${c.instructor ? `<span>👤 ${esc(c.instructor)}</span>` : ''}${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer" class="lnk">${ic('link')} لینک</a>` : ''}</div>`,
  body: (c) => `<div class="row" style="align-items:center;gap:10px"><div style="flex:1">${bar(c.progress)}</div><span class="muted">${nf.format(c.done_sessions)} / ${nf.format(c.total_sessions)} جلسه</span>
    <button class="icon-btn" data-act="dec" aria-label="یک جلسه کمتر">${ic('minus')}</button><button class="icon-btn" data-act="inc" aria-label="یک جلسه بیشتر">${ic('plus')}</button></div>${c.notes ? `<div class="note">${esc(c.notes)}</div>` : ''}`,
  actions: {
    inc: async (c, { reload }) => { await api(`/api/courses/${c.id}/progress`, 'PATCH', { done_sessions: c.done_sessions + 1 }); reload(); },
    dec: async (c, { reload }) => { await api(`/api/courses/${c.id}/progress`, 'PATCH', { done_sessions: Math.max(0, c.done_sessions - 1) }); reload(); },
  },
});

/* ----- امتحانات ----- */
RENDER.exams = crudView({
  key: 'exams', url: '/api/exams', title: 'امتحانات و نمرات', addLabel: 'ثبت امتحان', addTitle: 'ثبت امتحان', editTitle: 'ویرایش امتحان', icon: 'clipboard',
  empty: 'امتحانی ثبت نشده است.', confirm: (e) => `امتحان «${e.title}» حذف شود؟`, search: (e) => [e.title, e.subject, e.notes].join(' '),
  filters: (l) => { const t = todayISO(); return [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, { key: 'up', label: 'آینده', count: l.filter((e) => e.exam_date >= t).length, fn: (e) => e.exam_date >= t }, { key: 'past', label: 'گذشته', count: l.filter((e) => e.exam_date < t).length, fn: (e) => e.exam_date < t }]; },
  top: (l) => { const sc = l.filter((e) => e.score20 != null); const avg = sc.length ? sc.reduce((a, e) => a + e.score20, 0) / sc.length : null; const t = todayISO();
    return `<div class="grid g3">${statCard('میانگین نمرات (از ۲۰)', avg == null ? '—' : nf.format(Math.round(avg * 100) / 100), '', 'balance')}${statCard('امتحانات آینده', nf.format(l.filter((e) => e.exam_date >= t).length))}${statCard('نمره‌های ثبت‌شده', nf.format(sc.length))}</div>`; },
  fields: [{ name: 'title', label: 'نام امتحان', required: true }, { name: 'subject', label: 'درس' }, { name: 'exam_date', label: 'تاریخ امتحان', type: 'date', required: true, default: todayISO() },
    { name: 'score', label: 'نمره (پس از امتحان)', type: 'number', step: 'any', min: 0 }, { name: 'max_score', label: 'نمره کل', type: 'number', step: 'any', min: 1, default: 20 }, { name: 'notes', label: 'یادداشت', type: 'textarea' }],
  card: (e) => `<h3>${esc(e.title)}</h3><div class="meta"><span>📅 ${fdate(e.exam_date)}</span>${e.subject ? `<span>📚 ${esc(e.subject)}</span>` : ''}${e.exam_date >= todayISO() ? badge('در پیش‌رو', 'learning') : ''}</div>`,
  body: (e) => `${e.score != null ? `<div class="stat"><small>نمره</small><b class="${e.score20 >= 10 ? 'good' : 'badc'}">${nf.format(e.score)} از ${nf.format(e.max_score)}</b></div>` : '<div class="muted">نمره هنوز ثبت نشده است.</div>'}${e.notes ? `<div class="note">${esc(e.notes)}</div>` : ''}`,
});

/* ----- مهارت‌ها ----- */
RENDER.skills = crudView({
  key: 'skills', url: '/api/skills', title: 'مهارت‌هایی که باید یاد بگیرم', addLabel: 'افزودن مهارت', addTitle: 'افزودن مهارت', editTitle: 'ویرایش مهارت', icon: 'target',
  empty: 'مهارتی ثبت نشده است.', confirm: (k) => `مهارت «${k.title}» حذف شود؟`, search: (k) => [k.title, k.description, k.resources, k.notes].join(' '),
  filters: (l) => [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, ...Object.entries(SKILL_STATUS).map(([k, lb]) => ({ key: k, label: lb, count: l.filter((x) => x.status === k).length, fn: (x) => x.status === k }))],
  fields: [{ name: 'title', label: 'عنوان مهارت', required: true }, { name: 'description', label: 'توضیحات', type: 'textarea' }, { name: 'resources', label: 'منابع آموزشی' }, { name: 'link', label: 'لینک آموزش', type: 'url' },
    { name: 'status', label: 'وضعیت یادگیری', type: 'select', options: Object.entries(SKILL_STATUS) }, { name: 'steps', label: 'مراحل یادگیری', type: 'steps' }, { name: 'notes', label: 'یادداشت', type: 'textarea' }],
  card: (k) => `<h3>${esc(k.title)}</h3>${badge(SKILL_STATUS[k.status], k.status === 'learning' ? 'learning' : k.status === 'completed' ? 'completed' : '')}${k.description ? `<div class="note">${esc(k.description)}</div>` : ''}`,
  body: (k) => `<div class="row" style="align-items:center;gap:10px"><div style="flex:1">${bar(k.progress)}</div><span class="muted">${nf.format(k.progress)}٪</span></div>${stepsBody(k)}<div class="meta">${k.resources ? `<span>📚 ${esc(k.resources)}</span>` : ''}${k.link ? `<a href="${esc(k.link)}" target="_blank" rel="noopener noreferrer" class="lnk">${ic('link')} لینک آموزش</a>` : ''}</div>${k.notes ? `<div class="note">📝 ${esc(k.notes)}</div>` : ''}`,
  onChange: stepToggle('/api/skills'),
});

/* ----- تایمر تمرکز ----- */
RENDER.focus = async function () {
  const D = await api('/api/focus');
  let a = D.active; // {label, accumMs, running, startedAt}
  const el = () => (a ? a.accumMs + (a.running ? Date.now() - a.startedAt : 0) : 0);
  const clock = (ms) => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  $('#view').innerHTML = `
    <div class="head"><div><h1>تایمر تمرکز</h1><div class="muted">مطالعه‌ی بدون حواس‌پرتی؛ جلسه‌ها در دیتابیس ذخیره می‌شوند.</div></div></div>
    <div class="grid g2" style="align-items:start">
      <div class="panel timer"><div id="clock" class="clock" dir="ltr">00:00:00</div>
        <label>موضوع جلسه<input id="flabel" maxlength="100" placeholder="مثلاً: مرور فصل ۳ فیزیک"></label>
        <div class="row" id="fbtns" style="flex-wrap:wrap"></div></div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr)">${statCard('امروز', mins(D.today_min))}${statCard('۷ روز اخیر', mins(D.week_min))}${statCard('مجموع', mins(D.total_min))}
        <div class="panel" style="grid-column:1/-1"><div class="section-title">تمرکز هفتگی (دقیقه)</div><div class="chartbox"><canvas id="cFocus"></canvas></div></div></div></div>
    <div class="panel" style="margin-top:14px"><div class="section-title">تاریخچه جلسات</div>
      ${D.sessions.length ? D.sessions.map((s) => `<div class="tx" data-sid="${s.id}"><span class="dot">${ic('timer')}</span><div class="t"><b>${esc(s.label || 'جلسه تمرکز')}</b><span class="muted" style="font-size:13px">${fdate(s.session_date)}</span></div><span class="amt">${mins(s.duration_seconds / 60)}</span><button class="icon-btn danger" data-del aria-label="حذف">${ic('trash')}</button></div>`).join('') : empty('هنوز جلسه‌ای ثبت نشده است. اولین جلسه را شروع کنید.', 'timer')}</div>`;
  mkChart($('#cFocus'), { type: 'bar', legend: false, data: { labels: D.week.map((w) => dayLabel(w.date)), datasets: [{ label: 'دقیقه', data: D.week.map((w) => w.minutes), backgroundColor: '#38bdf8', borderRadius: 6 }] } });
  const lab = $('#flabel'); if (a) lab.value = a.label || '';
  const setActive = async (n) => { a = n; await api('/api/focus/active', 'PUT', { active: n }); draw(); };
  const draw = () => {
    $('#clock').textContent = clock(el());
    const b = $('#fbtns'); lab.disabled = !!a;
    b.innerHTML = !a ? `<button class="btn primary" data-a="start">${ic('play')} شروع</button>`
      : `${a.running ? `<button class="btn" data-a="pause">${ic('pause')} توقف</button>` : `<button class="btn primary" data-a="resume">${ic('play')} ادامه</button>`}<button class="btn primary" data-a="finish">${ic('check')} پایان و ثبت</button><button class="btn ghost" data-a="cancel">لغو</button>`;
  };
  draw(); timers.push(setInterval(() => { if (a) $('#clock').textContent = clock(el()); }, 500));
  $('#view').onclick = (e) => {
    const x = e.target.closest('[data-a]');
    if (x) return run(async () => {
      const k = x.dataset.a;
      if (k === 'start') await setActive({ label: lab.value.trim(), accumMs: 0, running: true, startedAt: Date.now() });
      if (k === 'pause') await setActive({ ...a, accumMs: el(), running: false, startedAt: null });
      if (k === 'resume') await setActive({ ...a, running: true, startedAt: Date.now() });
      if (k === 'cancel') { if (await confirmBox('جلسه‌ی در حال اجرا لغو و ثبت نشود؟', 'لغو جلسه')) await setActive(null); }
      if (k === 'finish') { const secs = Math.round(el() / 1000); if (secs < 1) return toast('مدت جلسه خیلی کوتاه است.'); await api('/api/focus/sessions', 'POST', { label: a.label, duration_seconds: secs }); toast('جلسه ثبت شد.', true); go('focus'); }
    });
    const d = e.target.closest('[data-del]');
    if (d) run(async () => { if (await confirmBox('این جلسه حذف شود؟')) { await api(`/api/focus/sessions/${d.closest('[data-sid]').dataset.sid}`, 'DELETE'); go('focus'); } });
  };
};
