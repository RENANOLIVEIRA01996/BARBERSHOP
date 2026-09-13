/**
 * Dashboard — visão geral e gráficos.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, todayStr, toYMD } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const monday = () => { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return toYMD(d); };
const monthStart = () => toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const monthEnd = () => toYMD(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  const today = todayStr();
  const wk = monday();
  const ms = monthStart();
  const me = monthEnd();

  const { rows: apptToday } = await db.query(
    `SELECT COUNT(*) AS n FROM appointments WHERE date = $1 AND status NOT IN ('cancelled','no_show')`, [today]);
  const appointmentsToday = Number(apptToday[0].n);

  const { rows: next } = await db.query(`
    SELECT a.*, c.name AS customer_name, s.name AS service_name
    FROM appointments a
    JOIN customers c ON c.id = a.customer_id
    JOIN services s ON s.id = a.service_id
    WHERE a.date = $1 AND a.status IN ('scheduled','confirmed')
    ORDER BY a.start_time ASC
  `, [today]);

  const { rows: custCount } = await db.query('SELECT COUNT(*) AS n FROM customers');
  const customersCount = Number(custCount[0].n);

  const { rows: revDay } = await db.query(
    "SELECT COALESCE(SUM(value),0) AS v FROM appointments WHERE date = $1 AND status = 'completed'", [today]);
  const revenueDay = Number(revDay[0].v);
  const { rows: revMonth } = await db.query(
    'SELECT COALESCE(SUM(value),0) AS v FROM appointments WHERE date BETWEEN $1 AND $2 AND status = $3', [ms, me, 'completed']);
  const revenueMonth = Number(revMonth[0].v);
  const { rows: revWeek } = await db.query(
    "SELECT COALESCE(SUM(value),0) AS v FROM appointments WHERE date >= $1 AND date <= $2 AND status = 'completed'", [wk, today]);
  const revenueWeek = Number(revWeek[0].v);

  const { rows: svcDone } = await db.query(
    "SELECT COUNT(*) AS n FROM appointments WHERE date = $1 AND status = 'completed'", [today]);
  const servicesDone = Number(svcDone[0].n);
  const { rows: canc } = await db.query(
    "SELECT COUNT(*) AS n FROM appointments WHERE date = $1 AND status IN ('cancelled','no_show')", [today]);
  const cancelled = Number(canc[0].n);

  const { rows: upcoming } = await db.query(`
    SELECT a.*, c.name AS customer_name, c.whatsapp AS customer_whatsapp, s.name AS service_name,
           b.name AS barber_name
    FROM appointments a
    JOIN customers c ON c.id = a.customer_id
    JOIN services s ON s.id = a.service_id
    LEFT JOIN barbers b ON b.id = a.barber_id
    WHERE a.date >= $1 AND a.status IN ('scheduled','confirmed')
    ORDER BY a.date ASC, a.start_time ASC LIMIT 8
  `, [today]);

  return ok(res, {
    today, weekStart: wk, monthStart: ms, monthEnd: me,
    cards: {
      appointmentsToday, customersCount,
      revenueDay, revenueWeek, revenueMonth,
      servicesDone, cancelled,
      next,
    },
    upcoming,
  });
});

// GET /api/dashboard/charts?months=6
router.get('/charts', async (req, res) => {
  const months = Math.min(24, Number(req.query.months) || 6);

  // Evolução mensal de faturamento e atendimentos
  const { rows: monthly } = await db.query(`
    SELECT TO_CHAR(date, 'YYYY-MM') AS month,
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status = 'completed' THEN value ELSE 0 END),0) AS revenue
    FROM appointments
    WHERE date >= CURRENT_DATE - ($1 || ' months')::INTERVAL AND status NOT IN ('cancelled','no_show')
    GROUP BY month ORDER BY month ASC
  `, [`${months}`]);

  // Serviços mais realizados (mês atual)
  const { rows: topServices } = await db.query(`
    SELECT s.name, COUNT(a.id) AS count, COALESCE(SUM(a.value),0) AS revenue
    FROM appointments a JOIN services s ON s.id = a.service_id
    WHERE a.status = 'completed'
      AND a.date BETWEEN $1 AND $2
    GROUP BY s.id, s.name
    ORDER BY count DESC LIMIT 6
  `, [monthStart(), monthEnd()]);

  // Clientes novos vs recorrentes (evolução mensal, 6 meses)
  const { rows: newCustomersByMonth } = await db.query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_customers
    FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY month ORDER BY month ASC
  `);

  const { rows: recurringByMonth } = await db.query(`
    SELECT month, COUNT(*) AS recurring_clients FROM (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, customer_id FROM appointments
      WHERE status = 'completed' AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM'), customer_id HAVING COUNT(*) >= 2
    ) AS sub GROUP BY month ORDER BY month ASC
  `);

  // Distribuição de status hoje
  const { rows: statusToday } = await db.query(`
    SELECT status, COUNT(*) AS count FROM appointments WHERE date = $1
    GROUP BY status
  `, [todayStr()]);

  return ok(res, { monthly, topServices, newCustomersByMonth, recurringByMonth, statusToday });
});

// GET /api/dashboard/notifications
router.get('/notifications', async (req, res) => {
  const { rows: unreadRows } = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE "read" = 0');
  const unread = Number(unreadRows[0].n);
  const { rows: list } = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20');
  return ok(res, { unread, notifications: list });
});

// PATCH /api/dashboard/notifications/:id/read
router.patch('/notifications/:id/read', async (req, res) => {
  await db.query('UPDATE notifications SET "read" = 1 WHERE id = $1', [req.params.id]);
  return ok(res, { ok: true });
});

// PATCH /api/dashboard/notifications/read-all
router.patch('/notifications/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET "read" = 1 WHERE "read" = 0');
  return ok(res, { ok: true });
});

export default router;