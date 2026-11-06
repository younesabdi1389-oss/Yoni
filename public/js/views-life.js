/* برنامه‌ریزی: وظایف، پروژه‌ها، اهداف، عادت‌ها، یادداشت‌ها */
const PROJECT_STATUS = { active: 'فعال', paused: 'متوقف‌شده', completed: 'تکمیل‌شده' };

/* ----- وظایف ----- */
const taskFields = (X) => [{ name: 'title', label: 'عنوان وظیفه', required: true }, { name: 'priority', label: 'اولویت', type: 'select', options: [['medium', 'متوسط'], ['high', 'بالا'], ['low', 'پایین']] },
  { name: 'due_date', label: 'مهلت انجام', type: 'date' }, { name: 'due_time', label: 'ساعت انجام', type: 'time' }, { name: 'category', label: 'دسته‌بندی' },
  { name: 'project_id', label: 'پروژه', type: 'select', options: [['', 'بدون پروژه'], ...(X.projects || []).map((p) => [p.id, p.title])] }, { name: 'notes', label: 'توضیحات', type: 'textarea' }];
RENDER.tasks = crudView({
  key: 'tasks', url: '/api/tasks', title: 'وظایف روزانه', addLabel: 'افزودن وظیفه', addTitle: 'افزودن وظیفه', editTitle: 'ویرایش وظیفه', icon: 'task', layout: 'list',
  empty: 'وظیفه‌ای ثبت نشده است. کارهای امروزتان را اضافه کنید.', confirm: (t) => `وظیفه «${t.title}» حذف شود؟`, search: (t) => [t.title, t.category, t.notes].join(' '),
  load: async () => ({ projects: await api('/api/projects') }),
  fields: taskFields, defaults: { due_date: todayISO(), priority: 'medium' },
  toForm: (t) => ({ ...t, project_id: t.project_id ?? '' }),
  filters: (l) => { const t = todayISO(); const open = l.filter((x) => !x.done);
    return [{ key: 'all', label: 'همه', count: l.length, fn: () => true },
      { key: 'today', label: 'امروز', count: open.filter((x) => x.due_date === t).length, fn: (x) => !x.done && x.due_date === t },
      { key: 'over', label: 'عقب‌افتاده', count: open.filter((x) => x.due_date && x.due_date < t).length, fn: (x) => !x.done && x.due_date && x.due_date < t },
      { key: 'future', label: 'آینده', count: open.filter((x) => x.due_date > t).length, fn: (x) => !x.done && x.due_date > t },
      { key: 'open', label: 'انجام‌نشده', count: open.length, fn: (x) => !x.done }, { key: 'done', label: 'انجام‌شده', count: l.length - open.length, fn: (x) => x.done }]; },
  card: (t, X) => { const p = (X.projects || []).find((x) => x.id === t.project_id); const over = !t.done && t.due_date && t.due_date < todayISO();
    return `<label class="taskrow"><input type="checkbox" data-done ${t.done ? 'checked' : ''}><div><h3 class="${t.done ? 'strike' : ''}">${esc(t.title)}</h3><div class="meta">${badge(PRIORITY[t.priority], 'p-' + t.priority)}${t.due_date ? `<span class="${over ? 'badc' : ''}">📅 ${fdate(t.due_date)}${t.due_time ? ' • ' + esc(t.due_time) : ''}${over ? ' (عقب‌افتاده)' : ''}</span>` : ''}${t.category ? badge(esc(t.category)) : ''}${p ? `<span>📁 ${esc(p.title)}</span>` : ''}</div>${t.notes ? `<div class="note">${esc(t.notes)}</div>` : ''}</div></label>`; },
  onChange: async (e, t, { reload }) => { if (!e.target.matches('[data-done]')) return; await api(`/api/tasks/${t.id}/done`, 'PATCH', { done: e.target.checked }); reload(); },
});

