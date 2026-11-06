/* MY TRACK v2 — هسته: ابزارها، API، فرم/مودال، ناوبری، نمای CRUD عمومی */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('fa-IR');
const S = { currency: 'تومان', name: '', theme: 'dark', layout: null };
const money = (n) => nf.format(Math.round(Number(n) || 0)) + ' ' + S.currency;
const fdate = (d) => d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('fa-IR-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
const fshort = (d) => d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('fa-IR-u-ca-gregory', { month: 'short', day: 'numeric' }) : '';
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d); };
const mins = (m) => { m = Math.round(m); return m >= 60 ? `${nf.format(Math.floor(m / 60))} ساعت${m % 60 ? ' و ' + nf.format(m % 60) + ' دقیقه' : ''}` : `${nf.format(m)} دقیقه`; };

const ICONS = {
  logo: '<path d="M4 20v-5M10 20v-9M16 20v-13"/><path d="M3 9l6-5 4 3 7-5"/><path d="M16 2h4v4"/>',
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l2-3h12v3"/><circle cx="17" cy="13.5" r="1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  check: '<path d="M5 12l5 5 9-10"/>', undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  logout: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  pig: '<path d="M4 12a7 6 0 0 1 12-4h3v4l2 1v3h-3l-1 3h-3v-2H9v2H6l-1-4a6 5 0 0 1-1-3z"/><circle cx="15" cy="10" r=".6"/>',
  chart: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', chevron: '<path d="M9 6l6 6-6 6"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>', stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  pin: '<path d="M9 3h6l-1 6 3 3H7l3-3zM12 12v9"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h0"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
$$('[data-ic]').forEach((el) => { el.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[el.dataset.ic]}</svg>`; });

/* ---------- پیام و API ---------- */
let toastTimer;
function toast(msg, ok) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (ok ? ' ok' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 3200);
}
async function api(url, method = 'GET', body) {
  let r;
  try {
    r = await fetch(url, { method, headers: { 'X-Client-Date': todayISO(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  } catch { throw new Error('ارتباط با سرور برقرار نشد. اینترنت را بررسی کنید.'); }
  let d = null; try { d = await r.json(); } catch {}
  if (r.status === 401 && !url.includes('/login')) { showLogin(); throw new Error('نشست شما پایان یافته است. دوباره وارد شوید.'); }
  if (!r.ok) throw new Error(d?.error || 'خطایی رخ داد.');
  return d;
}
const run = async (fn) => { try { await fn(); } catch (e) { toast(e.message); } };

function applyTheme(t) { S.theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem('mt_theme', t); } catch {} }
try { applyTheme(localStorage.getItem('mt_theme') || 'dark'); } catch { applyTheme('dark'); }

/* ---------- مودال، فرم، تأیید ---------- */
const stepRow = (s = {}) => `<div class="step-row"><input type="checkbox" ${s.done ? 'checked' : ''} aria-label="انجام شد"><input type="text" value="${esc(s.title)}" placeholder="عنوان مرحله" maxlength="300"><button type="button" class="icon-btn danger" data-rmstep aria-label="حذف مرحله">${ic('trash')}</button></div>`;

function fieldHtml(f, v) {
  const val = v ?? f.default ?? '';
  const attrs = `${f.required ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.list ? `list="${f.list}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}`;
  let input;
  if (f.type === 'select') input = `<select name="${f.name}">${f.options.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') input = `<textarea name="${f.name}" maxlength="20000">${esc(val)}</textarea>`;
  else if (f.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.name}" ${v ?? f.default ? 'checked' : ''}> ${f.label}</label>`;
  else if (f.type === 'steps') return `<label>${f.label}</label><div data-steps>${(v || []).map(stepRow).join('')}</div><button type="button" class="btn small ghost" data-addstep>${ic('plus')} افزودن مرحله</button><div style="height:12px"></div>`;
  else input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${attrs} ${['url', 'number'].includes(f.type) ? 'dir="ltr" style="text-align:right"' : ''}>`;
  return `<label>${f.label}${f.required ? ' *' : ''}${input}</label>`;
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; }

function openForm({ title, fields, values = {}, onSubmit, submitText = 'ذخیره' }) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><h3>${title}</h3><form id="f" novalidate>${fields.map((f) => fieldHtml(f, values[f.name])).join('')}<datalist id="cats">${['حقوق', 'پروژه', 'هدیه', 'خوراک', 'حمل‌ونقل', 'آموزش', 'قبض', 'سرگرمی', 'سلامت', 'سایر'].map((c) => `<option value="${c}">`).join('')}</datalist><div class="err" id="ferr"></div><div class="row"><button class="btn primary" type="submit">${submitText}</button><button type="button" class="btn ghost" data-close>انصراف</button></div></form></div>`;
  m.classList.remove('hidden');
  const form = $('#f');
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
    if (e.target.closest('[data-addstep]')) { const c = $('[data-steps]', form); c.insertAdjacentHTML('beforeend', stepRow()); c.lastElementChild.querySelector('input[type=text]').focus(); }
    const rm = e.target.closest('[data-rmstep]'); if (rm) rm.parentElement.remove();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((f) => {
      if (f.type === 'steps') data[f.name] = $$('.step-row', form).map((r) => ({ done: r.children[0].checked, title: r.children[1].value.trim() })).filter((x) => x.title);
      else if (f.type === 'checkbox') data[f.name] = form.elements[f.name].checked;
      else data[f.name] = form.elements[f.name].value;
    });
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try { await onSubmit(data); closeModal(); } catch (er) { $('#ferr').textContent = er.message; btn.disabled = false; }
  });
  const first = form.querySelector('input:not([type=checkbox]),textarea,select'); if (first) first.focus();
}
$('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function confirmBox(text, okText = 'حذف') {
  return new Promise((res) => {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box small" role="alertdialog"><h3>تأیید</h3><p>${esc(text)}</p><div class="row"><button class="btn danger-btn" id="cOk">${okText}</button><button class="btn ghost" id="cNo">انصراف</button></div></div>`;
    m.classList.remove('hidden');
    $('#cOk').onclick = () => { closeModal(); res(true); }; $('#cNo').onclick = () => { closeModal(); res(false); };
    $('#cNo').focus();
  });
}

