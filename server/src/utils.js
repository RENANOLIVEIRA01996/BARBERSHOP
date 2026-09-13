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
/**
 * Janela real de trabalho de um barbeiro em uma data.
 *
 * REGRA DE NEGÓCIO (por escolha explícita):
 * - Se barber_id for fornecido: disponibilidade segue **exclusivamente** o horário do barbeiro (barber_hours).
 *   O horário da barbearia (business_hours) é ignorado para fins de disponibilidade individual.
 * - Se barber_id for nulo/undefined: disponibilidade segue o horário geral da barbearia (business_hours).
 *
 * Regras aplicáveis aos dois casos:
 * - Sem registro ativo no dia -> null (ninguém agenda ou barbeiro não trabalha).
 * - Registro ativo mas sem sobreposição (quando aplicável) -> null.
 */
export async function getWorkingWindow(dateStr, barberId = null) {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();

  if (barberId) {
    // ---------- BARBEIRO ESPECÍFICO ----------
    const { rows: barberRows } = await db.query(
      'SELECT * FROM barber_hours WHERE barber_id = $1 AND day_of_week = $2',
      [barberId, dow]
    );
    const bh = barberRows[0];

    // Barbeiro sem horário ativo configurado no dia = não trabalha
    if (!bh || !bh.active || !bh.open_time || !bh.close_time) return null;

    // Retorna exatamente o que o barbeiro definiu
    return { open: bh.open_time, close: bh.close_time };
  }

  // ---------- GERAL (quando não há barber_id) ----------
  const { rows: shopRows } = await db.query('SELECT * FROM business_hours WHERE day_of_week = $1', [dow]);
  const shop = shopRows[0];
  // Sem registro nenhum (ex.: instalação nova com banco sem seed de horários),
  // usa um expediente padrão para o calendário nunca ficar vazio.
  if (!shop) return { open: '08:00', close: '18:00' };
  if (!shop.active || !shop.open_time || !shop.close_time) return null;

  return { open: shop.open_time, close: shop.close_time };
}

