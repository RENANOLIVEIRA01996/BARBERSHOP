/**
 * Avaliações — visualização para admin, aprovação, ocultação.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/reviews?status=pending|approved|hidden
router.get('/', async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT r.*, s.name AS service_name
             FROM reviews r
             LEFT JOIN appointments a ON a.id = r.appointment_id
             LEFT JOIN services s ON s.id = a.service_id`;
  const params = [];
  let paramIndex = 1;
  if (status) { sql += ` WHERE r.status = $${paramIndex++}`; params.push(status); }
  sql += ' ORDER BY r.created_at DESC';
  const { rows } = await db.query(sql, params);
  return ok(res, { reviews: rows });
});

// PATCH /api/reviews/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'hidden'].includes(status)) return fail(res, 'Status inválido.');
  const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
  const review = rows[0];
  if (!review) return fail(res, 'Avaliação não encontrada.', 404);
  const { rows: updatedRows } = await db.query('UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *', [status, review.id]);
  return ok(res, { review: updatedRows[0] });
});

// DELETE /api/reviews/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
  const review = rows[0];
  if (!review) return fail(res, 'Avaliação não encontrada.', 404);
  await db.query('DELETE FROM reviews WHERE id = $1', [review.id]);
  return ok(res, { deleted: true });
});

export default router;