/* ---------- اجزای مشترک UI ---------- */
const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
const empty = (msg, icon = 'folder', cta = '') => `<div class="empty"><div class="eico">${ic(icon)}</div><div>${msg}</div>${cta}</div>`;
const statCard = (label, value, extra = '', cls = '') => `<div class="panel stat ${cls}"><small>${label}</small><b>${value}</b>${extra}</div>`;
const badge = (t, cls = '') => `<span class="badge ${cls}">${t}</span>`;
const PRIORITY = { high: 'بالا', medium: 'متوسط', low: 'پایین' };

const VS = {}; // وضعیت جست‌وجو/فیلتر هر صفحه (بین بازخوانی‌ها حفظ می‌شود)

/* نمای CRUD عمومی: فهرست + جست‌وجو + فیلتر + افزودن/ویرایش/حذف با تأیید */
function crudView(cfg) {
  return async function () {
    const [list, X] = await Promise.all([api(cfg.url), cfg.load ? cfg.load() : {}]);
    const st = (VS[cfg.key] = VS[cfg.key] || { q: '', f: 'all' });
    const filters = typeof cfg.filters === 'function' ? cfg.filters(list, X) : cfg.filters;
    if (filters && !filters.some((x) => x.key === st.f)) st.f = filters[0].key;
    const fields = () => (typeof cfg.fields === 'function' ? cfg.fields(X, list) : cfg.fields);
    const reload = () => go(current);
    const save = (id, extra) => async (data) => {
      const body = cfg.beforeSave ? cfg.beforeSave(data) : data;
      await api(id ? `${cfg.url}/${id}` : cfg.url, id ? 'PUT' : 'POST', { ...body, ...(extra || {}) });
      toast('ذخیره شد.', true); reload();
    };
    const openAdd = (values = {}) => openForm({ title: cfg.addTitle, fields: fields(), values: { ...(cfg.defaults || {}), ...values }, onSubmit: save(null) });

    $('#view').innerHTML = `
      <div class="head"><div><h1>${cfg.title}</h1>${cfg.sub ? `<div class="muted">${cfg.sub}</div>` : ''}</div>
        <div class="actions"><button class="btn primary" data-add>${ic('plus')} ${cfg.addLabel}</button></div></div>
      ${cfg.top ? `<div class="top">${cfg.top(list, X)}</div>` : ''}
      <div class="toolbar">
        ${cfg.search ? `<label class="searchbox">${ic('search')}<input id="q" type="search" placeholder="جست‌وجو…" value="${esc(st.q)}"></label>` : ''}
        ${filters ? `<div class="chips" id="chips">${filters.map((x) => `<button class="chip ${st.f === x.key ? 'on' : ''}" data-f="${x.key}">${x.label}${x.count != null ? ` <small>${nf.format(x.count)}</small>` : ''}</button>`).join('')}</div>` : ''}
      </div><div id="items" class="${cfg.layout === 'list' ? '' : 'grid g2'}" style="align-items:start"></div>`;

    const draw = () => {
      const flt = filters?.find((x) => x.key === st.f);
      const q = st.q.trim().toLowerCase();
      const items = list.filter((it) => (!flt || flt.fn(it, X)) && (!q || cfg.search(it, X).toLowerCase().includes(q)));
      $('#items').innerHTML = items.length ? items.map((it) => `<div class="panel card enter" data-id="${it.id}">
        <div class="row1"><div class="grow">${cfg.card(it, X)}</div><div class="tools">${cfg.tools ? cfg.tools(it, X) : ''}
          <button class="icon-btn" data-act="edit" title="ویرایش" aria-label="ویرایش">${ic('edit')}</button>
          <button class="icon-btn danger" data-act="del" title="حذف" aria-label="حذف">${ic('trash')}</button></div></div>
        ${cfg.body ? cfg.body(it, X) : ''}</div>`).join('')
        : (list.length ? empty('نتیجه‌ای با این جست‌وجو یا فیلتر پیدا نشد.', 'search') : empty(cfg.empty, cfg.icon || 'folder', `<button class="btn primary small" data-add>${ic('plus')} ${cfg.addLabel}</button>`));
    };
    draw();
    cfg.after?.(list, X);

    const v = $('#view');
    v.onclick = (e) => {
      if (e.target.closest('[data-add]')) return openAdd();
      const f = e.target.closest('[data-f]');
      if (f) { st.f = f.dataset.f; $$('#chips .chip').forEach((c) => c.classList.toggle('on', c === f)); return draw(); }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('[data-id]'); const it = list.find((x) => x.id == card.dataset.id);
      if (b.dataset.act === 'edit') return openForm({ title: cfg.editTitle || 'ویرایش', fields: fields(), values: cfg.toForm ? cfg.toForm(it) : it, onSubmit: save(it.id) });
      if (b.dataset.act === 'del') return run(async () => { if (await confirmBox(cfg.confirm(it))) { await api(`${cfg.url}/${it.id}`, 'DELETE'); toast('حذف شد.', true); reload(); } });
      const fn = cfg.actions?.[b.dataset.act]; if (fn) run(() => fn(it, { btn: b, X, reload, openForm, openAdd, fields, save, list }));
    };
    v.oninput = (e) => { if (e.target.id === 'q') { st.q = e.target.value; draw(); } };
    v.onchange = (e) => {
      const card = e.target.closest('[data-id]'); const it = card && list.find((x) => x.id == card.dataset.id);
      if (it && cfg.onChange) run(() => cfg.onChange(e, it, { X, reload }));
    };
  };
}