/* ----- پروژه‌ها ----- */
RENDER.projects = crudView({
  key: 'projects', url: '/api/projects', title: 'پروژه‌ها', addLabel: 'ساخت پروژه', addTitle: 'ساخت پروژه', editTitle: 'ویرایش پروژه', icon: 'folder',
  empty: 'پروژه‌ای نساخته‌اید.', confirm: (p) => `پروژه «${p.title}» حذف شود؟ وظایف آن حذف نمی‌شوند و فقط از پروژه جدا می‌شوند.`, search: (p) => [p.title, p.description].join(' '),
  filters: (l) => [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, ...Object.entries(PROJECT_STATUS).map(([k, lb]) => ({ key: k, label: lb, count: l.filter((p) => p.status === k).length, fn: (p) => p.status === k }))],
  fields: [{ name: 'title', label: 'عنوان پروژه', required: true }, { name: 'description', label: 'توضیحات', type: 'textarea' }, { name: 'start_date', label: 'تاریخ شروع', type: 'date' }, { name: 'end_date', label: 'تاریخ پایان', type: 'date' },
    { name: 'status', label: 'وضعیت', type: 'select', options: Object.entries(PROJECT_STATUS) }],
  card: (p) => `<h3>${esc(p.title)}</h3><div class="meta">${badge(PROJECT_STATUS[p.status], p.status === 'completed' ? 'completed' : p.status === 'active' ? 'learning' : '')}${p.start_date ? `<span>شروع: ${fdate(p.start_date)}</span>` : ''}${p.end_date ? `<span>پایان: ${fdate(p.end_date)}</span>` : ''}</div>${p.description ? `<div class="note">${esc(p.description)}</div>` : ''}`,
  tools: () => `<button class="icon-btn" data-act="addtask" title="افزودن وظیفه به پروژه" aria-label="افزودن وظیفه">${ic('plus')}</button>`,
  body: (p) => `<div class="row" style="align-items:center;gap:10px"><div style="flex:1">${bar(p.progress)}</div><span class="muted">${nf.format(p.done)} از ${nf.format(p.total)} وظیفه • ${nf.format(p.progress)}٪</span></div>
    ${p.tasks.length ? `<ul class="steps">${p.tasks.map((t) => `<li><label><input type="checkbox" data-ptask="${t.id}" ${t.done ? 'checked' : ''}><span>${esc(t.title)}${t.due_date ? ` <small class="muted">(${fshort(t.due_date)})</small>` : ''}</span></label></li>`).join('')}</ul>` : '<div class="muted">هنوز وظیفه‌ای برای این پروژه تعریف نشده است.</div>'}`,
  actions: { addtask: async (p, { reload }) => openForm({ title: `وظیفه‌ی جدید برای «${p.title}»`, fields: taskFields({ projects: [p] }).filter((f) => f.name !== 'project_id'), values: { priority: 'medium' },
    onSubmit: async (d) => { await api('/api/tasks', 'POST', { ...d, project_id: p.id }); toast('وظیفه افزوده شد.', true); reload(); } }) },
  onChange: async (e, p, { reload }) => { const id = e.target.dataset.ptask; if (!id) return; await api(`/api/tasks/${id}/done`, 'PATCH', { done: e.target.checked }); reload(); },
});

/* ----- اهداف ----- */
RENDER.goals = crudView({
  key: 'goals', url: '/api/goals', title: 'اهداف شخصی', addLabel: 'افزودن هدف', addTitle: 'افزودن هدف', editTitle: 'ویرایش هدف', icon: 'flag',
  empty: 'هدفی تعریف نشده است. یک هدف کوتاه‌مدت یا بلندمدت بسازید.', confirm: (g) => `هدف «${g.title}» حذف شود؟`, search: (g) => [g.title, g.notes].join(' '),
  filters: (l) => [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, { key: 'short', label: 'کوتاه‌مدت', count: l.filter((g) => g.term === 'short').length, fn: (g) => g.term === 'short' },
    { key: 'long', label: 'بلندمدت', count: l.filter((g) => g.term === 'long').length, fn: (g) => g.term === 'long' }, { key: 'active', label: 'در جریان', count: l.filter((g) => g.progress < 100).length, fn: (g) => g.progress < 100 }, { key: 'done', label: 'رسیده‌ام', count: l.filter((g) => g.progress >= 100).length, fn: (g) => g.progress >= 100 }],
  fields: [{ name: 'title', label: 'عنوان هدف', required: true }, { name: 'term', label: 'نوع هدف', type: 'select', options: [['short', 'کوتاه‌مدت'], ['long', 'بلندمدت']] }, { name: 'target_date', label: 'تاریخ هدف', type: 'date' },
    { name: 'steps', label: 'مراحل رسیدن به هدف', type: 'steps' }, { name: 'notes', label: 'یادداشت', type: 'textarea' }],
  card: (g) => `<h3>${esc(g.title)}</h3><div class="meta">${badge(g.term === 'long' ? 'بلندمدت' : 'کوتاه‌مدت')}${g.target_date ? `<span>🎯 ${fdate(g.target_date)}</span>` : ''}${g.progress >= 100 ? badge('رسیده‌ام ✓', 'completed') : ''}</div>`,
  body: (g) => `<div class="row" style="align-items:center;gap:10px"><div style="flex:1">${bar(g.progress)}</div><span class="muted">${nf.format(g.progress)}٪</span></div>${stepsBody(g)}${g.notes ? `<div class="note">📝 ${esc(g.notes)}</div>` : ''}`,
  onChange: stepToggle('/api/goals'),
});

