/**
 * Horários de funcionamento da barbearia + horários por barbeiro.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// GET /api/hours — horários da barbearia
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM business_hours ORDER BY day_of_week');
  return ok(res, { hours: rows });
});

// PUT /api/hours — salvar semana inteira
router.put('/', async (req, res) => {
  const hours = Array.isArray(req.body?.hours) ? req.body.hours : [];
  for (const h of hours) {
    await db.query(`
      INSERT INTO business_hours (day_of_week, open_time, close_time, active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(day_of_week) DO UPDATE SET open_time = excluded.open_time,
        close_time = excluded.close_time, active = excluded.active
    `, [
      Number(h.day_of_week),
      h.open_time || null,
      h.close_time || null,
      h.active ? 1 : 0
    ]);
  }
  const { rows } = await db.query('SELECT * FROM business_hours ORDER BY day_of_week');
  return ok(res, { hours: rows });
});

// GET /api/hours/barber/:barberId
router.get('/barber/:barberId', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM barber_hours WHERE barber_id = $1 ORDER BY day_of_week', [req.params.barberId]);
  return ok(res, { hours: rows });
});

// PUT /api/hours/barber/:barberId
router.put('/barber/:barberId', async (req, res) => {
  const barberId = Number(req.params.barberId);
  const { rows: barberRows } = await db.query('SELECT id FROM barbers WHERE id = $1', [barberId]);
  if (!barberRows.length) return fail(res, 'Barbeiro não encontrado.', 404);
  const hours = Array.isArray(req.body?.hours) ? req.body.hours : [];
  await db.query('DELETE FROM barber_hours WHERE barber_id = $1', [barberId]);
  for (const h of hours) {
    await db.query(`
      INSERT INTO barber_hours (barber_id, day_of_week, open_time, close_time, active)
      VALUES ($1, $2, $3, $4, $5)
    `, [barberId, Number(h.day_of_week), h.open_time || null, h.close_time || null, h.active ? 1 : 0]);
  }
  const { rows } = await db.query('SELECT * FROM barber_hours WHERE barber_id = $1 ORDER BY day_of_week', [barberId]);
  return ok(res, { hours: rows });
});

export { WEEKDAYS };
export default router;