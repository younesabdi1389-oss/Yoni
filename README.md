# MY TRACK — نسخه ۲
**Your Life. Your Progress. Your Track.**

اپلیکیشن شخصی مدیریت زندگی و پیشرفت (فارسی، راست‌چین، تک‌کاربره).
**فناوری:** HTML/CSS/JS · Node.js + Express · PostgreSQL (Neon) · Chart.js

## امکانات
- **داشبورد** قابل‌شخصی‌سازی (نمایش/پنهان‌کردن و ترتیب کارت‌ها، ذخیره در دیتابیس)، نمودارهای هفتگی و ماهانه، فعالیت‌های اخیر
- **یادگیری:** درس‌ها (دسته‌بندی، برنامه و تاریخ مطالعه، جست‌وجو/فیلتر، پیشرفت) · دوره‌ها (پیشرفت جلسات) · امتحانات و میانگین نمرات · مهارت‌ها (مراحل و درصد خودکار) · تایمر تمرکز (ادامه‌پذیر پس از رفرش، تاریخچه، گزارش روزانه/هفتگی)
- **برنامه‌ریزی:** وظایف (اولویت، مهلت، ساعت، دسته، امروز/آینده/عقب‌افتاده) · پروژه‌ها (وظایف زیرمجموعه و درصد پیشرفت) · اهداف (مراحل) · عادت‌ها (زنجیره، پایبندی، ۷ روز اخیر) · یادداشت‌ها (سنجاق، دسته، جست‌وجو، ذخیره‌ی خودکار)
- **مالی:** تراکنش‌ها با فیلتر (نوع، دسته، بازه‌ی تاریخ، جست‌وجو) · گزارش ماهانه و سالانه · پس‌انداز (هدف، واریزها، درصد)
- **گزارش‌ها:** روزانه/هفتگی/ماهانه با مقایسه به دوره‌ی قبل، روند ۳۰ روز، پیشرفت پروژه/هدف/مهارت/عادت
- **تنظیمات:** تم، واحد پول، نام نمایشی، تغییر رمز، وضعیت دیتابیس، خروج
- منوی کناری جمع‌شونده، منوی پایین در موبایل، تأیید حذف، پیام موفقیت/خطا، صفحه‌های خالی و صفحه‌ی خطا

## ساختار
```
server.js            ورود/نشست، فایل‌های استاتیک، اتصال مسیرها
lib/spec.js          مشخصات فیلدها + اعتبارسنجی سمت سرور
lib/routes.js        همه‌ی API ها (مستقل از Express و Postgres)
lib/pgrepo.js        لایه‌ی PostgreSQL     |   lib/memrepo.js  مخزن حافظه‌ای (برای تست)
db/schema.sql        جدول‌ها (فقط افزودنی؛ داده‌های نسخه‌ی ۱ حفظ می‌شود)
public/js/           core · views-learning · views-life · views-money · views-dash · main
tests/smoke.js       تست منطق API  →  npm test
```

## نقشه‌ی کامل فایل‌ها و ارتباط‌ها
```
مرورگر ──► public/index.html ──► js: core → views-learning → views-life → views-money → views-dash → main
                │                      (همه از طریق fetch به /api/... صحبت می‌کنند؛ هیچ داده‌ای فقط در مرورگر نیست)
                ▼
          server.js ── احراز هویت (کوکی امضاشده)، فایل‌های استاتیک، /api/health، /api/account/password
                │
                └─► lib/routes.js  (۶۲ مسیر API: درس، مالی، وظیفه، پروژه، هدف، عادت، یادداشت، دوره، امتحان، تمرکز، پس‌انداز، تنظیمات، داشبورد، گزارش)
                        ├─► lib/spec.js     اعتبارسنجی ورودی‌ها
                        └─► lib/pgrepo.js ─► db.js ─► PostgreSQL (Neon) با DATABASE_URL
                                              └─ db/schema.sql  (هنگام شروع اجرا می‌شود؛ فقط افزودنی)
lib/memrepo.js  = همان رابط pgrepo در حافظه (فقط برای تست)      tests/smoke.js · tests/http.js = تست‌ها
```
| فایل | نقش |
|---|---|
| `package.json` | وابستگی‌ها (express, pg, dotenv) و دستورات `start`, `test`, `test:http`, `db:init` |
| `.env.example` | الگوی متغیرها — برای اجرا آن را به `.env` کپی کنید (`.env` عمداً در زیپ نیست) |
| `render.yaml` | اختیاری، تنظیم خودکار Render |
| `.gitignore` | جلوگیری از آپلود `.env` و `node_modules` |
| `public/assets/mytrack-bg.jpg` | تصویر پس‌زمینه‌ی MY TRACK |

