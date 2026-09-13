/**
 * Clientes — CRUD completo com histórico e estatísticas.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed') AS completed_visits
  FROM customers c
`;

// GET /api/customers?search=&sort=
router.get('/', async (req, res) => {
  const { search } = req.query;
  let sql = SELECT;
  const params = [];
  let paramIndex = 1;
  if (search) {
    sql += ` WHERE c.name LIKE $${paramIndex++} OR c.whatsapp LIKE $${paramIndex++} OR c.email LIKE $${paramIndex++}`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY c.created_at DESC';
  const { rows } = await db.query(sql, params);
  return ok(res, { customers: rows });
});

// GET /api/customers/:id (com histórico de agendamentos)
router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  const customer = rows[0];
  if (!customer) return fail(res, 'Cliente não encontrado.', 404);

  const { rows: history } = await db.query(`
    SELECT a.*, s.name AS service_name, b.name AS barber_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    LEFT JOIN barbers b ON b.id = a.barber_id
    WHERE a.customer_id = $1
    ORDER BY a.date DESC, a.start_time DESC
    LIMIT 100
  `, [customer.id]);

  return ok(res, { customer, history });
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, whatsapp, email, notes } = req.body || {};
  if (!name || name.trim().length < 2) return fail(res, 'Informe o nome do cliente.');

  if (whatsapp) {
    const { rows: existsRows } = await db.query('SELECT id FROM customers WHERE whatsapp = $1', [String(whatsapp).replace(/\D/g, '')]);
    if (existsRows.length) return fail(res, 'Já existe um cliente com este WhatsApp.');
  }

  const { rows } = await db.query(`
    INSERT INTO customers (name, whatsapp, email, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [
    String(name).trim(),
    whatsapp ? String(whatsapp).replace(/\D/g, '') : null,
    email || null, notes || null
  ]);
  const customer = rows[0];
  return ok(res, { customer });
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  const customer = existingRows[0];
  if (!customer) return fail(res, 'Cliente não encontrado.', 404);

  const { name, whatsapp, email, notes } = req.body || {};
  if (whatsapp) {
    const { rows: dupRows } = await db.query(
      'SELECT id FROM customers WHERE whatsapp = $1 AND id != $2',
      [String(whatsapp).replace(/\D/g, ''), customer.id]
    );
    if (dupRows.length) return fail(res, 'Já existe outro cliente com este WhatsApp.');
  }

  await db.query(`
    UPDATE customers SET name = $1, whatsapp = $2, email = $3, notes = $4,
      updated_at = NOW() WHERE id = $5
  `, [
    name !== undefined ? String(name).trim() : customer.name,
    whatsapp !== undefined ? (whatsapp ? String(whatsapp).replace(/\D/g, '') : customer.whatsapp) : customer.whatsapp,
    email !== undefined ? email : customer.email,
    notes !== undefined ? notes : customer.notes,
    customer.id
  ]);
  const { rows: updatedRows } = await db.query('SELECT * FROM customers WHERE id = $1', [customer.id]);
  return ok(res, { customer: updatedRows[0] });
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  const customer = rows[0];
  if (!customer) return fail(res, 'Cliente não encontrado.', 404);
  const { rows: apptRows } = await db.query('SELECT COUNT(*) AS n FROM appointments WHERE customer_id = $1', [customer.id]);
  const hasAppts = Number(apptRows[0].n);
  if (hasAppts) return fail(res, 'Cliente possui agendamentos. Não é possível excluir.', 409);
  await db.query('DELETE FROM customers WHERE id = $1', [customer.id]);
  return ok(res, { deleted: true });
});

export default router;