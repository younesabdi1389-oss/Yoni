CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  source     TEXT DEFAULT '',
  chapter    TEXT DEFAULT '',
  topic      TEXT DEFAULT '',
  study_date DATE,
  notes      TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_records (
  id          SERIAL PRIMARY KEY,
  subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('todo','done')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id         SERIAL PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  title      TEXT NOT NULL,
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  category   TEXT DEFAULT '',
  tx_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  resources   TEXT DEFAULT '',
  link        TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','learning','completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_steps (
  id       SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  done     BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_steps_skill ON skill_steps (skill_id, position);

/* ====== نسخه ۲ (فقط افزودن؛ داده‌های قبلی دست‌نخورده می‌مانند) ====== */
ALTER TABLE subjects      ADD COLUMN IF NOT EXISTS category  TEXT DEFAULT '';
ALTER TABLE subjects      ADD COLUMN IF NOT EXISTS plan_date DATE;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS rec_date  DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
  start_date DATE, end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, notes TEXT DEFAULT '', category TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date DATE, due_time TEXT DEFAULT '',
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  done BOOLEAN NOT NULL DEFAULT false, done_date DATE, done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL,
  term TEXT NOT NULL DEFAULT 'short' CHECK (term IN ('short','long')),
  target_date DATE, notes TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goal_steps (
  id SERIAL PRIMARY KEY, goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT false, position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  notes TEXT DEFAULT '', active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS habit_logs (
  id SERIAL PRIMARY KEY, habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL, UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY, title TEXT DEFAULT '', content TEXT DEFAULT '', category TEXT DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, instructor TEXT DEFAULT '', link TEXT DEFAULT '',
  total_sessions INTEGER NOT NULL DEFAULT 0, done_sessions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','completed')),
  notes TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, subject TEXT DEFAULT '', exam_date DATE NOT NULL,
  score NUMERIC(8,2), max_score NUMERIC(8,2) NOT NULL DEFAULT 20 CHECK (max_score > 0),
  notes TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id SERIAL PRIMARY KEY, label TEXT DEFAULT '', duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  session_date DATE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  initial_amount NUMERIC(14,2) NOT NULL DEFAULT 0, target_date DATE, notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS savings_deposits (
  id SERIAL PRIMARY KEY, goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0), dep_date DATE NOT NULL, note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs ON habit_logs (habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_sessions (session_date);