/* ---------- ناوبری ---------- */
const RENDER = {};
const VIEWS = [
  ['dashboard', 'داشبورد', 'home', 'اصلی'], ['reports', 'گزارش‌ها', 'chart', 'اصلی'],
  ['subjects', 'درس‌های من', 'book', 'یادگیری'], ['courses', 'دوره‌ها', 'cap', 'یادگیری'], ['exams', 'امتحانات', 'clipboard', 'یادگیری'], ['skills', 'مهارت‌ها', 'target', 'یادگیری'], ['focus', 'تایمر تمرکز', 'timer', 'یادگیری'],
  ['tasks', 'وظایف', 'task', 'برنامه‌ریزی'], ['projects', 'پروژه‌ها', 'folder', 'برنامه‌ریزی'], ['goals', 'اهداف', 'flag', 'برنامه‌ریزی'], ['habits', 'عادت‌ها', 'repeat', 'برنامه‌ریزی'], ['notes', 'یادداشت‌ها', 'note', 'برنامه‌ریزی'],
  ['money', 'پول‌های من', 'wallet', 'مالی'], ['savings', 'پس‌انداز', 'pig', 'مالی'],
  ['settings', 'تنظیمات', 'settings', 'سیستم'],
];
const TABS = ['dashboard', 'tasks', 'focus', 'money'];
let current = 'dashboard', charts = [], timers = [], leaveHook = null;