/* ----- عادت‌ها ----- */
RENDER.habits = crudView({
  key: 'habits', url: '/api/habits', title: 'عادت‌ها', addLabel: 'افزودن عادت', addTitle: 'افزودن عادت', editTitle: 'ویرایش عادت', icon: 'repeat',
  empty: 'عادتی تعریف نشده است. عادت‌های روزانه یا هفتگی‌تان را بسازید.', confirm: (h) => `عادت «${h.title}» و سابقه‌اش حذف شود؟`, search: (h) => [h.title, h.notes].join(' '),
  filters: (l) => [{ key: 'all', label: 'همه', count: l.length, fn: () => true }, { key: 'daily', label: 'روزانه', fn: (h) => h.frequency === 'daily' }, { key: 'weekly', label: 'هفتگی', fn: (h) => h.frequency === 'weekly' }, { key: 'off', label: 'غیرفعال', fn: (h) => !h.active }],
  top: (l) => { const act = l.filter((h) => h.active); const avg = act.length ? Math.round(act.reduce((a, h) => a + h.adherence, 0) / act.length) : 0; const best = Math.max(0, ...act.map((h) => h.streak));
    return `<div class="grid g3">${statCard('انجام‌شده‌ی امروز/این هفته', `${nf.format(act.filter((h) => h.done_now).length)} از ${nf.format(act.length)}`, '', 'balance')}${statCard('میانگین پایبندی', nf.format(avg) + '٪', bar(avg))}${statCard('بهترین زنجیره', nf.format(best) + ' 🔥')}</div>`; },
  fields: [{ name: 'title', label: 'عنوان عادت', required: true }, { name: 'frequency', label: 'تکرار', type: 'select', options: [['daily', 'روزانه'], ['weekly', 'هفتگی']] }, { name: 'notes', label: 'توضیحات', type: 'textarea' }, { name: 'active', label: 'فعال باشد', type: 'checkbox', default: true }],
  card: (h) => `<h3>${esc(h.title)}</h3><div class="meta">${badge(h.frequency === 'daily' ? 'روزانه' : 'هفتگی')}${!h.active ? badge('غیرفعال') : ''}<span>🔥 زنجیره: ${nf.format(h.streak)} ${h.frequency === 'daily' ? 'روز' : 'هفته'}</span><span>پایبندی: ${nf.format(h.adherence)}٪</span><span>کل: ${nf.format(h.total)}</span></div>`,
  tools: (h) => `<button class="icon-btn ${h.done_now ? 'on' : ''}" data-act="today" title="${h.done_now ? 'برداشتن تیک امروز' : 'انجام شد'}" aria-label="ثبت امروز">${ic('check')}</button>`,
  body: (h) => `<div class="dots" title="۷ روز اخیر">${h.last7.map((d) => `<button class="dotbtn ${d.done ? 'on' : ''}" data-act="day" data-date="${d.date}" title="${fdate(d.date)}">${nf.format(new Date(d.date + 'T00:00:00').getDate())}</button>`).join('')}</div>${h.notes ? `<div class="note">${esc(h.notes)}</div>` : ''}`,
  actions: { today: async (h, { reload }) => { await api(`/api/habits/${h.id}/toggle`, 'POST', {}); reload(); } },
});
// کلیک روی نقطه‌ی روز (data-act="day" نیاز به تاریخ دارد)
document.addEventListener('click', (e) => {
  const b = e.target.closest('.dotbtn'); if (!b) return; e.stopPropagation();
  const id = b.closest('[data-id]').dataset.id; run(async () => { await api(`/api/habits/${id}/toggle`, 'POST', { date: b.dataset.date }); go('habits'); });
}, true);

