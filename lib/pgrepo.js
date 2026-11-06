/* لایه‌ی دسترسی به PostgreSQL (جدول‌ها از فهرست مجاز می‌آیند، نه از ورودی کاربر) */
const { pool } = require('../db');

const TABLES = new Set(['subjects', 'study_records', 'transactions', 'skills', 'skill_steps', 'projects', 'tasks', 'goals', 'goal_steps',
  'habits', 'habit_logs', 'notes', 'courses', 'exams', 'focus_sessions', 'savings_goals', 'savings_deposits']);
const tbl = (t) => { if (!TABLES.has(t)) throw new Error('جدول نامعتبر: ' + t); return t; };
const col = (c) => { if (!/^[a-z_]+$/.test(c)) throw new Error('ستون نامعتبر'); return c; };

async function insertWith(db, t, obj) {
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).map(col);
  const r = await db.query(`INSERT INTO ${tbl(t)} (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`, keys.map((k) => obj[k]));
  return r.rows[0];
}

module.exports = {
  async all(t) { return (await pool.query(`SELECT * FROM ${tbl(t)} ORDER BY id`)).rows; },
  async get(t, id) { return (await pool.query(`SELECT * FROM ${tbl(t)} WHERE id=$1`, [id])).rows[0] || null; },
  insert: (t, obj) => insertWith(pool, t, obj),
  async update(t, id, obj) {
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).map(col);
    if (!keys.length) return this.get(t, id);
    const r = await pool.query(`UPDATE ${tbl(t)} SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} WHERE id=$${keys.length + 1} RETURNING *`, [...keys.map((k) => obj[k]), id]);
    return r.rows[0] || null;
  },
  async remove(t, id) { await pool.query(`DELETE FROM ${tbl(t)} WHERE id=$1`, [id]); },
  async replace(t, c, val, rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${tbl(t)} WHERE ${col(c)}=$1`, [val]);
      for (const r of rows) await insertWith(client, t, r);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  },
  async settings() { const o = {}; (await pool.query('SELECT key,value FROM settings')).rows.forEach((r) => (o[r.key] = r.value)); return o; },
  async setSetting(k, v) {
    await pool.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [k, String(v)]);
  },
};
