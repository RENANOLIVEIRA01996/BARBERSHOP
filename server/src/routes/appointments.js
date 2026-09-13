/**
 * HENRIQUE BARBER — Agendamentos (CRUD completo).
 * Proteção contra conflito de horário feita no backend/banco
 * (transação + índice único).
 */
import express from 'express';
import { db, runTransaction } from '../db.js';
import {
  ok,
  fail,
  genCode,
  timeToMin,
  minToTime,
  getWorkingWindow,
  getBlocksFor,
  getBookedSlots,
} from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// JOIN padrão para consulta de agendamentos com dados relacionados
const JOIN = `
  SELECT
    a.*,
    c.name                   AS customer_name,
    c.whatsapp               AS customer_whatsapp,
    c.email                  AS customer_email,
    s.name                   AS service_name,
    s.duration_minutes       AS service_duration,
    b.name                   AS barber_name
  FROM appointments a
  JOIN customers c  ON c.id  = a.customer_id
  JOIN services  s  ON s.id  = a.service_id
  LEFT JOIN barbers b ON b.id = a.barber_id
`;

// GET /api/appointments?date=YYYY-MM-DD&from=&to=&status=&barber_id=
router.get('/', async (req, res) => {
  const { date, from, to, status, barber_id } = req.query;
  const sqlParts = [];
  const values = [];
  let paramIndex = 1;

  if (date) { sqlParts.push(`a.date = $${paramIndex++}`); values.push(date); }
  if (from) { sqlParts.push(`a.date >= $${paramIndex++}`); values.push(from); }
  if (to) { sqlParts.push(`a.date <= $${paramIndex++}`); values.push(to); }
  if (status) { sqlParts.push(`a.status = $${paramIndex++}`); values.push(status); }
  if (barber_id) { sqlParts.push(`a.barber_id = $${paramIndex++}`); values.push(Number(barber_id)); }

  const where = sqlParts.length ? 'WHERE ' + sqlParts.join(' AND ') : '';
  const queryText = `${JOIN} ${where} ORDER BY a.date ASC, a.start_time ASC`;
  const { rows } = await db.query(queryText, values);
  return ok(res, { appointments: rows });
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`${JOIN} WHERE a.id = $1`, [req.params.id]);
  const appt = rows[0];
  if (!appt) return fail(res, 'Agendamento não encontrado.', 404);
  return ok(res, { appointment: appt });
});