function buildNav() {
  let last = '';
  $('#nav').innerHTML = VIEWS.map(([k, l, i, g]) => { const h = g !== last ? `<div class="grp">${g}</div>` : ''; last = g; return `${h}<button data-view="${k}" title="${l}">${ic(i)}<span>${l}</span></button>`; }).join('');
  $('#tabbar').innerHTML = TABS.map((k) => { const v = VIEWS.find((x) => x[0] === k); return `<button data-view="${k}">${ic(v[2])}<span>${v[1]}</span></button>`; }).join('') + `<button data-menu>${ic('menu')}<span>بیشتر</span></button>`;
  try { $('#appnav').classList.toggle('collapsed', localStorage.getItem('mt_nav') === '1'); } catch {}
}
function navClick(e) {
  const b = e.target.closest('[data-view]'); if (b) { closeMenu(); return go(b.dataset.view); }
  if (e.target.closest('[data-menu]')) openMenu();
}
$('#nav').addEventListener('click', navClick); $('#tabbar').addEventListener('click', navClick);
$('#collapse').addEventListener('click', () => { const a = $('#appnav'); a.classList.toggle('collapsed'); try { localStorage.setItem('mt_nav', a.classList.contains('collapsed') ? '1' : '0'); } catch {} setTimeout(() => charts.forEach((c) => c.resize()), 260); });
function openMenu() {
  const m = $('#menu'); let last = '';
  m.innerHTML = `<div class="menu-box">${VIEWS.map(([k, l, i, g]) => { const h = g !== last ? `<div class="grp">${g}</div>` : ''; last = g; return `${h}<button data-view="${k}" class="${k === current ? 'on' : ''}">${ic(i)}<span>${l}</span></button>`; }).join('')}</div>`;
  m.classList.remove('hidden');
}
function closeMenu() { $('#menu').classList.add('hidden'); }
$('#menu').addEventListener('click', (e) => { if (e.target.id === 'menu') closeMenu(); else navClick(e); });

function go(v) {
  if (leaveHook) { try { leaveHook(); } catch {} leaveHook = null; }
  current = v;
  $$('#nav button, #tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  charts.forEach((c) => c.destroy()); charts = []; timers.forEach(clearInterval); timers = [];
  const view = $('#view'); view.onclick = view.onchange = view.oninput = null;
  view.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  window.scrollTo(0, 0);
  return run(async () => { await RENDER[v](); }).then(() => {
    if (current === v && view.querySelector('.skeleton')) { /* رندر ناموفق → صفحه‌ی خطا */
      view.innerHTML = `<div class="panel errpage"><div class="eico">${ic('alert')}</div><h2>بارگذاری این صفحه ناموفق بود</h2><p class="muted">اتصال یا سرور را بررسی کنید و دوباره تلاش کنید.</p><button class="btn primary" id="retry">تلاش دوباره</button></div>`;
      $('#retry').onclick = () => go(v);
    }
  });
}

/* ---------- نمودارها ---------- */
const chartColors = () => { const dark = S.theme === 'dark'; return { text: dark ? '#cdd9f7' : '#1e3a8a', grid: dark ? 'rgba(150,180,255,.15)' : 'rgba(37,99,235,.12)' }; };
function mkChart(canvas, cfg) {
  if (!canvas || typeof Chart === 'undefined') { canvas?.parentElement && (canvas.parentElement.innerHTML = '<div class="empty">کتابخانه‌ی نمودار بارگذاری نشد.</div>'); return null; }
  Chart.defaults.font.family = 'Vazirmatn, Tahoma'; Chart.defaults.animation.duration = 500;
  const c = chartColors(); cfg.options = cfg.options || {}; cfg.options.maintainAspectRatio = false;
  cfg.options.plugins = { legend: { labels: { color: c.text }, display: cfg.legend !== false }, ...(cfg.options.plugins || {}) };
  if (cfg.type !== 'doughnut') cfg.options.scales = { x: { ticks: { color: c.text }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: c.text, callback: (v) => nf.format(v) }, grid: { color: c.grid } } };
  const ch = new Chart(canvas, cfg); charts.push(ch); return ch;
}
const monthLabel = (m) => new Date(m + '-01T00:00:00').toLocaleDateString('fa-IR-u-ca-gregory', { month: 'short' });
const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fa-IR-u-ca-gregory', { weekday: 'short' });
function monthlyChart(canvas, monthly) {
  return mkChart(canvas, { type: 'bar', data: { labels: monthly.map((x) => monthLabel(x.month)), datasets: [
    { label: 'درآمد', data: monthly.map((x) => x.income), backgroundColor: '#34d399', borderRadius: 6 },
    { label: 'هزینه', data: monthly.map((x) => x.expense), backgroundColor: '#fb7185', borderRadius: 6 }] } });
}