/* ----- یادداشت‌ها (ذخیره‌ی خودکار) ----- */
RENDER.notes = async function () {
  let notes = await api('/api/notes'); let sel = notes[0]?.id || null; let q = '', cat = ''; let timer, saving = 0;
  const cats = () => [...new Set(notes.map((n) => n.category).filter(Boolean))];
  $('#view').innerHTML = `<div class="head"><div><h1>یادداشت‌ها</h1><div class="muted">تغییرات به‌صورت خودکار ذخیره می‌شوند.</div></div><div class="actions"><button class="btn primary" id="newNote">${ic('plus')} یادداشت جدید</button></div></div>
    <div class="notes"><div class="panel nlist"><label class="searchbox">${ic('search')}<input id="nq" type="search" placeholder="جست‌وجو در یادداشت‌ها…"></label><div class="chips" id="ncats"></div><div id="nitems"></div></div><div class="panel neditor" id="ned"></div></div>`;
  const drawList = () => {
    $('#ncats').innerHTML = cats().length ? [['', 'همه'], ...cats().map((c) => [c, esc(c)])].map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-cat="${esc(k)}">${l}</button>`).join('') : '';
    const t = q.trim().toLowerCase();
    const items = notes.filter((n) => (!cat || n.category === cat) && (!t || [n.title, n.content, n.category].join(' ').toLowerCase().includes(t)));
    $('#nitems').innerHTML = items.length ? items.map((n) => `<button class="nitem ${n.id === sel ? 'on' : ''}" data-nid="${n.id}"><b>${n.pinned ? '📌 ' : ''}${esc(n.title || 'بدون عنوان')}</b><small>${esc((n.content || '').slice(0, 60)) || '—'}</small></button>`).join('') : empty(notes.length ? 'نتیجه‌ای پیدا نشد.' : 'یادداشتی ندارید.', 'note');
  };
  const drawEditor = () => {
    const n = notes.find((x) => x.id === sel);
    $('#ned').innerHTML = n ? `<div class="row" style="align-items:center"><input id="nt" class="ntitle" placeholder="عنوان یادداشت" maxlength="200" value="${esc(n.title)}"><button class="icon-btn ${n.pinned ? 'on' : ''}" id="npin" title="سنجاق" aria-label="سنجاق">${ic('pin')}</button><button class="icon-btn danger" id="ndel" aria-label="حذف">${ic('trash')}</button></div>
      <input id="nc" placeholder="دسته‌بندی" maxlength="100" value="${esc(n.category)}" style="margin:8px 0"><textarea id="nb" class="nbody" maxlength="20000" placeholder="بنویسید…">${esc(n.content)}</textarea><div class="muted" id="nstat" style="font-size:13px">ذخیره شد</div>` : empty('یک یادداشت انتخاب یا ایجاد کنید.', 'note');
  };
  const flush = async () => {
    const n = notes.find((x) => x.id === sel); if (!n || !$('#nt')) return;
    const body = { title: $('#nt').value, category: $('#nc').value, content: $('#nb').value }; Object.assign(n, body);
    const my = ++saving; $('#nstat').textContent = 'در حال ذخیره…';
    try { await api(`/api/notes/${n.id}`, 'PUT', body); if (my === saving && $('#nstat')) $('#nstat').textContent = 'ذخیره شد ✓'; } catch (e) { if ($('#nstat')) $('#nstat').textContent = 'ذخیره نشد: ' + e.message; }
    drawList();
  };
  drawList(); drawEditor();
  leaveHook = () => { if (!$('#nt') || !sel) return; clearTimeout(timer); const n = notes.find((x) => x.id === sel); if (!n) return; const b = { title: $('#nt').value, category: $('#nc').value, content: $('#nb').value }; if (b.title !== n.title || b.category !== n.category || b.content !== n.content) api(`/api/notes/${n.id}`, 'PUT', b).catch(() => {}); };
  const v = $('#view');
  v.oninput = (e) => { if (e.target.id === 'nq') { q = e.target.value; drawList(); } else if (['nt', 'nc', 'nb'].includes(e.target.id)) { $('#nstat').textContent = 'در حال تایپ…'; clearTimeout(timer); timer = setTimeout(flush, 700); } };
  v.onclick = (e) => run(async () => {
    if (e.target.closest('#newNote')) { const n = await api('/api/notes', 'POST', { title: '', content: '' }); notes.unshift(n); sel = n.id; drawList(); drawEditor(); $('#nt').focus(); return; }
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; return drawList(); }
    const it = e.target.closest('[data-nid]'); if (it) { await flush(); sel = Number(it.dataset.nid); drawList(); return drawEditor(); }
    if (e.target.closest('#npin')) { const n = notes.find((x) => x.id === sel); n.pinned = !n.pinned; await api(`/api/notes/${n.id}`, 'PUT', { pinned: n.pinned }); notes = await api('/api/notes'); drawList(); drawEditor(); }
    if (e.target.closest('#ndel')) { const n = notes.find((x) => x.id === sel); if (await confirmBox(`یادداشت «${n.title || 'بدون عنوان'}» حذف شود؟`)) { await api(`/api/notes/${n.id}`, 'DELETE'); notes = notes.filter((x) => x.id !== n.id); sel = notes[0]?.id || null; drawList(); drawEditor(); toast('حذف شد.', true); } }
  });
};