// POST /api/appointments — criar (via painel)
router.post('/', async (req, res) => {
  const { customer_id, service_id, barber_id, date, start_time, value, payment_method, notes, status } = req.body || {};

  // Validações básicas
  if (!customer_id || !service_id || !date || !start_time) {
    return fail(res, 'Cliente, serviço, data e horário são obrigatórios.');
  }

  const result = await createAppointment({
    customer_id: Number(customer_id),
    service_id: Number(service_id),
    barber_id: barber_id ? Number(barber_id) : null,
    date,
    start_time,
    value,
    payment_method,
    notes,
    status: status || 'scheduled'
  });

  if (result.error) {
    return fail(res, result.error, result.status || 409);
  }

  const { rows } = await db.query(`${JOIN} WHERE a.id = $1`, [result.id]);
  const full = rows[0];
  return ok(res, { appointment: full });
});
// PUT /api/appointments/:id — editar / remarcar (protege conflito)
router.put('/:id', async (req, res) => {
  const existingResult = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (existingResult.rowCount === 0) return fail(res, 'Agendamento não encontrado.', 404);
  const existing = existingResult.rows[0];

  const {
    date = existing.date,
    start_time = existing.start_time,
    service_id = existing.service_id,
    barber_id = req.body.barber_id === null ? null : (req.body.barber_id ?? existing.barber_id),
    value = existing.value,
    payment_method = existing.payment_method,
    notes = existing.notes,
    status = existing.status
  } = req.body;

  // Se for alterar data, horário, serviço ou barbeiro, verificar conflito
  const needsConflictCheck =
    date !== existing.date ||
    start_time !== existing.start_time ||
    Number(service_id) !== existing.service_id ||
    (barber_id ?? null) !== (existing.barber_id ?? null);

  if (needsConflictCheck) {
    const svcResult = await db.query('SELECT * FROM services WHERE id = $1', [Number(service_id)]);
    if (svcResult.rowCount === 0) return fail(res, 'Serviço inválido.', 400);
    const svc = svcResult.rows[0];

    const end_time = minToTime(timeToMin(start_time) + svc.duration_minutes);
    const conflictCheck = await isSlotFree(date, start_time, end_time, Number(barber_id) ?? null, Number(req.params.id));
    if (!conflictCheck.available) {
      return fail(res, conflictCheck.error || 'Este horário não está mais disponível.', 409);
    }
  }

  await runTransaction(async () => {
    const result = await db.query(`
      UPDATE appointments SET
        date = $1, start_time = $2, service_id = $3, barber_id = $4, value = $5,
        payment_method = $6, notes = $7, status = $8, updated_at = NOW()
      WHERE id = $9
    `, [
      date, start_time, Number(service_id),
      barber_id ?? null, value, payment_method, notes, status, Number(req.params.id)
    ]);

    if (result.rowCount === 0) throw new Error('Falha ao atualizar agendamento');

    // Atualizar pagamento se necessário
    if (payment_method !== undefined && payment_method !== null) {
      const payResult = await db.query('SELECT id FROM payments WHERE appointment_id = $1', [Number(req.params.id)]);
      if (payResult.rowCount > 0) {
        await db.query(
          'UPDATE payments SET method = $1, value = $2, status = $3 WHERE appointment_id = $4',
          [payment_method, value, status === 'completed' ? 'paid' : 'pending', Number(req.params.id)]
        );
      } else if (payment_method) {
        await db.query(`
          INSERT INTO payments (appointment_id, method, value, status, date)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          Number(req.params.id),
          payment_method,
          value,
          status === 'completed' ? 'paid' : 'pending',
          date
        ]);
      }
    }

    // Atualizar estatísticas do cliente se o status for concluído
    if (status === 'completed') {
      await updateCustomerStats(existing.customer_id);
    }
  });

  const updatedResult = await db.query(`${JOIN} WHERE a.id = $1`, [Number(req.params.id)]);
  if (updatedResult.rowCount === 0) return fail(res, 'Falha ao atualizar agendamento.', 500);
  return ok(res, { appointment: updatedResult.rows[0] });
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  const existingResult = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (existingResult.rowCount === 0) return fail(res, 'Agendamento não encontrado.', 404);
  const existing = existingResult.rows[0];

  await runTransaction(async () => {
    await db.query('DELETE FROM payments WHERE appointment_id = $1', [Number(req.params.id)]);
    const result = await db.query('DELETE FROM appointments WHERE id = $1', [Number(req.params.id)]);
    if (result.rowCount === 0) throw new Error('Falha ao excluir agendamento');
    await updateCustomerStats(existing.customer_id);
  });

  return ok(res, { deleted: true, id: Number(req.params.id) });
});

// PATCH /api/appointments/:id/status — mudar apenas o status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return fail(res, 'Status é obrigatório.');

  const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!validStatuses.includes(status)) {
    return fail(res, 'Status inválido.');
  }

  const existingResult = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (existingResult.rowCount === 0) return fail(res, 'Agendamento não encontrado.', 404);
  const existing = existingResult.rows[0];

  await runTransaction(async () => {
    const result = await db.query(
      "UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, Number(req.params.id)]
    );

    if (result.rowCount === 0) throw new Error('Falha ao atualizar status');

    // Se concluído, atualizar estatísticas e pagamento
    if (status === 'completed' && existing.status !== 'completed') {
      await updateCustomerStats(existing.customer_id);
      const payResult = await db.query('SELECT id FROM payments WHERE appointment_id = $1', [Number(req.params.id)]);
      if (payResult.rowCount > 0) {
        await db.query("UPDATE payments SET status = 'paid' WHERE appointment_id = $1", [Number(req.params.id)]);
      }
    }
    // Se estava concluído e agora não está mais, reverter estatísticas
    else if (existing.status === 'completed' && status !== 'completed') {
      await updateCustomerStats(existing.customer_id);
      const payResult = await db.query('SELECT id FROM payments WHERE appointment_id = $1', [Number(req.params.id)]);
      if (payResult.rowCount > 0) {
        await db.query("UPDATE payments SET status = 'pending' WHERE appointment_id = $1", [Number(req.params.id)]);
      }
    }
  });

  const updatedResult = await db.query(`${JOIN} WHERE a.id = $1`, [Number(req.params.id)]);
  if (updatedResult.rowCount === 0) return fail(res, 'Falha ao atualizar agendamento.', 500);
  return ok(res, { appointment: updatedResult.rows[0] });
});
// ---------------------------------------------------------------
// Função de criação usada pelo painel e pela API pública
// ---------------------------------------------------------------
export async function createAppointment(data) {
  const { customer_id, service_id, barber_id, date, start_time, value, payment_method, notes, status } = data;

  // Validações
  const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
  if (customerResult.rowCount === 0) return { error: 'Cliente não encontrado.', status: 400 };

  const serviceResult = await db.query('SELECT * FROM services WHERE id = $1', [service_id]);
  if (serviceResult.rowCount === 0) return { error: 'Serviço não encontrado.', status: 400 };
  const service = serviceResult.rows[0];

  if (barber_id) {
    const barberResult = await db.query('SELECT * FROM barbers WHERE id = $1', [barber_id]);
    if (barberResult.rowCount === 0) return { error: 'Barbeiro não encontrado.', status: 400 };
  }

  // Verificar horário de funcionamento
  const win = await getWorkingWindow(date, barber_id ?? null);
  if (!win) return { error: 'Barbearia fechada nesta data.', status: 400 };

  const startMin = timeToMin(start_time);
  const endMin = startMin + service.duration_minutes;
  const openMin = timeToMin(win.open);
  const closeMin = timeToMin(win.close);

  if (startMin < openMin || endMin > closeMin) {
    return { error: 'Horário fora do expediente.', status: 400 };
  }

  // Verificar bloqueios
  const blocks = await getBlocksFor(date);
  const blocked = blocks.some(b => {
    const blockStart = timeToMin(b.start_time);
    const blockEnd = timeToMin(b.end_time);
    return startMin < blockEnd && endMin > blockStart;
  });
  if (blocked) return { error: 'Horário bloqueado ou dia de folga.', status: 409 };

  let insertedId = null;
  try {
    await runTransaction(async () => {
      // Verificação final de conflito dentro da transação
      const existingResult = await db.query(`
        SELECT id, start_time, end_time FROM appointments
        WHERE date = $1 AND status NOT IN ('cancelled', 'no_show')
        AND ($2::int IS NULL OR barber_id = $2)
      `, [date, barber_id ?? null]);

      const conflict = existingResult.rows.some(appt => {
        const apptStart = timeToMin(appt.start_time);
        const apptEnd = timeToMin(appt.end_time);
        return startMin < apptEnd && endMin > apptStart;
      });

      if (conflict) {
        throw Object.assign(new Error('Este horário acabou de ser ocupado por outro cliente.'), { conflict: true });
      }

      const result = await db.query(`
        INSERT INTO appointments
        (code, customer_id, service_id, barber_id, date, start_time, end_time, value, status, payment_method, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id
      `, [
        genCode(),
        customer_id,
        service_id,
        barber_id ?? null,
        date,
        start_time,
        minToTime(endMin),
        value ?? service.price,
        status ?? 'scheduled',
        payment_method ?? null,
        notes ?? null
      ]);

      insertedId = Number(result.rows[0].id);

      // Criar pagamento se método informado
      if (payment_method) {
        await db.query(`
          INSERT INTO payments (appointment_id, method, value, status, date)
          VALUES ($1, $2, $3, $4, $5)
        `, [insertedId, payment_method, value ?? service.price, status === 'completed' ? 'paid' : 'pending', date]);
      }
    });
  } catch (err) {
    if (err.conflict) return { error: err.message, status: 409 };
    return { error: 'Erro interno ao criar agendamento.', status: 500 };
  }

  if (!insertedId) return { error: 'Falha ao criar agendamento.', status: 500 };

  // Atualizar estatísticas do cliente se for concluído
  if (status === 'completed') {
    await updateCustomerStats(customer_id);
  }

  return { id: insertedId };
}

// Verifica se um horário está livre
async function isSlotFree(date, start_time, end_time, barber_id, exclude_id = null) {
  const startMin = timeToMin(start_time);
  const endMin = timeToMin(end_time);

  // Verificar horário de funcionamento
  const win = await getWorkingWindow(date, barber_id);
  if (!win) return { available: false, error: 'Barbearia fechada nesta data.' };

  const openMin = timeToMin(win.open);
  const closeMin = timeToMin(win.close);
  if (startMin < openMin || endMin > closeMin) {
    return { available: false, error: 'Horário fora do expediente.' };
  }

  // Verificar bloqueios
  const blocks = await getBlocksFor(date);
  const blocked = blocks.some(b => {
    const blockStart = timeToMin(b.start_time);
    const blockEnd = timeToMin(b.end_time);
    return startMin < blockEnd && endMin > blockStart;
  });
  if (blocked) return { available: false, error: 'Horário bloqueado ou dia de folga.' };

  // Verificar agendamentos existentes
  const booked = await getBookedSlots(date, barber_id, exclude_id);
  const overlapped = booked.some(b => {
    const bStart = timeToMin(b.start_time);
    const bEnd = timeToMin(b.end_time);
    return startMin < bEnd && endMin > bStart;
  });
  if (overlapped) return { available: false, error: 'Este horário acabou de ser ocupado por outro cliente.' };

  return { available: true };
}

// Atualiza estatísticas do cliente
async function updateCustomerStats(customerId) {
  const statsResult = await db.query(`
    SELECT
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS visit_count,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN value ELSE 0 END), 0) AS total_spent,
      MIN(CASE WHEN status = 'completed' THEN date END) AS first_visit,
      MAX(CASE WHEN status = 'completed' THEN date END) AS last_visit
    FROM appointments
    WHERE customer_id = $1 AND status = 'completed'
  `, [customerId]);

  if (statsResult.rowCount === 0) return;

  const stats = statsResult.rows[0];

  await db.query(`
    UPDATE customers SET
      visits_count = $1,
      total_spent = $2,
      first_visit_at = $3,
      last_visit_at = $4,
      updated_at = NOW()
    WHERE id = $5
  `, [
    stats.visit_count,
    stats.total_spent,
    stats.first_visit,
    stats.last_visit,
    customerId
  ]);
}

// Busca um agendamento completo pelo código (ou pelo id)
// Usada pela API pública para responder ao POST /appointments e ao GET /appointments/:code
export async function fetchAppointmentByCode(code, id = null) {
  const where = id ? 'a.id = $1' : 'a.code = $1';
  const { rows } = await db.query(`${JOIN} WHERE ${where}`, [id || code]);
  return rows[0] || null;
}

export default router;