## ارتقا از نسخه‌ی ۱
فایل‌ها را جایگزین کنید و `npm install` و `npm start` بزنید. هنگام شروع، `schema.sql` اجرا می‌شود: جدول‌های جدید ساخته و دو ستون به `subjects` و یک ستون به `study_records` اضافه می‌شود؛ هیچ داده‌ای حذف نمی‌شود. `.env` و رمز قبلی بدون تغییر کار می‌کنند.

## اجرای محلی
```bash
npm install
cp .env.example .env      # ویندوز: copy .env.example .env
npm start                 # http://localhost:3000
```
در `.env` مقادیر `DATABASE_URL` (از Neon)، `APP_USERNAME`، `APP_PASSWORD` و `SESSION_SECRET` (`openssl rand -hex 32`) را پر کنید.
رمز را می‌توانید بعداً از «تنظیمات» عوض کنید؛ رمز جدید به‌صورت هش در دیتابیس ذخیره می‌شود و بر `APP_PASSWORD` مقدم است.

## Neon
در [neon.tech](https://neon.tech) یک Project بسازید و Connection string (`postgresql://…?sslmode=require`) را در `DATABASE_URL` بگذارید.

## GitHub
```bash
git init && git add . && git commit -m "MY TRACK v2"
git branch -M main
git remote add origin https://github.com/USERNAME/my-track.git
git push -u origin main
```
`.env` در `.gitignore` است. مخزن را Private بسازید.

## Render
New → Web Service → مخزن را انتخاب کنید · Build: `npm install` · Start: `npm start` · در Environment: `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`.

## تست‌ها و وضعیت راستی‌آزمایی
**انجام‌شده:** `npm test` منطق همه‌ی API ها (اعتبارسنجی، محاسبه‌ی موجودی، درصد پیشرفت، زنجیره‌ی عادت‌ها، میانگین نمرات، تایمر، پس‌انداز، گزارش‌ها) را روی مخزن حافظه‌ای اجرا می‌کند. رابط کاربری هم در مرورگر headless با همان منطق آزمایش شد: رندر ۱۵ صفحه، افزودن/انجام/حذف وظیفه، پیام اعتبارسنجی، عادت، ذخیره‌ی خودکار یادداشت، تایمر، واریز پس‌انداز، فیلتر مالی، شخصی‌سازی داشبورد، جمع‌شدن منو و منوی موبایل.
**اجرای تست لایه‌ی Express (پس از npm install):** `npm run test:http` — ورود، ۴۰۱ بدون نشست، همه‌ی مسیرهای GET، ۴۰۰ اعتبارسنجی و ۴۰۴ مسیر ناموجود را با مخزن حافظه‌ای بررسی می‌کند. این تست در محیط من اجرا نشد (Express نصب نبود).
**آزمایش‌نشده:** لایه‌ی SQL (`lib/pgrepo.js`, `db/schema.sql`) و اتصال واقعی Neon، ورود/نشست و تغییر رمز روی سرور واقعی، و نمودارهای Chart.js (در محیط تست به اینترنت دسترسی نبود). اولین اجرای شما روی Neon، آزمون واقعی این بخش‌هاست.
