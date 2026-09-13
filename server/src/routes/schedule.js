/**
 * Bloqueios de horário + feriados/folgas/férias.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, timeToMin, minToTime } from '../utils.js';
import { invalidateAvailabilityCache } from '../availabilityCache.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// ============ BLOQUEIOS ============

// GET /api/blocked?from=&to=&all=1
router.get('/blocked', async (req, res) => {
  const { from, to, all } = req.query;
  let sql = 'SELECT * FROM blocked_times';
  const params = [];
  const conds = [];
  let paramIndex = 1;
  if (from) { conds.push(`date >= $${paramIndex++}`); params.push(from); }
  if (to) { conds.push(`date <= $${paramIndex++}`); params.push(to); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY date DESC, start_time ASC';
  let { rows } = await db.query(sql, params);
  if (all === '1') {
    const { rows: allRows } = await db.query('SELECT * FROM blocked_times ORDER BY date DESC');
    rows = allRows;
  }
  return ok(res, { blocked: rows });
});

// POST /api/blocked
router.post('/blocked', async (req, res) => {
  const { title, date, start_time, end_time, all_day, is_recurring, reason } = req.body || {};
  if (!date) return fail(res, 'Informe a data.');
  if (!all_day && !start_time) return fail(res, 'Informe o horário de início.');

  const { rows } = await db.query(`
    INSERT INTO blocked_times (title, date, start_time, end_time, all_day, is_recurring, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    title || 'Horário bloqueado', date,
    all_day ? null : start_time,
    all_day ? null : (end_time || minToTime(timeToMin(start_time) + 60)),
    all_day ? 1 : 0, is_recurring ? 1 : 0, reason || null
  ]);
  invalidateAvailabilityCache();
  return ok(res, { blocked: rows[0] });
});

// PUT /api/blocked/:id
router.put('/blocked/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blocked_times WHERE id = $1', [req.params.id]);
  const item = rows[0];
  if (!item) return fail(res, 'Registro não encontrado.', 404);
  const { title, date, start_time, end_time, all_day, is_recurring, reason } = req.body || {};
  const { rows: updatedRows } = await db.query(`
    UPDATE blocked_times SET title = $1, date = $2, start_time = $3, end_time = $4,
      all_day = $5, is_recurring = $6, reason = $7 WHERE id = $8
    RETURNING *
  `, [
    title || item.title,
    date || item.date,
    all_day !== undefined && all_day ? null : (start_time ?? item.start_time),
    all_day !== undefined && all_day ? null : (end_time ?? item.end_time),
    all_day !== undefined ? (all_day ? 1 : 0) : item.all_day,
    is_recurring !== undefined ? (is_recurring ? 1 : 0) : item.is_recurring,
    reason !== undefined ? reason : item.reason,
    item.id
  ]);
  invalidateAvailabilityCache();
  return ok(res, { blocked: updatedRows[0] });
});

// DELETE /api/blocked/:id
router.delete('/blocked/:id', async (req, res) => {
  await db.query('DELETE FROM blocked_times WHERE id = $1', [req.params.id]);
  invalidateAvailabilityCache();
  return ok(res, { deleted: true });
});

// ============ FERIADOS / FOLGAS / FÉRIAS ============

// GET /api/holidays?from=&to=
router.get('/holidays', async (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT * FROM holidays';
  const params = [];
  const conds = [];
  let paramIndex = 1;
  if (from) { conds.push(`date >= $${paramIndex++}`); params.push(from); }
  if (to) { conds.push(`date <= $${paramIndex++}`); params.push(to); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY date DESC';
  const { rows } = await db.query(sql, params);
  return ok(res, { holidays: rows });
});

// POST /api/holidays
router.post('/holidays', async (req, res) => {
  const { title, date, type, recurring } = req.body || {};
  if (!title || !date) return fail(res, 'Informe título e data.');
  const { rows: existsRows } = await db.query('SELECT id FROM holidays WHERE title = $1 AND date = $2', [title, date]);
  if (existsRows.length) return fail(res, 'Este feriado/folga já existe.');
  const { rows } = await db.query(`
    INSERT INTO holidays (title, date, type, recurring) VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [title, date, type || 'holiday', recurring ? 1 : 0]);
  invalidateAvailabilityCache();
  return ok(res, { holiday: rows[0] });
});

// PUT /api/holidays/:id
router.put('/holidays/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM holidays WHERE id = $1', [req.params.id]);
  const item = rows[0];
  if (!item) return fail(res, 'Registro não encontrado.', 404);
  const { title, date, type, recurring } = req.body || {};
  const { rows: updatedRows } = await db.query(`
    UPDATE holidays SET title = $1, date = $2, type = $3, recurring = $4 WHERE id = $5
    RETURNING *
  `, [title || item.title, date || item.date, type || item.type, recurring !== undefined ? (recurring ? 1 : 0) : item.recurring, item.id]);
  invalidateAvailabilityCache();
  return ok(res, { holiday: updatedRows[0] });
});

// DELETE /api/holidays/:id
router.delete('/holidays/:id', async (req, res) => {
  await db.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
  invalidateAvailabilityCache();
  return ok(res, { deleted: true });
});

export default router;