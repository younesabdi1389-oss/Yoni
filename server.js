require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { pool, initSchema } = require('./db');
const repo = require('./lib/pgrepo');
const { dispatch } = require('./lib/routes');
const { HttpError, isDate, serverToday } = require('./lib/spec');

const { APP_PASSWORD, SESSION_SECRET } = process.env;
const APP_USERNAME = process.env.APP_USERNAME || 'admin';
if (!APP_PASSWORD || !SESSION_SECRET) {
  console.error('APP_PASSWORD و SESSION_SECRET باید تنظیم شوند.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* ---------- احراز هویت (تک‌کاربره) ---------- */
const COOKIE = 'mt_session';
const sign = (v) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('hex');
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function makeToken() { const exp = String(Date.now() + 7 * 24 * 3600 * 1000); return `${exp}.${sign(exp)}`; }
function validToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) && Number(exp) > Date.now();
}
function getCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
const cookieFlags = () => `HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

// رمز تغییریافته از داخل برنامه در دیتابیس (هش scrypt) ذخیره می‌شود؛ در غیر این صورت APP_PASSWORD
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
function checkPw(pw, stored) {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(h, 'hex'), b = crypto.scryptSync(pw, salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function passwordOk(pw) {
  const st = await repo.settings();
  return st.pw_hash ? checkPw(String(pw), st.pw_hash) : safeEq(pw, APP_PASSWORD);
}

const attempts = new Map();
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'خطای سرور. دوباره تلاش کنید.' });
});

app.get('/api/me', (req, res) => res.json({ authenticated: validToken(getCookie(req, COOKIE)) }));

app.post('/api/login', wrap(async (req, res) => {
  const rec = attempts.get(req.ip) || { n: 0, t: Date.now() };
  if (Date.now() - rec.t > 15 * 60 * 1000) { rec.n = 0; rec.t = Date.now(); }
  if (rec.n >= 8) return res.status(429).json({ error: 'تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید.' });
  const { username = '', password = '' } = req.body || {};
  const userOk = safeEq(username, APP_USERNAME);
  const passOk = await passwordOk(password); // همیشه بررسی می‌شود تا زمان پاسخ ثابت بماند
  if (userOk && passOk) {
    attempts.delete(req.ip);
    res.set('Set-Cookie', `${COOKIE}=${makeToken()}; Max-Age=${7 * 24 * 3600}; ${cookieFlags()}`);
    return res.json({ ok: true });
  }
  rec.n++; attempts.set(req.ip, rec);
  res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
}));

app.post('/api/logout', (req, res) => {
  res.set('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieFlags()}`);
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (validToken(getCookie(req, COOKIE))) return next();
  res.status(401).json({ error: 'ابتدا وارد شوید.' });
});

/* ---------- مسیرهای نیازمند دسترسی مستقیم به دیتابیس/رمز ---------- */
app.get('/api/health', wrap(async (req, res) => {
  const t0 = Date.now();
  await pool.query('SELECT 1');
  res.json({ db: true, ms: Date.now() - t0 });
}));

app.put('/api/account/password', wrap(async (req, res) => {
  const { current = '', next = '' } = req.body || {};
  if (!(await passwordOk(current))) return res.status(400).json({ error: 'رمز فعلی اشتباه است.' });
  if (String(next).length < 8) return res.status(400).json({ error: 'رمز جدید باید حداقل ۸ نویسه باشد.' });
  await repo.setSetting('pw_hash', hashPw(String(next)));
  res.json({ ok: true });
}));

/* ---------- سایر API ها (ماژول‌ها) ---------- */
app.use('/api', wrap(async (req, res) => {
  const hd = req.get('x-client-date');
  const today = hd && isDate(hd) ? hd : serverToday();
  try {
    // داخل app.use('/api') مقدار req.path بدون پیشوند /api است؛ مسیر کامل = baseUrl + path
    res.json(await dispatch(req.method, req.baseUrl + req.path, { body: req.body, query: req.query, today, repo }));
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));

// خطاهای عمومی (مثلاً JSON خراب) همیشه به‌صورت JSON برگردند، نه صفحه‌ی HTML
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'بدنه‌ی درخواست نامعتبر است.' });
  console.error(err);
  res.status(500).json({ error: 'خطای سرور. دوباره تلاش کنید.' });
});

const PORT = process.env.PORT || 3000;
initSchema()
  .then(() => app.listen(PORT, () => console.log(`MY TRACK روی پورت ${PORT} اجرا شد.`)))
  .catch((e) => { console.error('اتصال به دیتابیس ناموفق بود:', e.message); process.exit(1); });
