/**
 * API pública — página da barbearia, disponibilidade e agendamento do cliente.
 */
import express from 'express';
import { db } from '../db.js';
import {
  ok, fail, getWorkingWindow, getBlocksFor, getSetting,
  computeAvailableSlots, toYMD, pad, waLink,
} from '../utils.js';
import { createAppointment, fetchAppointmentByCode } from './appointments.js';

const router = express.Router();

const PUBLIC_SHOP_FIELDS = `
  id, name, slug, logo_principal, logo_horizontal, icone, banner, perfil_social,
  wallpaper, simbolo, favicon, textura, tagline, description, phone, whatsapp,
  instagram, address, cep, city, state, map_url
`;

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function whatsanitize(w) { return String(w || '').replace(/\D/g, ''); }

// GET /api/public/shop — tudo que a página pública precisa
router.get('/shop', async (req, res) => {
  const { rows: shopRows } = await db.query(`SELECT ${PUBLIC_SHOP_FIELDS} FROM barbershops WHERE id = 1`);
  const shop = shopRows[0];
  if (!shop) return fail(res, 'Barbearia não configurada.', 404);

  const { rows: services } = await db.query('SELECT * FROM services WHERE status = $1 ORDER BY position, name', ['active']);
  const { rows: barbers } = await db.query('SELECT * FROM barbers WHERE status = $1 ORDER BY position, name', ['active']);
  for (const b of barbers) b.specialties = safeJson(b.specialties, []);

  const { rows: portfolio } = await db.query(`
    SELECT p.*, s.name AS service_name, b.name AS barber_name
    FROM portfolio p
    LEFT JOIN services s ON s.id = p.service_id
    LEFT JOIN barbers b ON b.id = p.barber_id
    WHERE p.published = 1 ORDER BY p.position, p.created_at DESC
  `);

  const { rows: reviews } = await db.query(`
    SELECT id, customer_name, rating, comment, created_at FROM reviews
    WHERE status = 'approved' ORDER BY created_at DESC LIMIT 50
  `);

  const { rows: ratingRows } = await db.query(`
    SELECT COALESCE(AVG(rating), 0) AS avg, COUNT(*) AS count
    FROM reviews WHERE status = 'approved'
  `);
  const rating = ratingRows[0];

  const { rows: hours } = await db.query('SELECT * FROM business_hours ORDER BY day_of_week');

  return ok(res, {
    shop, services, barbers, portfolio, reviews,
    rating: { avg: Number(rating.avg || 0).toFixed(1), count: rating.count },
    hours,
    bookingRules: {
      minAdvanceHours: await getSetting('booking.min_advance_hours', 2),
      maxFutureDays: await getSetting('booking.max_future_days', 60),
      slotInterval: await getSetting('booking.slot_interval_minutes', 30),
      allowReschedule: await getSetting('booking.allow_reschedule', true),
      cancelDeadlineHours: await getSetting('booking.cancel_deadline_hours', 24),
    },
  });
});

// GET /api/public/days?service_id=&barber_id=&days=30 — datas com horário
router.get('/days', async (req, res) => {
  const { service_id, barber_id } = req.query;
  const days = Math.min(90, Number(req.query.days) || 30);
  const { rows: svcRows } = await db.query('SELECT * FROM services WHERE id = $1 AND status = $2', [service_id, 'active']);
  const svc = svcRows[0];
  if (!svc) return fail(res, 'Serviço indisponível.', 404);

  const out = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const win = await getWorkingWindow(dateStr, barber_id ? Number(barber_id) : null);
    if (!win) continue;
    if ((await getBlocksFor(dateStr)).some(b => b.allDay)) continue;
    const r = await computeAvailableSlots(dateStr, Number(service_id), barber_id ? Number(barber_id) : null);
    if (r.slots && r.slots.length) out.push(dateStr);
  }
  return ok(res, { days: out });
});
// GET /api/public/availability?service_id=&date=&barber_id=
router.get('/availability', async (req, res) => {
  const { service_id, date, barber_id } = req.query;
  if (!service_id || !date) return fail(res, 'Informe serviço e data.');

  const minAdvanceHours = await getSetting('booking.min_advance_hours', 2);
  const maxFutureDays = await getSetting('booking.max_future_days', 60);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  const diffDays = Math.round((selected - today) / 86400000);

  if (diffDays < 0) return ok(res, { slots: [], reason: 'past' });
  if (diffDays > maxFutureDays) return ok(res, { slots: [], reason: 'limit' });

  const result = await computeAvailableSlots(date, Number(service_id), barber_id ? Number(barber_id) : null);
  if (result.error) return fail(res, result.error, 409);

  let slots = result.slots;
  if (diffDays === 0) {
    const minTime = Date.now() + minAdvanceHours * 3600000;
    slots = slots.filter(s => {
      const [h, m] = s.time.split(':').map(Number);
      const slotDate = new Date(date + 'T' + s.time);
      return slotDate.getTime() >= minTime;
    });
  }
  return ok(res, { slots, duration: result.duration, date, service_id });
});

