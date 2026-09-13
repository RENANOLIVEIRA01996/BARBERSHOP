/**
 * Portfólio de cortes — CRUD + publicação/ocultação.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT p.*, s.name AS service_name, b.name AS barber_name
  FROM portfolio p
  LEFT JOIN services s ON s.id = p.service_id
  LEFT JOIN barbers b ON b.id = p.barber_id
`;

// GET /api/portfolio
router.get('/', async (req, res) => {
  const { published } = req.query;
  let sql = SELECT;
  const params = [];
  let paramIndex = 1;
  if (published !== undefined) { sql += ` WHERE p.published = $${paramIndex++}`; params.push(published === 'true' ? 1 : 0); }
  sql += ' ORDER BY p.position ASC, p.created_at DESC';
  const { rows } = await db.query(sql, params);
  return ok(res, { items: rows });
});

// POST /api/portfolio
router.post('/', async (req, res) => {
  const { image, title, description, service_id, barber_id, portfolio_date, published, position } = req.body || {};
  if (!image) return fail(res, 'Envie a imagem do corte.');
  const pos = position ?? (await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM portfolio')).rows[0].p;
  const { rows } = await db.query(`
    INSERT INTO portfolio (image, title, description, service_id, barber_id, portfolio_date, published, position)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [image, title || null, description || null, service_id || null, barber_id || null, portfolio_date || null, published === false ? 0 : 1, pos]);
  const { rows: itemRows } = await db.query(`${SELECT} WHERE p.id = $1`, [rows[0].id]);
  return ok(res, { item: itemRows[0] });
});

// PUT /api/portfolio/:id
router.put('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM portfolio WHERE id = $1', [req.params.id]);
  const item = rows[0];
  if (!item) return fail(res, 'Item não encontrado.', 404);
  const { image, title, description, service_id, barber_id, portfolio_date, published, position } = req.body || {};
  await db.query(`
    UPDATE portfolio SET image = $1, title = $2, description = $3, service_id = $4, barber_id = $5,
      portfolio_date = $6, published = $7, position = $8 WHERE id = $9
  `, [
    image || item.image, title !== undefined ? title : item.title,
    description !== undefined ? description : item.description,
    service_id !== undefined ? service_id : item.service_id,
    barber_id !== undefined ? barber_id : item.barber_id,
    portfolio_date !== undefined ? portfolio_date : item.portfolio_date,
    published !== undefined ? (published ? 1 : 0) : item.published,
    position !== undefined ? position : item.position,
    item.id
  ]);
  const { rows: itemRows } = await db.query(`${SELECT} WHERE p.id = $1`, [item.id]);
  return ok(res, { item: itemRows[0] });
});

// PATCH /api/portfolio/:id/publish — publicar/ocultar
router.patch('/:id/publish', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM portfolio WHERE id = $1', [req.params.id]);
  const item = rows[0];
  if (!item) return fail(res, 'Item não encontrado.', 404);
  const published = req.body?.published ? 1 : 0;
  await db.query('UPDATE portfolio SET published = $1 WHERE id = $2', [published, item.id]);
  return ok(res, { published: !!published });
});

// DELETE /api/portfolio/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM portfolio WHERE id = $1', [req.params.id]);
  const item = rows[0];
  if (!item) return fail(res, 'Item não encontrado.', 404);
  await db.query('DELETE FROM portfolio WHERE id = $1', [item.id]);
  return ok(res, { deleted: true });
});

export default router;