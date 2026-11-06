/* داشبورد قابل‌شخصی‌سازی + گزارش‌ها + تنظیمات */
const actText = (a) => {
  if (a.kind === 'study') return a.info === 'done' ? `درس «${esc(a.title)}» خوانده شد` : `درس «${esc(a.title)}» به فهرست برگشت`;
  if (a.kind === 'tx') { const [t, amt] = a.info.split(':'); return `${t === 'income' ? 'درآمد' : 'هزینه'} «${esc(a.title)}» — ${money(amt)}`; }
  if (a.kind === 'task') return `وظیفه «${esc(a.title)}» انجام شد`;
  if (a.kind === 'goal') return `هدف «${esc(a.title)}» تعریف شد`;
  return `مهارت «${esc(a.title)}» ثبت شد`;
};
const ACT_ICON = { study: 'book', tx: 'wallet', skill: 'target', task: 'task', goal: 'flag' };
const progList = (items, empt) => items.length ? items.map((k) => `<div class="pl"><div class="row" style="justify-content:space-between"><b>${esc(k.title)}</b><span class="muted">${nf.format(k.progress)}٪</span></div>${bar(k.progress)}</div>`).join('') : `<div class="empty small">${empt}</div>`;

const DCARDS = {
  stats: { title: 'خلاصه وضعیت', full: true, html: (d) => `<div class="grid g6">${statCard('موجودی', money(d.money.balance), '', 'balance')}${statCard('درس‌های خوانده‌شده', nf.format(d.subjects.done))}${statCard('درس‌های باقی‌مانده', nf.format(d.subjects.todo))}
    ${statCard('وظایف امروز', `${nf.format(d.tasks.today_done)} / ${nf.format(d.tasks.today_total)}`, d.tasks.overdue ? `<small class="badc">${nf.format(d.tasks.overdue)} عقب‌افتاده</small>` : '')}${statCard('عادت‌های امروز', `${nf.format(d.habits.done_today)} / ${nf.format(d.habits.total)}`)}${statCard('تمرکز امروز', mins(d.focus.today_min))}</div>` },
  tasks: { title: 'وظایف پیش‌رو', html: (d) => d.tasks.list.length ? d.tasks.list.map((t) => `<label class="taskrow mini" data-tid="${t.id}"><input type="checkbox" data-dtask><span>${esc(t.title)} <small class="muted">${t.due_date ? fshort(t.due_date) : ''}</small></span>${badge(PRIORITY[t.priority], 'p-' + t.priority)}</label>`).join('') : empty('وظیفه‌ی بازی ندارید 🎉', 'task') },
  money: { title: 'درآمد و هزینه (۶ ماه اخیر)', html: () => '<div class="chartbox"><canvas id="dMoney"></canvas></div>', init: (d) => monthlyChart($('#dMoney'), d.money.monthly) },
  income: { title: 'این ماه', html: (d) => `<div class="grid g2">${statCard('درآمد', `<span class="good">${money(d.money.month.income)}</span>`)}${statCard('هزینه', `<span class="badc">${money(d.money.month.expense)}</span>`)}</div>` },
  study: { title: 'وضعیت مطالعه', html: (d) => d.subjects.done + d.subjects.todo ? '<div class="chartbox"><canvas id="dStudy"></canvas></div>' : empty('درسی ثبت نشده است.', 'book'),
    init: (d) => { if ($('#dStudy')) mkChart($('#dStudy'), { type: 'doughnut', data: { labels: ['خوانده‌ام', 'باید بخوانم'], datasets: [{ data: [d.subjects.done, d.subjects.todo], backgroundColor: ['#38bdf8', '#2563eb'], borderWidth: 0 }] }, options: { cutout: '65%' } }); } },
  focus: { title: 'تمرکز هفتگی (دقیقه)', html: () => '<div class="chartbox"><canvas id="dFocus"></canvas></div>', init: (d) => mkChart($('#dFocus'), { type: 'bar', legend: false, data: { labels: d.focus.week.map((w) => dayLabel(w.date)), datasets: [{ label: 'دقیقه', data: d.focus.week.map((w) => w.minutes), backgroundColor: '#38bdf8', borderRadius: 6 }] } }) },
  taskweek: { title: 'وظایف انجام‌شده در ۷ روز اخیر', html: () => '<div class="chartbox"><canvas id="dTaskW"></canvas></div>', init: (d) => mkChart($('#dTaskW'), { type: 'line', legend: false, data: { labels: d.tasks.week.map((w) => dayLabel(w.date)), datasets: [{ label: 'وظیفه', data: d.tasks.week.map((w) => w.count), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.18)', fill: true, tension: .35 }] } }) },
  goals: { title: 'اهداف فعال', html: (d) => progList(d.goals, 'هدف فعالی ندارید.') },
  projects: { title: 'پروژه‌های فعال', html: (d) => progList(d.projects, 'پروژه‌ی فعالی ندارید.') },
  skills: { title: 'مهارت‌های در حال یادگیری', html: (d) => progList(d.skills, 'مهارتی در حال یادگیری نیست.') },
  habits: { title: 'عادت‌ها', html: (d) => d.habits.list.length ? d.habits.list.map((h) => `<div class="act"><span class="dot ${h.done_now ? 'good' : ''}">${ic(h.done_now ? 'check' : 'repeat')}</span><div style="flex:1">${esc(h.title)}</div><span class="muted">🔥 ${nf.format(h.streak)}</span></div>`).join('') : empty('عادتی تعریف نشده است.', 'repeat') },
  savings: { title: 'پس‌انداز', html: (d) => d.savings.count ? `<b>${money(d.savings.current)}</b> <span class="muted">از ${money(d.savings.target)}</span>${bar(d.savings.target ? Math.min(100, d.savings.current / d.savings.target * 100) : 0)}` : empty('هدف پس‌اندازی ندارید.', 'pig') },
  activity: { title: 'فعالیت‌های اخیر', html: (d) => d.activity.length ? d.activity.map((a) => `<div class="act"><span class="dot">${ic(ACT_ICON[a.kind] || 'check')}</span><div><div>${actText(a)}</div><div class="muted" style="font-size:12.5px">${fdate(a.happened)}</div></div></div>`).join('') : empty('هنوز فعالیتی ثبت نشده است.', 'check') },
};
const DEFAULT_LAYOUT = ['stats', 'tasks', 'money', 'income', 'study', 'focus', 'taskweek', 'goals', 'projects', 'skills', 'habits', 'savings', 'activity'];
const hiddenByDefault = ['income', 'taskweek', 'savings'];
const getLayout = () => {
  const saved = Array.isArray(S.layout) ? S.layout.filter((x) => DCARDS[x.id]) : [];
  const ids = new Set(saved.map((x) => x.id));
  return [...saved, ...DEFAULT_LAYOUT.filter((id) => !ids.has(id)).map((id) => ({ id, visible: !hiddenByDefault.includes(id) }))];
};

RENDER.dashboard = async function () {
  const d = await api('/api/dashboard');
  const h = new Date().getHours();
  const greet = h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'ظهر بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
  const today = new Date().toLocaleDateString('fa-IR-u-ca-gregory', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const layout = getLayout().filter((x) => x.visible);
  $('#view').innerHTML = `<div class="head"><div><div class="hello">${greet}${S.name ? '، ' + esc(S.name) : ''} 👋</div><div class="muted">${today}</div></div><div class="actions"><button class="btn" id="custom">${ic('sliders')} شخصی‌سازی</button></div></div>
    <div class="dgrid">${layout.map((x) => `<section class="panel dcard ${DCARDS[x.id].full ? 'full' : ''}" data-card="${x.id}">${DCARDS[x.id].full ? '' : `<div class="section-title">${DCARDS[x.id].title}</div>`}${DCARDS[x.id].html(d)}</section>`).join('') || empty('همه‌ی کارت‌ها پنهان هستند. از «شخصی‌سازی» آن‌ها را فعال کنید.', 'sliders')}</div>`;
  layout.forEach((x) => DCARDS[x.id].init?.(d));
  $('#view').onclick = (e) => {
    if (e.target.closest('#custom')) return openCustomize();
  };
  $('#view').onchange = (e) => { if (!e.target.matches('[data-dtask]')) return; const id = e.target.closest('[data-tid]').dataset.tid; run(async () => { await api(`/api/tasks/${id}/done`, 'PATCH', { done: true }); toast('وظیفه انجام شد ✓', true); go('dashboard'); }); };
};

function openCustomize() {
  let lay = getLayout().map((x) => ({ ...x }));
  const m = $('#modal');
  const draw = () => {
    m.innerHTML = `<div class="modal-box"><h3>شخصی‌سازی داشبورد</h3><p class="muted">کارت‌ها را فعال/غیرفعال کنید و ترتیبشان را تغییر دهید.</p>
      ${lay.map((x, i) => `<div class="custrow"><label class="check"><input type="checkbox" data-i="${i}" ${x.visible ? 'checked' : ''}> ${DCARDS[x.id].title}</label><span><button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="بالا">${ic('up')}</button><button class="icon-btn" data-down="${i}" ${i === lay.length - 1 ? 'disabled' : ''} aria-label="پایین">${ic('down')}</button></span></div>`).join('')}
      <div class="err" id="ferr"></div><div class="row"><button class="btn primary" id="csave">ذخیره</button><button class="btn ghost" id="creset">بازنشانی</button><button class="btn ghost" data-close>انصراف</button></div></div>`;
  };
  draw(); m.classList.remove('hidden');
  m.onclick = (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) { m.onclick = null; return closeModal(); }
    const up = t.closest('[data-up]'), dn = t.closest('[data-down]');
    if (up) { const i = +up.dataset.up; [lay[i - 1], lay[i]] = [lay[i], lay[i - 1]]; draw(); }
    if (dn) { const i = +dn.dataset.down; [lay[i + 1], lay[i]] = [lay[i], lay[i + 1]]; draw(); }
    if (t.closest('#creset')) { lay = DEFAULT_LAYOUT.map((id) => ({ id, visible: !hiddenByDefault.includes(id) })); draw(); }
    if (t.closest('#csave')) run(async () => { const r = await api('/api/settings', 'PUT', { dash_layout: lay }); S.layout = r.dash_layout; m.onclick = null; closeModal(); toast('چیدمان ذخیره شد.', true); go('dashboard'); });
  };
  m.onchange = (e) => { if (e.target.dataset.i != null) lay[+e.target.dataset.i].visible = e.target.checked; };
}

/* ----- گزارش‌ها ----- */
const RP = { period: 'week' };
RENDER.reports = async function () {
  const r = await api(`/api/reports?period=${RP.period}`);
  const cmpCard = (label, cur, prev, fmt = nf.format.bind(nf), goodUp = true) => {
    const diff = cur - prev; const cls = diff === 0 ? 'muted' : (diff > 0) === goodUp ? 'good' : 'badc';
    return statCard(label, fmt(cur), `<small class="${cls}">${diff === 0 ? 'بدون تغییر' : (diff > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(diff))} نسبت به دوره‌ی قبل</small>`);
  };
  const names = { day: 'امروز', week: 'این هفته', month: 'این ماه' };
  const c = r.current, p = r.previous;
  $('#view').innerHTML = `<div class="head"><div><h1>گزارش عملکرد</h1><div class="muted">${fdate(r.from)} تا ${fdate(r.to)}</div></div>
      <div class="chips">${Object.entries(names).map(([k, l]) => `<button class="chip ${RP.period === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div></div>
    <div class="grid g3">${cmpCard('زمان مطالعه و تمرکز', c.focus_min, p.focus_min, (v) => mins(v))}${cmpCard('وظایف تکمیل‌شده', c.tasks_done, p.tasks_done)}${cmpCard('درس‌های خوانده‌شده', c.subjects_done, p.subjects_done)}
      ${cmpCard('ثبت عادت‌ها', c.habit_checkins, p.habit_checkins)}${cmpCard('درآمد', c.income, p.income, money)}${cmpCard('هزینه', c.expense, p.expense, money, false)}</div>
    <div class="grid g2" style="margin-top:14px"><div class="panel"><div class="section-title">روند ۳۰ روز اخیر — تمرکز (دقیقه) و وظایف</div><div class="chartbox"><canvas id="rTrend"></canvas></div></div>
      <div class="panel"><div class="section-title">مقایسه با دوره‌ی قبل</div><div class="chartbox"><canvas id="rCmp"></canvas></div></div></div>
    <div class="grid g2" style="margin-top:14px;align-items:start">
      <div class="panel"><div class="section-title">پیشرفت پروژه‌ها</div>${progList(r.projects, 'پروژه‌ای نیست.')}</div>
      <div class="panel"><div class="section-title">پیشرفت اهداف</div>${progList(r.goals, 'هدفی نیست.')}</div>
      <div class="panel"><div class="section-title">پیشرفت مهارت‌ها</div>${progList(r.skills, 'مهارتی نیست.')}</div>
      <div class="panel"><div class="section-title">پایبندی به عادت‌ها (۳۰ روز / ۴ هفته)</div>${progList(r.habits.map((h) => ({ title: `${h.title} — 🔥${nf.format(h.streak)}`, progress: h.adherence })), 'عادتی نیست.')}</div></div>`;
  mkChart($('#rTrend'), { type: 'line', data: { labels: r.trend.map((t) => fshort(t.date)), datasets: [
    { label: 'تمرکز (دقیقه)', data: r.trend.map((t) => t.focus_min), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.15)', fill: true, tension: .3 },
    { label: 'وظایف انجام‌شده', data: r.trend.map((t) => t.tasks_done), borderColor: '#34d399', tension: .3 }] }, options: { plugins: {} } });
  mkChart($('#rCmp'), { type: 'bar', data: { labels: ['تمرکز (دقیقه)', 'وظایف', 'درس‌ها', 'عادت‌ها'], datasets: [
    { label: 'دوره‌ی قبل', data: [p.focus_min, p.tasks_done, p.subjects_done, p.habit_checkins], backgroundColor: '#64748b', borderRadius: 6 },
    { label: 'دوره‌ی فعلی', data: [c.focus_min, c.tasks_done, c.subjects_done, c.habit_checkins], backgroundColor: '#2563eb', borderRadius: 6 }] } });
  $('#view').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { RP.period = b.dataset.p; go('reports'); } };
};

/* ----- تنظیمات ----- */
RENDER.settings = async function () {
  const dark = S.theme === 'dark';
  $('#view').innerHTML = `<div class="head"><h1>تنظیمات</h1></div>
    <div class="grid g2" style="align-items:start">
      <div class="panel"><div class="section-title">نمایش</div><p class="muted">تم برنامه را بین روشن و تاریک تغییر دهید.</p><button class="btn" id="theme">${ic(dark ? 'sun' : 'moon')} ${dark ? 'تم روشن' : 'تم تاریک'}</button></div>
      <div class="panel"><div class="section-title">عمومی</div><form id="gen"><label>نام نمایشی (در خوشامدگویی)<input name="display_name" maxlength="60" value="${esc(S.name)}"></label>
        <label>واحد پول<input name="currency" maxlength="20" value="${esc(S.currency)}" list="curs"></label><datalist id="curs"><option value="تومان"><option value="ریال"><option value="دلار"><option value="یورو"></datalist><div class="err" id="gerr"></div><button class="btn primary" type="submit">ذخیره</button></form></div>
      <div class="panel"><div class="section-title">تغییر رمز عبور</div><form id="pw"><label>رمز فعلی<input type="password" name="current" autocomplete="current-password" required></label><label>رمز جدید (حداقل ۸ نویسه)<input type="password" name="next" autocomplete="new-password" minlength="8" required></label><div class="err" id="perr"></div><button class="btn primary" type="submit">تغییر رمز</button></form></div>
      <div class="panel"><div class="section-title">اتصال دیتابیس</div><p id="db" class="muted">در حال بررسی…</p><button class="btn" id="recheck">بررسی دوباره</button></div>
      <div class="panel"><div class="section-title">حساب</div><p class="muted">با خروج، برای ورود دوباره به نام کاربری و رمز نیاز دارید.</p><button class="btn" id="logout">${ic('logout')} خروج از برنامه</button></div>
    </div>`;
  const check = async () => { const el = $('#db'); el.className = 'muted'; el.textContent = 'در حال بررسی…';
    try { const h = await api('/api/health'); el.innerHTML = `<b class="good">● متصل</b> — زمان پاسخ ${nf.format(h.ms)} میلی‌ثانیه`; } catch (e) { el.innerHTML = `<b class="badc">● قطع</b> — ${esc(e.message)}`; } };
  check(); $('#recheck').onclick = check;
  $('#theme').onclick = () => run(async () => { const t = dark ? 'light' : 'dark'; applyTheme(t); await api('/api/settings', 'PUT', { theme: t }); go('settings'); });
  $('#gen').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target);
    run(async () => { try { const r = await api('/api/settings', 'PUT', { display_name: f.get('display_name'), currency: f.get('currency') }); S.name = r.display_name; S.currency = r.currency; toast('تنظیمات ذخیره شد.', true); $('#gerr').textContent = ''; } catch (er) { $('#gerr').textContent = er.message; } }); };
  $('#pw').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target);
    run(async () => { try { await api('/api/account/password', 'PUT', { current: f.get('current'), next: f.get('next') }); e.target.reset(); $('#perr').textContent = ''; toast('رمز عبور تغییر کرد.', true); } catch (er) { $('#perr').textContent = er.message; } }); };
  $('#logout').onclick = () => run(async () => { if (await confirmBox('از برنامه خارج می‌شوید؟', 'خروج')) { await api('/api/logout', 'POST'); showLogin(); } });
};
