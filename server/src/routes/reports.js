/**
 * Relatórios — faturamento, serviços, clientes, barbeiros.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, toYMD } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

function periodDefaults(req) {
  const { from, to } = req.query;
  const f = from || toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const t = to || toYMD(new Date());
  return { from: f, to: t };
}

// GET /api/reports/revenue?from=&to=&group=day|week|month
router.get('/revenue', async (req, res) => {
  const { from, to } = periodDefaults(req);
  const group = req.query.group || 'day';
  let groupSql = 'a.date::TEXT';
  if (group === 'week') groupSql = "TO_CHAR(a.date, 'IYYY-\"W\"IW')";
  if (group === 'month') groupSql = "TO_CHAR(a.date, 'YYYY-MM')";

  const { rows: series } = await db.query(`
    SELECT ${groupSql} AS bucket, COALESCE(SUM(a.value), 0) AS total, COUNT(*) AS count,
           COALESCE(SUM(CASE WHEN a.payment_method = 'pix' THEN a.value ELSE 0 END), 0) AS pix,
           COALESCE(SUM(CASE WHEN a.payment_method = 'dinheiro' THEN a.value ELSE 0 END), 0) AS dinheiro,
           COALESCE(SUM(CASE WHEN a.payment_method = 'debito' THEN a.value ELSE 0 END), 0) AS debito,
           COALESCE(SUM(CASE WHEN a.payment_method = 'credito' THEN a.value ELSE 0 END), 0) AS credito
    FROM appointments a
    WHERE a.status = 'completed' AND a.date BETWEEN $1::date AND $2::date
    GROUP BY bucket ORDER BY bucket ASC
  `, [from, to]);

  return ok(res, { serie: series, from, to });
});

// GET /api/reports/services?from=&to=
router.get('/services', async (req, res) => {
  const { from, to } = periodDefaults(req);
  const { rows } = await db.query(`
    SELECT s.id, s.name, s.price, s.duration_minutes,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS sold,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.value ELSE 0 END), 0) AS revenue
    FROM services s
    LEFT JOIN appointments a ON a.service_id = s.id AND a.date BETWEEN $1::date AND $2::date
    GROUP BY s.id, s.name, s.price, s.duration_minutes
    ORDER BY sold DESC, revenue DESC
  `, [from, to]);
  return ok(res, { services: rows, from, to });
});

// GET /api/reports/customers?from=&to=
router.get('/customers', async (req, res) => {
  const { from, to } = periodDefaults(req);
  // Novos clientes: criados no período
  const { rows: newRows } = await db.query(
    'SELECT COUNT(*) AS count FROM customers WHERE created_at::date BETWEEN $1::date AND $2::date',
    [from, to]
  );
  const newCustomers = Number(newRows[0].count);

  // Recorrentes: concluíram @com >=2 no período
  const { rows: recurringRows } = await db.query(`
    SELECT COUNT(*) AS count FROM (
      SELECT customer_id FROM appointments
      WHERE status = 'completed' AND date BETWEEN $1::date AND $2::date
      GROUP BY customer_id HAVING COUNT(*) >= 2
    ) AS t
  `, [from, to]);
  const recurring = Number(recurringRows[0].count);

  // Inativos: clientes sem agendamento concluído nos últimos 30 dias
  const inactiveFrom = toYMD(new Date(new Date().getTime() - 30 * 86400000));
  const { rows: activeRows } = await db.query(
    "SELECT customer_id FROM appointments WHERE status = 'completed' AND date >= $1::date",
    [inactiveFrom]
  );
  const activeCustomers = new Set(activeRows.map(r => r.customer_id));
  const { rows: allRows } = await db.query('SELECT id FROM customers');
  const allCustomers = allRows.map(r => r.id);
  const inactive = allCustomers.filter(id => !activeCustomers.has(id)).length;

  return ok(res, { newCustomers, recurring, inactive, inactiveFrom });
});

// GET /api/reports/barbers?from=&to=
router.get('/barbers', async (req, res) => {
  const { from, to } = periodDefaults(req);
  const { rows } = await db.query(`
    SELECT b.id, b.name, b.photo,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed,
           COUNT(a.id) AS total,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.value ELSE 0 END), 0) AS revenue
    FROM barbers b
    LEFT JOIN appointments a ON a.barber_id = b.id AND a.date BETWEEN $1::date AND $2::date
    GROUP BY b.id, b.name, b.photo
    ORDER BY revenue DESC
  `, [from, to]);
  return ok(res, { barbers: rows, from, to });
});

// GET /api/reports/reviews/rating — distribuição de notas
router.get('/reviews/rating', async (req, res) => {
  const { rows } = await db.query(`
    SELECT rating, COUNT(*) AS count FROM reviews
    WHERE status = 'approved' GROUP BY rating ORDER BY rating DESC
  `);
  return ok(res, { ratings: rows });
});

export default router;