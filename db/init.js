require('dotenv').config();
const { pool, initSchema } = require('../db');
initSchema()
  .then(() => { console.log('جدول‌ها آماده‌اند.'); return pool.end(); })
  .catch((e) => { console.error('خطا:', e.message); process.exit(1); });
