/* مخزن درون‌حافظه‌ای با همان رابط pgrepo — برای تست و پیش‌نمایش */
const CASCADE = { subjects: [['study_records', 'subject_id']], skills: [['skill_steps', 'skill_id']], goals: [['goal_steps', 'goal_id']],
  habits: [['habit_logs', 'habit_id']], savings_goals: [['savings_deposits', 'goal_id']] };
const SETNULL = { projects: [['tasks', 'project_id']] };
const DEF = { tasks: { done: false, done_date: null, done_at: null }, notes: {}, study_records: {} };

function createMemRepo(initial) {
  const db = initial || { seq: 1000, tables: {}, settings: {} };
  const rows = (t) => (db.tables[t] = db.tables[t] || []);
  const clone = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);
  const nowISO = () => new Date().toISOString();
  return {
    db,
    async all(t) { return clone(rows(t)); },
    async get(t, id) { return clone(rows(t).find((r) => r.id === id)) || null; },
    async insert(t, obj) {
      const r = { id: ++db.seq, created_at: nowISO(), ...(DEF[t] || {}), ...obj };
      if (t === 'notes') r.updated_at = r.updated_at || r.created_at;
      if (t === 'habit_logs' && rows(t).some((x) => x.habit_id === r.habit_id && x.log_date === r.log_date)) throw new Error('duplicate');
      rows(t).push(r); return clone(r);
    },
    async update(t, id, obj) {
      const r = rows(t).find((x) => x.id === id); if (!r) return null;
      Object.entries(obj).forEach(([k, v]) => { if (v !== undefined) r[k] = v; }); return clone(r);
    },
    async remove(t, id) {
      db.tables[t] = rows(t).filter((r) => r.id !== id);
      (CASCADE[t] || []).forEach(([ct, c]) => { db.tables[ct] = rows(ct).filter((r) => r[c] !== id); });
      (SETNULL[t] || []).forEach(([ct, c]) => rows(ct).forEach((r) => { if (r[c] === id) r[c] = null; }));
    },
    async replace(t, c, val, list) {
      db.tables[t] = rows(t).filter((r) => r[c] !== val);
      list.forEach((o) => rows(t).push({ id: ++db.seq, ...o }));
    },
    async settings() { return { ...db.settings }; },
    async setSetting(k, v) { db.settings[k] = String(v); },
  };
}
module.exports = { createMemRepo };
