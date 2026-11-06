/* مشخصات فیلدها + اعتبارسنجی سمت سرور (مشترک بین همه ماژول‌ها) */
class HttpError extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

const f = (t, l, o = {}) => ({ t, l, ...o });
const S = (l, max = 200, o = {}) => f('str', l, { max, ...o });
const TX = (l) => f('str', l, { max: 20000 });
const D = (l, o = {}) => f('date', l, o);
const N = (l, o = {}) => f('num', l, o);
const I = (l, o = {}) => f('int', l, o);
const B = (l, o = {}) => f('bool', l, o);
const E = (l, list, def) => f('enum', l, { list, def });
const U = (l) => f('url', l, { max: 500 });

const SPEC = {
  subjects: { title: S('عنوان درس', 200, { req: 1 }), source: S('منبع'), chapter: S('فصل'), topic: S('مبحث'), category: S('دسته‌بندی', 100),
    plan_date: D('تاریخ برنامه'), study_date: D('تاریخ مطالعه'), notes: TX('توضیحات'), status: E('وضعیت', ['todo', 'done']) },
  transactions: { type: E('نوع', ['income', 'expense']), title: S('عنوان', 200, { req: 1 }), amount: N('مبلغ', { req: 1, gt0: 1 }),
    category: S('دسته‌بندی', 100), tx_date: D('تاریخ', { today: 1 }), notes: TX('توضیحات') },
  tasks: { title: S('عنوان وظیفه', 200, { req: 1 }), notes: TX('توضیحات'), category: S('دسته‌بندی', 100),
    priority: E('اولویت', ['low', 'medium', 'high'], 'medium'), due_date: D('مهلت'), due_time: f('time', 'ساعت', { max: 5 }),
    project_id: I('پروژه', { fk: 1, null: 1 }) },
  projects: { title: S('عنوان پروژه', 200, { req: 1 }), description: TX('توضیحات'), start_date: D('تاریخ شروع'), end_date: D('تاریخ پایان'),
    status: E('وضعیت', ['active', 'paused', 'completed']) },
  goals: { title: S('عنوان هدف', 200, { req: 1 }), term: E('نوع هدف', ['short', 'long']), target_date: D('تاریخ هدف'), notes: TX('یادداشت') },
  skills: { title: S('عنوان مهارت', 200, { req: 1 }), description: TX('توضیحات'), resources: S('منابع', 500), link: U('لینک'), notes: TX('یادداشت'),
    status: E('وضعیت', ['not_started', 'learning', 'completed']) },
  habits: { title: S('عنوان عادت', 200, { req: 1 }), frequency: E('تکرار', ['daily', 'weekly']), notes: TX('توضیحات'), active: B('فعال', { def: true }) },
  notes: { title: S('عنوان', 200), content: TX('متن'), category: S('دسته‌بندی', 100), pinned: B('سنجاق') },
  courses: { title: S('عنوان دوره', 200, { req: 1 }), instructor: S('مدرس یا منبع'), link: U('لینک'),
    total_sessions: I('تعداد جلسات', { min: 0, max: 10000 }), done_sessions: I('جلسات انجام‌شده', { min: 0, max: 10000 }),
    status: E('وضعیت', ['learning', 'completed']), notes: TX('یادداشت') },
  exams: { title: S('عنوان امتحان', 200, { req: 1 }), subject: S('درس'), exam_date: D('تاریخ امتحان', { req: 1 }),
    score: N('نمره', { null: 1, min: 0 }), max_score: N('نمره کل', { gt0: 1, def: 20 }), notes: TX('یادداشت') },
  savings_goals: { title: S('عنوان هدف', 200, { req: 1 }), target_amount: N('مبلغ موردنیاز', { req: 1, gt0: 1 }),
    initial_amount: N('مبلغ فعلی', { min: 0, def: 0 }), target_date: D('تاریخ هدف'), notes: TX('یادداشت') },
  savings_deposits: { amount: N('مبلغ', { req: 1, gt0: 1 }), dep_date: D('تاریخ', { today: 1 }), note: S('توضیح', 300) },
};
const STEP = { title: S('عنوان مرحله', 300, { req: 1 }), done: B('انجام‌شده') };

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));

function validate(table, body, opt = {}) {
  const spec = typeof table === 'string' ? SPEC[table] : table;
  const out = {}; body = body || {};
  for (const [k, fd] of Object.entries(spec)) {
    const has = Object.prototype.hasOwnProperty.call(body, k);
    if (opt.partial && !has) continue;
    let v = has ? body[k] : undefined;
    const bad = (m) => { throw new HttpError(`${fd.l}: ${m}`); };
    switch (fd.t) {
      case 'str': case 'url': case 'time':
        v = String(v ?? '').trim().slice(0, fd.max || 500);
        if (fd.req && !v) bad('الزامی است.');
        if (fd.t === 'url' && v && !/^https?:\/\//i.test(v)) bad('باید با http:// یا https:// شروع شود.');
        if (fd.t === 'time' && v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) bad('نامعتبر است.');
        break;
      case 'date':
        v = String(v ?? '').trim();
        if (!v) { if (fd.today && opt.today) v = opt.today; else if (fd.req) bad('الزامی است.'); else v = null; }
        else if (!isDate(v)) bad('تاریخ نامعتبر است.');
        break;
      case 'num': case 'int':
        if (v === '' || v == null) {
          if (fd.req) bad('الزامی است.');
          v = fd.null ? null : (fd.def ?? 0);
        } else {
          v = Number(v);
          if (!Number.isFinite(v)) bad('عدد معتبر نیست.');
          if (fd.t === 'int') v = Math.trunc(v);
          if (fd.gt0 && v <= 0) bad('باید بزرگ‌تر از صفر باشد.');
          if (fd.min != null && v < fd.min) bad(`نباید کمتر از ${fd.min} باشد.`);
          if (fd.max != null && v > fd.max) bad(`نباید بیشتر از ${fd.max} باشد.`);
          if (v > 1e12) bad('عدد خیلی بزرگ است.');
        }
        break;
      case 'bool': v = v === undefined ? !!fd.def : (v === true || v === 'true' || v === 1); break;
      case 'enum':
        if (v === undefined || v === '') v = fd.def || fd.list[0];
        else if (!fd.list.includes(v)) bad('مقدار نامعتبر است.');
        break;
    }
    out[k] = v;
  }
  return out;
}

/* ابزار تاریخ (رشته‌ی YYYY-MM-DD، بدون وابستگی به منطقه‌ی زمانی) */
const ms = (d) => Date.parse(d + 'T00:00:00Z');
const addDays = (d, n) => new Date(ms(d) + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((ms(b) - ms(a)) / 864e5);
const weekStart = (d) => addDays(d, -((new Date(ms(d)).getUTCDay() + 1) % 7)); // شروع هفته: شنبه
const serverToday = () => new Date().toISOString().slice(0, 10);

module.exports = { SPEC, STEP, validate, HttpError, addDays, daysBetween, weekStart, serverToday, isDate };
