/**
 * Serviços — CRUD completo. Preços/duração sempre vindos do banco.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, slugify } from '../utils.js';
import { invalidateAvailabilityCache } from '../availabilityCache.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT s.*, (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id AND a.status = 'completed') AS completed_count
  FROM services s
`;

// GET /api/services
router.get('/', async (req, res) => {
  const { status } = req.query;
  let sql = SELECT;
  const params = [];
  let paramIndex = 1;
  if (status) { sql += ` WHERE s.status = $${paramIndex++}`; params.push(status); }
  sql += ' ORDER BY s.position ASC, s.name ASC';
  const { rows } = await db.query(sql, params);
  return ok(res, { services: rows });
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
  const svc = rows[0];
  if (!svc) return fail(res, 'Serviço não encontrado.', 404);
  return ok(res, { service: svc });
});

// POST /api/services
router.post('/', async (req, res) => {
  const { name, description, price, duration_minutes, photo, status, position } = req.body || {};
  if (!name || name.trim().length < 2) return fail(res, 'Informe o nome do serviço.');
  const priceNum = Number(price);
  const durNum = Number(duration_minutes);
  if (!(priceNum >= 0)) return fail(res, 'Preço inválido.');
  if (!(durNum > 0)) return fail(res, 'Duração inválida.');

  const pos = position ?? (await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM services')).rows[0].p;
  const { rows } = await db.query(`
    INSERT INTO services (name, description, price, duration_minutes, photo, status, position)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    String(name).trim(), description || null, priceNum, durNum,
    photo || null, status || 'active', pos
  ]);
  const svc = rows[0];
  invalidateAvailabilityCache();
  return ok(res, { service: svc });
});

// PUT /api/services/:id
router.put('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
  const svc = rows[0];
  if (!svc) return fail(res, 'Serviço não encontrado.', 404);

  const { name, description, price, duration_minutes, photo, status, position } = req.body || {};
  const priceNum = price !== undefined ? Number(price) : svc.price;
  const durNum = duration_minutes !== undefined ? Number(duration_minutes) : svc.duration_minutes;
  if (!(priceNum >= 0)) return fail(res, 'Preço inválido.');
  if (!(durNum > 0)) return fail(res, 'Duração inválida.');

  await db.query(`
    UPDATE services SET name = $1, description = $2, price = $3, duration_minutes = $4,
      photo = $5, status = $6, position = $7, updated_at = NOW() WHERE id = $8
  `, [
    name !== undefined ? String(name).trim() : svc.name,
    description !== undefined ? description : svc.description,
    priceNum, durNum,
    photo !== undefined ? photo : svc.photo,
    status !== undefined ? status : svc.status,
    position !== undefined ? position : svc.position,
    svc.id
  ]);
  // Duração/status do serviço afeta a grade -> invalidar disponibilidade
  invalidateAvailabilityCache();
  const { rows: updatedRows } = await db.query('SELECT * FROM services WHERE id = $1', [svc.id]);
  return ok(res, { service: updatedRows[0] });
});

// DELETE /api/services/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
  const svc = rows[0];
  if (!svc) return fail(res, 'Serviço não encontrado.', 404);
  const { rows: usedRows } = await db.query('SELECT COUNT(*) AS n FROM appointments WHERE service_id = $1', [svc.id]);
  const used = Number(usedRows[0].n);
  if (used > 0) return fail(res, 'Este serviço possui agendamentos. Desative em vez de excluir.', 409);
  await db.query('DELETE FROM services WHERE id = $1', [svc.id]);
  invalidateAvailabilityCache();
  return ok(res, { deleted: true });
});

export default router;