/**
 * Barbeiros — CRUD completo + horários por barbeiro.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, slugify } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const SELECT = 'SELECT * FROM barbers';

// GET /api/barbers
router.get('/', async (req, res) => {
  const { status } = req.query;
  let sql = SELECT;
  const params = [];
  let paramIndex = 1;
  if (status) { sql += ` WHERE status = $${paramIndex++}`; params.push(status); }
  sql += ' ORDER BY position ASC, name ASC';
  const { rows } = await db.query(sql, params);
  for (const b of rows) b.specialties = safeJson(b.specialties, []);
  return ok(res, { barbers: rows });
});

// GET /api/barbers/:id (com horários semanais)
router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM barbers WHERE id = $1', [req.params.id]);
  const barber = rows[0];
  if (!barber) return fail(res, 'Barbeiro não encontrado.', 404);
  barber.specialties = safeJson(barber.specialties, []);
  const { rows: hours } = await db.query('SELECT * FROM barber_hours WHERE barber_id = $1', [barber.id]);
  barber.hours = hours;
  return ok(res, { barber });
});

// POST /api/barbers
router.post('/', async (req, res) => {
  const { name, photo, description, phone, whatsapp, specialties, status } = req.body || {};
  if (!name || name.trim().length < 2) return fail(res, 'Informe o nome do barbeiro.');
  const { rows: posRows } = await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM barbers');
  const pos = posRows[0].p;
  const { rows } = await db.query(`
    INSERT INTO barbers (name, slug, photo, description, phone, whatsapp, specialties, status, position)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    String(name).trim(), slugify(name), photo || null, description || null,
    phone || null, whatsapp || null, JSON.stringify(specialties || []),
    status || 'active', pos
  ]);
  const barber = rows[0];
  barber.specialties = safeJson(barber.specialties, []);
  return ok(res, { barber });
});

// PUT /api/barbers/:id
router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM barbers WHERE id = $1', [req.params.id]);
  const barber = existingRows[0];
  if (!barber) return fail(res, 'Barbeiro não encontrado.', 404);

  const { name, photo, description, phone, whatsapp, specialties, status, position } = req.body || {};
  await db.query(`
    UPDATE barbers SET name = $1, slug = $2, photo = $3, description = $4, phone = $5,
      whatsapp = $6, specialties = $7, status = $8, position = $9,
      updated_at = NOW() WHERE id = $10
  `, [
    name !== undefined ? String(name).trim() : barber.name,
    name !== undefined ? slugify(name) : barber.slug,
    photo !== undefined ? photo : barber.photo,
    description !== undefined ? description : barber.description,
    phone !== undefined ? phone : barber.phone,
    whatsapp !== undefined ? whatsapp : barber.whatsapp,
    JSON.stringify(specialties !== undefined ? specialties : safeJson(barber.specialties, [])),
    status !== undefined ? status : barber.status,
    position !== undefined ? position : barber.position,
    barber.id
  ]);
  const { rows: updatedRows } = await db.query('SELECT * FROM barbers WHERE id = $1', [barber.id]);
  const updated = updatedRows[0];
  updated.specialties = safeJson(updated.specialties, []);
  return ok(res, { barber: updated });
});

// DELETE /api/barbers/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM barbers WHERE id = $1', [req.params.id]);
  const barber = rows[0];
  if (!barber) return fail(res, 'Barbeiro não encontrado.', 404);
  const { rows: usedRows } = await db.query('SELECT COUNT(*) AS n FROM appointments WHERE barber_id = $1', [barber.id]);
  const used = Number(usedRows[0].n);
  if (used > 0) return fail(res, 'Este barbeiro possui agendamentos. Desative em vez de excluir.', 409);
  await db.query('DELETE FROM barbers WHERE id = $1', [barber.id]);
  return ok(res, { deleted: true });
});

// PUT /api/barbers/:id/hours — horários semanais do barbeiro
router.put('/:id/hours', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM barbers WHERE id = $1', [req.params.id]);
  const barber = existingRows[0];
  if (!barber) return fail(res, 'Barbeiro não encontrado.', 404);
  const hours = Array.isArray(req.body?.hours) ? req.body.hours : [];
  await db.query('DELETE FROM barber_hours WHERE barber_id = $1', [barber.id]);
  for (const h of hours) {
    await db.query(`
      INSERT INTO barber_hours (barber_id, day_of_week, open_time, close_time, active)
      VALUES ($1, $2, $3, $4, $5)
    `, [barber.id, h.day_of_week, h.open_time || null, h.close_time || null, h.active ? 1 : 0]);
  }
  const { rows: finalHours } = await db.query('SELECT * FROM barber_hours WHERE barber_id = $1', [barber.id]);
  return ok(res, { hours: finalHours });
});

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export default router;