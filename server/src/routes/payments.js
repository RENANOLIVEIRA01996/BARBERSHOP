/**
 * Financeiro — pagamentos e faturamento por período.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/payments?from=&to=&method=
router.get('/payments', async (req, res) => {
  const { from, to, method, status } = req.query;
  let sql = `SELECT p.*, a.date AS appt_date, a.code AS appt_code,
                    c.name AS customer_name, s.name AS service_name
             FROM payments p
             JOIN appointments a ON a.id = p.appointment_id
             JOIN customers c ON c.id = a.customer_id
             JOIN services s ON s.id = a.service_id`;
  const params = [];
  const conds = [];
  if (from) { conds.push('a.date >= $' + (conds.length + 1)); params.push(from); }
  if (to) { conds.push('a.date <= $' + (conds.length + 1)); params.push(to); }
  if (method) { conds.push('p.method = $' + (conds.length + 1)); params.push(method); }
  if (status) { conds.push('p.status = $' + (conds.length + 1)); params.push(status); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY a.date DESC, a.start_time DESC';
  const { rows } = await db.query(sql, params);
  return ok(res, { payments: rows });
});

// POST /api/payments — registrar pagamento de um agendamento
router.post('/payments', async (req, res) => {
  const { appointment_id, method, value, status } = req.body || {};
  const apptResult = await db.query('SELECT * FROM appointments WHERE id = $1', [appointment_id]);
  if (apptResult.rows.length === 0) return fail(res, 'Agendamento não encontrado.', 404);
  const appt = apptResult.rows[0];
  const existsResult = await db.query('SELECT id FROM payments WHERE appointment_id = $1', [appointment_id]);
  if (existsResult.rows.length > 0) return fail(res, 'Este agendamento já possui pagamento registrado.', 409);

  const valueToUse = value ?? appt.value;
  const insertResult = await db.query(`
    INSERT INTO payments (appointment_id, method, value, status, date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [appointment_id, method || 'pix', Number(valueToUse), status || 'pending', appt.date]);

  const paymentId = insertResult.rows[0].id;
  const paymentResult = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  const payment = paymentResult.rows[0];
  return ok(res, { payment });
});

// PUT /api/payments/:id
router.put('/payments/:id', async (req, res) => {
  const paymentResult = await db.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
  if (paymentResult.rows.length === 0) return fail(res, 'Pagamento não encontrado.', 404);
  const payment = paymentResult.rows[0];
  const { method, value, status } = req.body || {};
  await db.query(
    'UPDATE payments SET method = $1, value = $2, status = $3 WHERE id = $4',
    [method || payment.method, value !== undefined ? Number(value) : payment.value, status || payment.status, payment.id]
  );
  const updatedResult = await db.query('SELECT * FROM payments WHERE id = $1', [payment.id]);
  const updatedPayment = updatedResult.rows[0];
  return ok(res, { payment: updatedPayment });
});

// GET /api/financial/summary?from=&to=
router.get('/financial/summary', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  const conds = ["a.status = 'completed'"];
  if (from) { conds.push('a.date >= $' + (conds.length + 1)); params.push(from); }
  if (to) { conds.push('a.date <= $' + (conds.length + 1)); params.push(to); }

  const revenueResult = await db.query(`
    SELECT COALESCE(SUM(a.value), 0) AS total, COUNT(*) AS count
    FROM appointments a WHERE ${conds.join(' AND ')}
  `, params);
  const revenue = revenueResult.rows[0];

  const byMethodResult = await db.query(`
    SELECT p.method, COALESCE(SUM(p.value), 0) AS total, COUNT(*) AS count
    FROM payments p JOIN appointments a ON a.id = p.appointment_id
    WHERE ${conds.join(' AND ')}
    GROUP BY p.method ORDER BY total DESC
  `, params);
  const byMethod = byMethodResult.rows;

  const byDayResult = await db.query(`
    SELECT a.date, COALESCE(SUM(a.value), 0) AS total, COUNT(*) AS count
    FROM appointments a
    WHERE ${conds.join(' AND ')}
    GROUP BY a.date ORDER BY a.date ASC
  `, params);
  const byDay = byDayResult.rows;

  return ok(res, {
    total: revenue.total,
    count: revenue.count,
    byMethod,
    byDay,
  });
});

export default router;