export async function getBlocksFor(dateStr) {
  const blocks = [];
  const dow = new Date(dateStr + 'T12:00:00').getDay();

  const { rows: holidayRows } = await db.query('SELECT * FROM holidays WHERE date = $1 OR recurring = 1', [dateStr]);
  for (const h of holidayRows) {
    const hDate = normalizeDateKey(h.date);
    if (hDate === dateStr || (h.recurring && new Date(hDate + 'T12:00:00').getDay() === dow)) {
      blocks.push({ title: h.title, allDay: true, start_time: '00:00', end_time: '24:00' });
    }
  }

  const { rows: blockedTimesRows } = await db.query('SELECT * FROM blocked_times WHERE date = $1 OR is_recurring = 1', [dateStr]);
  for (const r of blockedTimesRows) {
    const rDate = normalizeDateKey(r.date);
    const hit = rDate === dateStr ||
      (r.is_recurring && new Date(rDate + 'T12:00:00').getDay() === dow);
    if (hit) {
      const allDay = !!r.all_day;
      blocks.push({
        title: r.title,
        allDay,
        start_time: allDay ? '00:00' : r.start_time,
        end_time: allDay ? '24:00' : r.end_time,
      });
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

  const barberIds = (barberId
    ? [barberId]
    : (await db.query('SELECT id FROM barbers WHERE status = $1', ['active'])).rows.map(b => b.id));
  if (!barberIds.length) return { slots: [] };

  const interval = await getSetting('booking.slot_interval_minutes', 30) || 30;
  const duration = svc.duration_minutes;
  const final = [];
  const seen = new Set();
  const blocks = await getBlocksFor(dateStr);

  for (const bId of barberIds) {
    // Janela = horário do barbeiro (getWorkingWindow).
    // Se null -> barbeiro não trabalha neste dia.
    const bWin = await getWorkingWindow(dateStr, bId);
    if (!bWin) continue;

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

function normalizeDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) return toYMD(value);
  return String(value).slice(0, 10);
}

/**
 * Calcula os dias com pelo menos um horário livre para um serviço/barbeiro.
 * Otimizado: busca todos os dados de apoio (horários, bloqueios, feriados,
 * agendamentos) em poucas queries e calcula a grade em memória — para 60 dias
 * isso é dezenas de vezes mais rápido que o loop sequencial antigo.
 */
export async function computeAvailableDays(serviceId, barberId = null, days = 60) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + (days - 1));
  const todayY = toYMD(today);
  const endY = toYMD(end);

  const [
    svcRes,
    barberHoursRes,
    barbersRes,
    holidaysRes,
    blocksRes,
    apptsRes,
    intervalSetting,
  ] = await Promise.all([
    db.query('SELECT id, duration_minutes FROM services WHERE id = $1 AND status = $2', [serviceId, 'active']),
    db.query('SELECT * FROM barber_hours'),
    barberId
      ? db.query('SELECT id FROM barbers WHERE id = $1 AND status = $2', [barberId, 'active'])
      : db.query('SELECT id FROM barbers WHERE status = $1', ['active']),
    db.query('SELECT * FROM holidays'),
    db.query('SELECT * FROM blocked_times'),
    db.query(
      `SELECT date, barber_id, start_time, end_time FROM appointments
       WHERE date >= $1 AND date <= $2 AND status NOT IN ('cancelled', 'no_show')`,
      [todayY, endY]
    ),
    getSetting('booking.slot_interval_minutes', 30),
  ]);

  const svc = svcRes.rows[0];
  if (!svc) return { error: 'Serviço indisponível.' };

  const barberIds = barbersRes.rows.map((b) => Number(b.id));
  if (!barberIds.length) return { days: [] };

  const interval = Number(intervalSetting) || 30;
  const duration = Number(svc.duration_minutes) || 30;

  // Índice local: barber_id -> (day_of_week -> linha)
  const bhBarber = new Map(); // barber_id -> (day_of_week -> linha)
  for (const h of barberHoursRes.rows) {
    if (!bhBarber.has(Number(h.barber_id))) bhBarber.set(Number(h.barber_id), new Map());
    bhBarber.get(Number(h.barber_id)).set(Number(h.day_of_week), h);
  }

  // Bloqueios/feriados: pré-computar por data para evitar O(n) no loop
  const blocksByDate = new Map(); // dateStr -> Array<{start_time, end_time, allDay}>
  const addBlock = (dateStr, block) => {
    if (!blocksByDate.has(dateStr)) blocksByDate.set(dateStr, []);
    blocksByDate.get(dateStr).push(block);
  };

  // Feriados
  for (const h of holidaysRes.rows) {
    const hDate = normalizeDateKey(h.date);
    if (!hDate) continue;
    const hDow = new Date(hDate + 'T12:00:00').getDay();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = toYMD(d);
      if (hDate === dateStr || (h.recurring && hDow === d.getDay())) {
        addBlock(dateStr, { start_time: '00:00', end_time: '24:00' });
      }
    }
  }

  // Bloqueios de horário
  for (const bt of blocksRes.rows) {
    const btDate = normalizeDateKey(bt.date);
    if (!btDate) continue;
    const btDow = new Date(btDate + 'T12:00:00').getDay();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = toYMD(d);
      if (btDate === dateStr || (bt.is_recurring && btDow === d.getDay())) {
        const st = bt.all_day ? '00:00' : bt.start_time;
        const et = bt.all_day ? '24:00' : bt.end_time;
        addBlock(dateStr, { start_time: st, end_time: et });
      }
    }
  }

  // Datas com bloqueio o dia inteiro (forAll-day)
  const allDayBlockDates = new Set();
  for (const [ds, blks] of blocksByDate) {
    if (blks.some((b) => b.end_time === '24:00')) allDayBlockDates.add(ds);
  }

  // Agendamentos já marcados indexados por data+barbeiro
  const bookedByDayBarber = new Map(); // `${date}|${barber_id}` -> array
  for (const a of apptsRes.rows) {
    const key = `${toYMD(new Date(a.date))}|${a.barber_id}`;
    if (!bookedByDayBarber.has(key)) bookedByDayBarber.set(key, []);
    bookedByDayBarber.get(key).push(a);
  }

  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = toYMD(d);
    const dow = d.getDay();

    if (allDayBlockDates.has(dateStr)) continue;

    // LIMITE DE BARBEARIA NÃO SE APLICA:
    // A disponibilidade segue 100% o horário configurado de cada barbeiro
    // (barber_hours). business_hours é usado apenas para exibição pública.

    const dayBlocks = blocksByDate.get(dateStr) || [];

    let hasSlot = false;
    for (const bId of barberIds) {
      // Horário individual do barbeiro. Sem registro ativo no dia =
      // barbeiro não trabalha (NUNCA cai de volta para business_hours).
      const bMap = bhBarber.get(bId);
      const bh = bMap && bMap.get(dow);
      if (!bh || !bh.active || !bh.open_time || !bh.close_time) continue;

      // Barbeiro é a fonte única: disponibilidade segue exclusivamente o horário dele
      const bOpen = timeToMin(bh.open_time);
      const bClose = timeToMin(bh.close_time);
      if (bOpen == null || bClose == null || bOpen + duration > bClose) continue;

      const booked = bookedByDayBarber.get(`${dateStr}|${bId}`) || [];
      for (let t = bOpen; t + duration <= bClose; t += interval) {
        const start = minToTime(t);
        const end = minToTime(t + duration);
        if (overlapsAny(start, end, booked)) continue;
        if (overlapsAny(start, end, dayBlocks)) continue;
        hasSlot = true;
        break;
      }
      if (hasSlot) break;
    }
    if (hasSlot) out.push(dateStr);
  }

  return { days: out };
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