// POST /api/public/appointments — agendamento do cliente
router.post('/appointments', async (req, res) => {
  const { service_id, barber_id, date, start_time, name, whatsapp, email, notes } = req.body || {};

  if (!name || String(name).trim().length < 2) return fail(res, 'Informe seu nome.');
  const wa = whatsanitize(whatsapp);
  if (!/^\d{10,13}$/.test(wa)) return fail(res, 'Informe um WhatsApp válido com DDI + DDD + número.');

  const minAdvanceHours = await getSetting('booking.min_advance_hours', 2);
  const maxFutureDays = await getSetting('booking.max_future_days', 60);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  const diffDays = Math.round((selected - today) / 86400000);

  if (diffDays < 0) return fail(res, 'Data inválida.');
  if (diffDays > maxFutureDays) return fail(res, 'Data além do limite de agendamento.');
  if (diffDays === 0) {
    const slotMs = new Date(date + 'T' + start_time).getTime();
    if (slotMs < Date.now() + minAdvanceHours * 3600000) {
      return fail(res, `Escolha um horário com pelo menos ${minAdvanceHours}h de antecedência.`);
    }
  }

  const { rows: custRows } = await db.query('SELECT * FROM customers WHERE whatsapp = $1', [wa]);
  let customer = custRows[0];
  if (!customer) {
    const { rows: newCust } = await db.query(
      'INSERT INTO customers (name, whatsapp, email, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [String(name).trim(), wa, email || null, notes || null]
    );
    customer = newCust[0];
  } else if (email && !customer.email) {
    await db.query('UPDATE customers SET email = $1 WHERE id = $2', [email, customer.id]);
  }

  const appt = await createAppointment({
    customer_id: customer.id,
    service_id: Number(service_id),
    barber_id: barber_id ? Number(barber_id) : null,
    date,
    start_time,
    notes,
    status: 'scheduled',
  });
  if (appt.error) return fail(res, appt.error, 409);

  await db.query(
    'INSERT INTO notifications (title, message, type) VALUES ($1, $2, $3)',
    ['Novo agendamento', `Novo agendamento de ${customer.name} para ${date} às ${start_time}`, 'appointment']
  );

  const full = await fetchAppointmentByCode(null, appt.id);
  return ok(res, { appointment: full });
});
// GET /api/public/appointments/:code — dados para confirmação
router.get('/appointments/:code', async (req, res) => {
  const appt = await fetchAppointmentByCode(req.params.code);
  if (!appt) return fail(res, 'Agendamento não encontrado.', 404);
  return ok(res, { appointment: appt });
});
// POST /api/public/appointments/:code/action — confirmar/cancelar pelo cliente
router.post('/appointments/:code/action', async (req, res) => {
  const { action } = req.body || {};
  const { rows } = await db.query('SELECT * FROM appointments WHERE code = $1', [req.params.code]);
  const appt = rows[0];
  if (!appt) return fail(res, 'Agendamento não encontrado.', 404);

  if (action === 'cancel') {
    const allowCancel = await getSetting('booking.allow_cancel', true);
    if (!allowCancel) return fail(res, 'Cancelamento pelo cliente está desativado.', 403);
    const deadline = await getSetting('booking.cancel_deadline_hours', 24);
    const apptMs = new Date(appt.date + 'T' + appt.start_time).getTime();
    if (apptMs - Date.now() < deadline * 3600000) {
      return fail(res, `Cancelamento permitido até ${deadline}h antes do horário. Fale com a barbearia.`, 403);
    }
    await db.query("UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [appt.id]);
    await db.query('DELETE FROM payments WHERE appointment_id = $1', [appt.id]);
    return ok(res, { cancelled: true, code: appt.code });
  }
  if (action === 'confirm') {
    await db.query("UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1", [appt.id]);
    return ok(res, { confirmed: true, code: appt.code });
  }
  return fail(res, 'Ação inválida.');
});
// POST /api/public/reviews — avaliar o atendimento
router.post('/reviews', async (req, res) => {
  const { customer_name, customer_phone, appointment_id, rating, comment } = req.body || {};
  const rate = Number(rating);
  if (!customer_name || String(customer_name).trim().length < 2) return fail(res, 'Informe seu nome.');
  if (![1, 2, 3, 4, 5].includes(rate)) return fail(res, 'Nota deve ser entre 1 e 5.');

  if (appointment_id) {
    const { rows: existsRows } = await db.query('SELECT id FROM reviews WHERE appointment_id = $1', [appointment_id]);
    if (existsRows.length) return fail(res, 'Você já avaliou este atendimento.', 409);
  }
  const { rows } = await db.query(`
    INSERT INTO reviews (customer_name, customer_phone, appointment_id, rating, comment, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
  `, [String(customer_name).trim(), customer_phone || null, appointment_id || null, rate, comment || null]);

  await db.query('INSERT INTO notifications (title, message, type) VALUES ($1, $2, $3)',
    ['Nova avaliação', `${customer_name} avaliou com ${rate} estrelas`, 'review']);

  return ok(res, { review: rows[0] });
});
// GET /api/public/whatsapp — link automático para falar com a barbearia
router.get('/whatsapp', async (req, res) => {
  const { rows } = await db.query(`SELECT ${PUBLIC_SHOP_FIELDS} FROM barbershops WHERE id = 1`);
  const shop = rows[0];
  const url = waLink(shop.whatsapp, 'Olá! Quero agendar um horário. 🕐');
  return ok(res, { url });
});

export default router;