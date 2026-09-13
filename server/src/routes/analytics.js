/**
 * Dashboard Analytics — endpoint agregado para o Dashboard premium.
 * Fonte única de dados (zero mock). Inclui período anterior para
 * comparações reais e ocupação calculada a partir de barber_hours.
 */
import express from 'express';
import { db } from '../db.js';
import { ok, fail, toYMD, timeToMin, getSetting } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const METHOD_LABEL = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Cartão (débito)',
  credito: 'Cartão (crédito)',
  outros: 'Outros',
};

function resolveAnalyticsPeriod(period, from, to) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;
  let end = today;

  if (period === 'today') {
    start = today;
  } else if (period === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start = new Date(today);
    start.setDate(today.getDate() + diff);
  } else if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (from && to && from <= to) {
    start = new Date(from + 'T00:00:00');
    end = new Date(to + 'T00:00:00');
    if (end > today) end = today;
    if (start > end) start = end;
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const days = Math.round((end - start) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  return {
    start: toYMD(start),
    end: toYMD(end),
    days,
    prevStart: toYMD(prevStart),
    prevEnd: toYMD(prevEnd),
    period,
  };
}

// GET /api/dashboard/analytics?period=today|week|month|custom&from=&to=
router.get('/analytics', async (req, res) => {
  try {
    const { period = 'month', from, to } = req.query || {};
    const P = resolveAnalyticsPeriod(period, from, to);

    // ---- KPI base: faturamento, atendimentos, clientes (atual + anterior) ----
    const [cur, prev, custCur, custPrev, apptsCur, apptsPrev] = await Promise.all([
      db.query(
        "SELECT COALESCE(SUM(value),0) AS revenue, COUNT(*) AS n FROM appointments WHERE date BETWEEN $1 AND $2 AND status='completed'",
        [P.start, P.end]
      ),
      db.query(
        "SELECT COALESCE(SUM(value),0) AS revenue, COUNT(*) AS n FROM appointments WHERE date BETWEEN $1 AND $2 AND status='completed'",
        [P.prevStart, P.prevEnd]
      ),
      db.query(
        'SELECT COUNT(*) AS n FROM customers WHERE created_at::date BETWEEN $1 AND $2',
        [P.start, P.end]
      ),
      db.query(
        'SELECT COUNT(*) AS n FROM customers WHERE created_at::date BETWEEN $1 AND $2',
        [P.prevStart, P.prevEnd]
      ),
      db.query(
        "SELECT COUNT(*) AS n FROM appointments WHERE date BETWEEN $1 AND $2 AND status NOT IN ('cancelled','no_show')",
        [P.start, P.end]
      ),
      db.query(
        "SELECT COUNT(*) AS n FROM appointments WHERE date BETWEEN $1 AND $2 AND status NOT IN ('cancelled','no_show')",
        [P.prevStart, P.prevEnd]
      ),
    ]);

    const revenue = Number(cur.rows[0].revenue || 0);
    const prevRevenue = Number(prev.rows[0].revenue || 0);
    const appts = Number(apptsCur.rows[0].n || 0);
    const prevAppts = Number(apptsPrev.rows[0].n || 0);
    const newCustomers = Number(custCur.rows[0].n || 0);
    const prevNewCustomers = Number(custPrev.rows[0].n || 0);
    const completedCur = Number(cur.rows[0].n || 0);
    const completedPrev = Number(prev.rows[0].n || 0);

    const pct = (curV, prevV) => {
      if (!prevV) return null;
      return Math.round(((curV - prevV) / prevV) * 1000) / 10;
    };

    const kpi = {
      revenue,
      revenuePrev: prevRevenue,
      revenueDelta: pct(revenue, prevRevenue),
      appointments: appts,
      previousAppointments: prevAppts,
      appointmentsDelta: pct(appts, prevAppts),
      completed: completedCur,
      completedPrev,
      avgTicket: completedCur ? Math.round((revenue / completedCur) * 100) / 100 : 0,
      avgTicketPrev: completedPrev ? Math.round((prevRevenue / completedPrev) * 100) / 100 : 0,
      newCustomers,
      newCustomersPrev: prevNewCustomers,
      newCustomersDelta: pct(newCustomers, prevNewCustomers),
    };

    // ---- Capacidade (barber_hours) para ocupação ----
    const interval = Number(await getSetting('booking.slot_interval_minutes', 30)) || 30;
    const { rows: bhRows } = await db.query(
      'SELECT day_of_week, open_time, close_time FROM barber_hours WHERE active = 1'
    );
    const bhByDow = new Map();
    for (const h of bhRows) {
      const om = timeToMin(h.open_time);
      const cm = timeToMin(h.close_time);
      if (om == null || cm == null || cm <= om) continue;
      if (!bhByDow.has(Number(h.day_of_week))) bhByDow.set(Number(h.day_of_week), []);
      bhByDow.get(Number(h.day_of_week)).push({ om, cm });
    }
    let capacity = 0;
    for (let i = 0; i < P.days; i++) {
      const d = new Date(P.start + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const windows = bhByDow.get(d.getDay()) || [];
      for (const w of windows) {
        capacity += Math.max(0, Math.floor((w.cm - w.om) / interval));
      }
    }
    const occupancy = capacity ? Math.min(100, Math.round((appts / capacity) * 100)) : (appts ? 100 : 0);
    kpi.capacity = capacity;
    kpi.occupancy = occupancy;

    // ---- Série temporal (faturamento por dia) ----
    const seriesRows = await db.query(
      `SELECT date, COALESCE(SUM(CASE WHEN status='completed' THEN value ELSE 0 END),0) AS revenue,
              COUNT(*) AS count
       FROM appointments
       WHERE date BETWEEN $1 AND $2 AND status NOT IN ('cancelled','no_show')
       GROUP BY date ORDER BY date ASC`,
      [P.start, P.end]
    );
    const seriesMap = new Map(seriesRows.rows.map(r => [toYMD(new Date(r.date)), {
      date: toYMD(new Date(r.date)),
      revenue: Number(r.revenue || 0),
      count: Number(r.count || 0),
    }]));
    const series = [];
    for (let i = 0; i < P.days; i++) {
      const d = new Date(P.start + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const key = toYMD(d);
      series.push(seriesMap.get(key) || { date: key, revenue: 0, count: 0 });
    }

    // ---- Formas de pagamento (concluídos) ----
    const payRows = await db.query(
      `SELECT COALESCE(NULLIF(payment_method,''),'outros') AS method,
              COUNT(*) AS count, COALESCE(SUM(value),0) AS total
       FROM appointments
       WHERE date BETWEEN $1 AND $2 AND status='completed'
       GROUP BY method ORDER BY total DESC`,
      [P.start, P.end]
    );
    const payTotal = payRows.rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const payments = payRows.rows.map(r => ({
      method: r.method,
      label: METHOD_LABEL[r.method] || r.method,
      count: Number(r.count || 0),
      total: Number(r.total || 0),
      pct: payTotal ? Math.round((Number(r.total) / payTotal) * 1000) / 10 : 0,
    }));

    // ---- Top serviços (concluídos) ----
    const svcRows = await db.query(
      `SELECT s.name, COUNT(a.id) AS count, COALESCE(SUM(a.value),0) AS revenue
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.date BETWEEN $1 AND $2 AND a.status='completed'
       GROUP BY s.name ORDER BY count DESC LIMIT 6`,
      [P.start, P.end]
    );
    const svcTotal = svcRows.rows.reduce((s, r) => s + Number(r.count), 0);
    const services = svcRows.rows.map(r => ({
      name: r.name,
      count: Number(r.count || 0),
      revenue: Number(r.revenue || 0),
      pct: svcTotal ? Math.round((Number(r.count) / svcTotal) * 1000) / 10 : 0,
    }));

    // ---- Horários de maior movimento (não cancelados/no_show) ----
    const hourRows = await db.query(
      `SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS count
       FROM appointments
       WHERE date BETWEEN $1 AND $2 AND status NOT IN ('cancelled','no_show')
       GROUP BY hour ORDER BY hour ASC`,
      [P.start, P.end]
    );
    const hours = hourRows.rows.map(r => ({
      hour: Number(r.hour),
      count: Number(r.count || 0),
    }));
    const maxHourCount = Math.max(1, ...hours.map(h => h.count));

    // ---- Próximos agendamentos ----
    const upcomingRows = await db.query(
      `SELECT a.*, c.name AS customer_name, s.name AS service_name, b.name AS barber_name
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN services s ON s.id = a.service_id
       LEFT JOIN barbers b ON b.id = a.barber_id
       WHERE a.date >= $1 AND a.status IN ('scheduled','confirmed')
       ORDER BY a.date ASC, a.start_time ASC LIMIT 6`,
      [P.start]
    );

    // ---- Atividade recente (notificações reais + últimos agendamentos) ----
    const [notifRows, recentAppts] = await Promise.all([
      db.query('SELECT title, message, type, created_at FROM notifications ORDER BY created_at DESC LIMIT 8'),
      db.query(
        `SELECT a.*, c.name AS customer_name, s.name AS service_name
         FROM appointments a JOIN customers c ON c.id = a.customer_id
         JOIN services s ON s.id = a.service_id
         WHERE a.date BETWEEN $1 AND $2
         ORDER BY a.created_at DESC LIMIT 6`,
        [P.start, P.end]
      ),
    ]);
    const activity = [
      ...recentAppts.rows.map(a => ({
        time: a.created_at,
        kind: 'appointment',
        status: a.status,
        text: a.status === 'completed'
          ? `${a.customer_name} — ${a.service_name} concluído`
          : a.status === 'cancelled'
            ? `${a.customer_name} — ${a.service_name} cancelado`
            : `${a.customer_name} — ${a.service_name} · ${a.start_time}`,
        value: a.value,
      })),
      ...notifRows.rows.map(n => ({
        time: n.created_at,
        kind: n.type,
        text: n.title,
        detail: n.message,
      })),
    ]
      .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')))
      .slice(0, 10);

    // ---- Insights — apenas quando há dados reais ----
    const insights = [];
    if (revenue > 0 || appts > 0 || newCustomers > 0) {
      if (kpi.revenueDelta !== null && kpi.revenueDelta !== 0) {
        insights.push(kpi.revenueDelta > 0
          ? `Seu faturamento está ${Math.abs(kpi.revenueDelta).toLocaleString('pt-BR')}% acima do período anterior.`
          : `Seu faturamento ficou ${Math.abs(kpi.revenueDelta).toLocaleString('pt-BR')}% abaixo do período anterior.`);
      }
      if (hours.length) {
        const peak = hours.reduce((a, b) => (b.count > a.count ? b : a), hours[0]);
        insights.push(`O horário de maior movimento é ${String(peak.hour).padStart(2, '0')}h (${peak.count} atendimento${peak.count === 1 ? '' : 's'}).`);
      }
      if (services.length && svcTotal > 1 && services[0].pct >= 20) {
        insights.push(`${services[0].name} representa ${services[0].pct.toLocaleString('pt-BR')}% dos atendimentos do período.`);
      }
      if (newCustomers > 0) {
        insights.push(`Você teve ${newCustomers} novo${newCustomers === 1 ? '' : 's'} cliente${newCustomers === 1 ? '' : 's'} no período.`);
      }
      if (P.days >= 2 && capacity > 0 && appts > 0) {
        insights.push(occupancy >= 70
          ? `A agenda está ${occupancy}% ocupada — atenção à capacidade.`
          : `A ocupação do período é ${occupancy}% — há espaço para mais agendamentos.`);
      }
    }

    return ok(res, {
      period: P,
      kpi,
      series,
      payments,
      services,
      hours,
      maxHourCount,
      upcoming: upcomingRows.rows,
      activity,
      insights,
    });
  } catch (err) {
    console.error('[dashboard/analytics] erro:', err);
    return fail(res, 'Não foi possível carregar o dashboard.', 500);
  }
});

export default router;