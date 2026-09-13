/*
 * Schema - parte 2 (índices críticos, horários, bloqueios, feriados,
 * portfólio, avaliações, pagamentos, notificações, configurações).
 * Adaptado para PostgreSQL.
 */
import { db } from './db.js';

const SCHEMA2 = `
-- Índice crítico: impede agendamento duplicado no mesmo horário e barbeiro.
-- EXCLUI cancelados e no_show para que o horário possa ser reutilizado.
DROP INDEX IF EXISTS idx_appt_no_double;
CREATE UNIQUE INDEX idx_appt_no_double
  ON appointments (barber_id, date, start_time)
  WHERE barber_id IS NOT NULL AND status NOT IN ('cancelled','no_show');

CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appt_customer ON appointments (customer_id);

CREATE TABLE IF NOT EXISTS business_hours (
  id              SERIAL PRIMARY KEY,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time       TIME,
  close_time      TIME,
  active          INTEGER NOT NULL DEFAULT 1,
  UNIQUE (day_of_week)
);

CREATE TABLE IF NOT EXISTS barber_hours (
  id          SERIAL PRIMARY KEY,
  barber_id   INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TIME,
  close_time  TIME,
  active      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (barber_id, day_of_week),
  FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blocked_times (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'Horário bloqueado',
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  all_day     INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  reason      TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_times (date);

CREATE TABLE IF NOT EXISTS holidays (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  type        TEXT NOT NULL DEFAULT 'holiday',
  recurring   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (title, date)
);
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holidays (date);

CREATE TABLE IF NOT EXISTS portfolio (
  id          SERIAL PRIMARY KEY,
  image       TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  service_id  INTEGER,
  barber_id   INTEGER,
  portfolio_date DATE,
  published   INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (barber_id)  REFERENCES barbers(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  appointment_id   INTEGER,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  appointment_id  INTEGER NOT NULL UNIQUE,
  method          TEXT NOT NULL DEFAULT 'pix',
  value           REAL NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT NOT NULL DEFAULT 'info',
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL
);
`;

export async function initSchemaPart2() {
  await db.query(SCHEMA2);
}