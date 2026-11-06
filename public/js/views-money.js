/* مالی: پول‌های من (تراکنش‌ها + گزارش ماهانه/سالانه) و پس‌انداز */
const MS = { tab: 'tx', type: 'all', cat: '', from: '', to: '', q: '', year: '' };
const txFields = [{ name: 'type', label: 'نوع', type: 'select', options: [['income', 'درآمد'], ['expense', 'هزینه']] }, { name: 'title', label: 'عنوان', required: true },
  { name: 'amount', label: 'مبلغ', type: 'number', step: 'any', min: 0, required: true }, { name: 'category', label: 'دسته‌بندی', list: 'cats' }, { name: 'tx_date', label: 'تاریخ', type: 'date', default: todayISO() }, { name: 'notes', label: 'توضیحات', type: 'textarea' }];
const PALETTE = ['#2563eb', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f97316', '#14b8a6', '#94a3b8'];

RENDER.money = async function () {
  const [list, sum] = await Promise.all([api('/api/transactions'), api('/api/money/summary')]);
  const reload = () => go('money');
  const save = (id) => async (d) => { await api(id ? `/api/transactions/${id}` : '/api/transactions', id ? 'PUT' : 'POST', d); toast('ذخیره شد.', true); reload(); };
  const cats = [...new Set(list.map((t) => t.category).filter(Boolean))];
  $('#view').innerHTML = `<div class="head"><div><h1>پول‌های من</h1><div class="muted">درآمد، هزینه و گزارش‌ها</div></div><div class="actions">
      <button class="btn primary" data-new="income">${ic('plus')} ثبت درآمد</button><button class="btn" data-new="expense">${ic('plus')} ثبت هزینه</button></div></div>
    <div class="grid g3">${statCard('موجودی', money(sum.balance), '', 'balance')}${statCard('مجموع درآمد', `<span class="good">${money(sum.income)}</span>`)}${statCard('مجموع هزینه', `<span class="badc">${money(sum.expense)}</span>`)}</div>
    <div class="chips tabs"><button class="chip ${MS.tab === 'tx' ? 'on' : ''}" data-tab="tx">تراکنش‌ها</button><button class="chip ${MS.tab === 'rep' ? 'on' : ''}" data-tab="rep">گزارش ماهانه و سالانه</button></div><div id="mbody"></div>`;

  async function drawTx() {
    $('#mbody').innerHTML = `<div class="panel"><div class="section-title">درآمد و هزینه (۶ ماه اخیر)</div><div class="chartbox"><canvas id="cM"></canvas></div></div>
      <div class="panel" style="margin-top:14px"><div class="section-title">تاریخچه تراکنش‌ها <span class="count" id="tcount"></span></div>
        <div class="filters"><label class="searchbox">${ic('search')}<input id="tq" type="search" placeholder="جست‌وجو در عنوان…" value="${esc(MS.q)}"></label>
          <select id="ttype"><option value="all">همه</option><option value="income" ${MS.type === 'income' ? 'selected' : ''}>درآمد</option><option value="expense" ${MS.type === 'expense' ? 'selected' : ''}>هزینه</option></select>
          <select id="tcat"><option value="">همه دسته‌ها</option>${cats.map((c) => `<option ${MS.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <label class="inl">از<input id="tfrom" type="date" value="${MS.from}"></label><label class="inl">تا<input id="tto" type="date" value="${MS.to}"></label>
          <button class="btn small ghost" id="tclear">پاک‌کردن فیلتر</button></div><div id="tlist"></div></div>`;
    monthlyChart($('#cM'), sum.monthly);
    const draw = () => {
      const q = MS.q.trim().toLowerCase();
      const rows = list.filter((t) => (MS.type === 'all' || t.type === MS.type) && (!MS.cat || t.category === MS.cat) && (!MS.from || t.tx_date >= MS.from) && (!MS.to || t.tx_date <= MS.to) && (!q || (t.title + ' ' + t.notes + ' ' + t.category).toLowerCase().includes(q)));
      const inc = rows.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0), exp = rows.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      $('#tcount').textContent = nf.format(rows.length);
      $('#tlist').innerHTML = (rows.length ? `<div class="muted" style="margin:6px 0">جمع نتیجه: <span class="good">${money(inc)}</span> درآمد • <span class="badc">${money(exp)}</span> هزینه</div>` + rows.map((t) => `<div class="tx" data-id="${t.id}"><span class="dot ${t.type === 'income' ? 'good' : 'badc'}">${ic(t.type === 'income' ? 'down' : 'up')}</span>
        <div class="t"><b>${esc(t.title)}</b><span class="muted" style="font-size:13px">${[t.category && esc(t.category), fdate(t.tx_date), t.notes && esc(t.notes)].filter(Boolean).join(' • ')}</span></div>
        <span class="amt ${t.type === 'income' ? 'good' : 'badc'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>
        <div class="tools"><button class="icon-btn" data-act="edit" aria-label="ویرایش">${ic('edit')}</button><button class="icon-btn danger" data-act="del" aria-label="حذف">${ic('trash')}</button></div></div>`).join('')
        : (list.length ? empty('تراکنشی با این فیلتر پیدا نشد.', 'search') : empty('هنوز تراکنشی ثبت نشده است.', 'wallet')));
    };
    draw(); return draw;
  }
  async function drawRep() {
    const r = await api('/api/money/report' + (MS.year ? `?year=${MS.year}` : '')); MS.year = r.year;
    $('#mbody').innerHTML = `<div class="panel"><div class="section-title">گزارش سال <select id="ryear" style="width:auto;display:inline-block;margin:0 8px">${r.years.map((y) => `<option ${y === r.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      <div class="grid g3">${statCard('درآمد سال', `<span class="good">${money(r.income)}</span>`)}${statCard('هزینه سال', `<span class="badc">${money(r.expense)}</span>`)}${statCard('خالص', `<span class="${r.net >= 0 ? 'good' : 'badc'}">${money(r.net)}</span>`)}</div></div>
      <div class="grid g2" style="margin-top:14px"><div class="panel"><div class="section-title">روند ماهانه</div><div class="chartbox"><canvas id="cY"></canvas></div></div>
        <div class="panel"><div class="section-title">هزینه بر اساس دسته</div>${r.expense_by_category.length ? '<div class="chartbox"><canvas id="cC"></canvas></div>' : empty('هزینه‌ای در این سال ثبت نشده است.', 'chart')}</div></div>
      <div class="panel" style="margin-top:14px;overflow-x:auto"><div class="section-title">جدول ماهانه</div><table class="tbl"><thead><tr><th>ماه</th><th>درآمد</th><th>هزینه</th><th>خالص</th></tr></thead><tbody>${r.months.map((m) => `<tr><td>${monthLabel(m.month)}</td><td class="good">${money(m.income)}</td><td class="badc">${money(m.expense)}</td><td>${money(m.income - m.expense)}</td></tr>`).join('')}</tbody></table></div>`;
    monthlyChart($('#cY'), r.months);
    if (r.expense_by_category.length) mkChart($('#cC'), { type: 'doughnut', data: { labels: r.expense_by_category.map((c) => c.category), datasets: [{ data: r.expense_by_category.map((c) => c.total), backgroundColor: PALETTE, borderWidth: 0 }] }, options: { cutout: '60%' } });
  }
  let redraw = null;
  const show = async () => { charts.forEach((c) => c.destroy()); charts = []; if (MS.tab === 'tx') redraw = await drawTx(); else await drawRep(); };
  await show();
  const v = $('#view');
  v.onclick = (e) => run(async () => {
    const n = e.target.closest('[data-new]'); if (n) return openForm({ title: n.dataset.new === 'income' ? 'ثبت درآمد' : 'ثبت هزینه', fields: txFields, values: { type: n.dataset.new }, onSubmit: save() });
    const tab = e.target.closest('[data-tab]'); if (tab) { MS.tab = tab.dataset.tab; $$('.tabs .chip').forEach((c) => c.classList.toggle('on', c === tab)); return show(); }
    if (e.target.closest('#tclear')) { Object.assign(MS, { type: 'all', cat: '', from: '', to: '', q: '' }); return show(); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const t = list.find((x) => x.id == b.closest('[data-id]').dataset.id);
    if (b.dataset.act === 'edit') openForm({ title: 'ویرایش تراکنش', fields: txFields, values: t, onSubmit: save(t.id) });
    if (b.dataset.act === 'del' && await confirmBox(`تراکنش «${t.title}» حذف شود؟`)) { await api(`/api/transactions/${t.id}`, 'DELETE'); toast('حذف شد.', true); reload(); }
  });
  v.oninput = (e) => { const m = { tq: 'q' }[e.target.id]; if (m) { MS.q = e.target.value; redraw?.(); } };
  v.onchange = (e) => { const id = e.target.id; const map = { ttype: 'type', tcat: 'cat', tfrom: 'from', tto: 'to' };
    if (map[id]) { MS[map[id]] = e.target.value; redraw?.(); } if (id === 'ryear') { MS.year = e.target.value; show(); } };
};

/* ----- پس‌انداز ----- */
RENDER.savings = crudView({
  key: 'savings', url: '/api/savings', title: 'پس‌انداز', sub: 'هدف‌های پس‌انداز و واریزها', addLabel: 'هدف پس‌انداز جدید', addTitle: 'هدف پس‌انداز جدید', editTitle: 'ویرایش هدف', icon: 'pig',
  empty: 'هدف پس‌اندازی ندارید. مثلاً «خرید لپ‌تاپ» را تعریف کنید.', confirm: (g) => `هدف «${g.title}» و همه واریزهایش حذف شود؟`, search: (g) => [g.title, g.notes].join(' '),
  top: (l) => { const cur = l.reduce((a, g) => a + g.current, 0), tg = l.reduce((a, g) => a + g.target_amount, 0), p = tg ? Math.min(100, Math.round(cur / tg * 100)) : 0;
    return `<div class="grid g3">${statCard('مجموع پس‌انداز', money(cur), '', 'balance')}${statCard('مجموع هدف‌ها', money(tg))}${statCard('پیشرفت کلی', nf.format(p) + '٪', bar(p))}</div>`; },
  fields: [{ name: 'title', label: 'عنوان هدف', required: true }, { name: 'target_amount', label: 'مبلغ موردنیاز', type: 'number', step: 'any', min: 0, required: true }, { name: 'initial_amount', label: 'مبلغ فعلی (از قبل داشته‌ام)', type: 'number', step: 'any', min: 0, default: 0 }, { name: 'target_date', label: 'تاریخ هدف', type: 'date' }, { name: 'notes', label: 'یادداشت', type: 'textarea' }],
  card: (g) => `<h3>${esc(g.title)}</h3><div class="meta">${g.target_date ? `<span>🎯 ${fdate(g.target_date)}</span>` : ''}<span>باقی‌مانده: ${money(g.remaining)}</span>${g.progress >= 100 ? badge('رسیدم ✓', 'completed') : ''}</div>`,
  tools: () => `<button class="icon-btn" data-act="dep" title="ثبت واریز" aria-label="ثبت واریز">${ic('plus')}</button>`,
  body: (g) => `<div class="row" style="align-items:center;gap:10px"><div style="flex:1">${bar(g.progress)}</div><span class="muted">${money(g.current)} از ${money(g.target_amount)} • ${nf.format(g.progress)}٪</span></div>
    ${g.deposits.length ? `<div class="deps">${g.deposits.slice(0, 5).map((d) => `<div class="dep"><span>${fdate(d.dep_date)}${d.note ? ' • ' + esc(d.note) : ''}</span><b class="good">+${money(d.amount)}</b><button class="icon-btn danger" data-act="deldep" data-dep="${d.id}" aria-label="حذف واریز">${ic('trash')}</button></div>`).join('')}${g.deposits.length > 5 ? `<small class="muted">و ${nf.format(g.deposits.length - 5)} واریز دیگر</small>` : ''}</div>` : '<div class="muted">هنوز واریزی ثبت نشده است.</div>'}${g.notes ? `<div class="note">${esc(g.notes)}</div>` : ''}`,
  actions: {
    dep: async (g, { reload }) => openForm({ title: `ثبت واریز برای «${g.title}»`, fields: [{ name: 'amount', label: 'مبلغ', type: 'number', step: 'any', min: 0, required: true }, { name: 'dep_date', label: 'تاریخ', type: 'date', default: todayISO() }, { name: 'note', label: 'توضیح' }],
      onSubmit: async (d) => { await api(`/api/savings/${g.id}/deposits`, 'POST', d); toast('واریز ثبت شد.', true); reload(); } }),
  },
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dep]'); if (!b) return; e.stopPropagation();
  run(async () => { if (await confirmBox('این واریز حذف شود؟')) { await api(`/api/savings/deposits/${b.dataset.dep}`, 'DELETE'); toast('حذف شد.', true); go('savings'); } });
}, true);
