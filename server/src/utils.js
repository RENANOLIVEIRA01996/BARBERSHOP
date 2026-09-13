/**
 * Utilidades: datas, horários, disponibilidade, WhatsApp, respostas.
 */
import { db } from './db.js';

export function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

export function fail(res, message, status = 400, details = null) {
  return res.status(status).json({ ok: false, message, details });
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function toYMD(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr() { return toYMD(); }

export function timeToMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToTime(min) {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}

export function addMinutes(hhmm, mins) {
  return minToTime(timeToMin(hhmm) + mins);
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function rangeDays(from, to) {
  const out = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    out.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function getSetting(key, def = null) {
  const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
  if (!rows.length) return def;
  const v = rows[0].value;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export async function setSetting(key, value) {
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await db.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, val]
  );
}
export async function getWorkingWindow(dateStr, barberId = null) {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();

  if (barberId) {
    const { rows } = await db.query('SELECT * FROM barber_hours WHERE barber_id = $1 AND day_of_week = $2', [barberId, dow]);
    const bh = rows[0];
    if (bh && bh.active) return { open: bh.open_time, close: bh.close_time };
  }
  const { rows } = await db.query('SELECT * FROM business_hours WHERE day_of_week = $1', [dow]);
  const row = rows[0];
  if (!row || !row.active || !row.open_time || !row.close_time) return null;
  return { open: row.open_time, close: row.close_time };
}

export async function getBlocksFor(dateStr) {
  const blocks = [];
  const dow = new Date(dateStr + 'T12:00:00').getDay();

  const { rows: holidayRows } = await db.query('SELECT * FROM holidays WHERE date = $1 OR recurring = 1', [dateStr]);
  for (const h of holidayRows) {
    if (h.date === dateStr || (h.recurring && new Date(h.date + 'T12:00:00').getDay() === dow)) {
      blocks.push({ title: h.title, allDay: true, start_time: '00:00', end_time: '24:00' });
    }
  }

  const { rows: blockedTimesRows } = await db.query('SELECT * FROM blocked_times WHERE date = $1 OR is_recurring = 1', [dateStr]);
  for (const r of blockedTimesRows) {
    const hit = r.date === dateStr ||
      (r.is_recurring && new Date(r.date + 'T12:00:00').getDay() === dow);
    if (hit) {
      blocks.push({ title: r.title, allDay: !!r.all_day, start_time: r.all_day ? '00:00' : r.start_time, end_time: r.all_day ? '24:00' : r.end_time });
    }
  }
  return blocks;
}

export async function getBookedSlots(dateStr, barberId = null, excludeApptId = null) {
  let sql = `SELECT id, date, start_time, end_time FROM appointments
              WHERE date = $1 AND status NOT IN ('cancelled', 'no_show')`;
  const params = [dateStr];
  if (barberId) {
    sql += ' AND barber_id = $2';
    params.push(barberId);
  }
  if (excludeApptId) {
    const idx = params.length + 1;
    sql += ` AND id != $${idx}`;
    params.push(excludeApptId);
  }
  const { rows } = await db.query(sql, params);
  return rows;
}

export async function computeAvailableSlots(dateStr, serviceId, barberId = null) {
  const svcResult = await db.query('SELECT * FROM services WHERE id = $1 AND status = $2', [serviceId, 'active']);
  const svc = svcResult.rows[0];
  if (!svc) return { error: 'Serviço indisponível.' };

  const win = await getWorkingWindow(dateStr, barberId);
  if (!win) return { slots: [] };

  const barberIds = (barberId
    ? [barberId]
    : (await db.query('SELECT id FROM barbers WHERE status = $1', ['active'])).rows.map(b => b.id));
  if (!barberIds.length) return { slots: [] };

  const interval = await getSetting('booking.slot_interval_minutes', 30) || 30;
  const duration = svc.duration_minutes;
  const final = [];
  const seen = new Set();

  for (const bId of barberIds) {
    const bWin = await getWorkingWindow(dateStr, bId) || win;
    const blocks = await getBlocksFor(dateStr);
    const booked = await getBookedSlots(dateStr, bId);
    const openMin = timeToMin(bWin.open);
    const closeMin = timeToMin(bWin.close);

    for (let t = openMin; t + duration <= closeMin; t += interval) {
      const start = minToTime(t);
      const end = minToTime(t + duration);
      if (seen.has(`${bId}|${start}`)) continue;
      if (overlapsAny(start, end, booked)) continue;
      if (overlapsAny(start, end, blocks)) continue;

      seen.add(`${bId}|${start}`);
      final.push({ time: start, end, barber_id: bId });
    }
  }

  final.sort((a, b) => a.time.localeCompare(b.time));
  const uniq = [];
  const times = new Set();
  for (const s of final) {
    if (times.has(s.time)) continue;
    times.add(s.time);
    uniq.push(s);
  }
  return { slots: uniq, duration };
}

function overlapsAny(start, end, ranges) {
  const s = timeToMin(start), e = timeToMin(end);
  return ranges.some((r) => {
    const rs = timeToMin(r.start_time);
    const re = timeToMin(r.end_time);
    return s < re && e > rs;
  });
}

export function waLink(phone, message) {
  const clean = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}



