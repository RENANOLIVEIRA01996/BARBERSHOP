import { useEffect, useState } from 'react';
import { apiGet, formatMoney, getSessionUser } from '../../api/client';
import {
  Donut, DonutLegend, LineChart, Sparkline, HBarList, HourHeatmap,
  PAY_COLORS, SVC_COLORS, GOLD, METAL, GOLD_SOFT,
} from '../../components/admin/Charts';

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom', label: 'Personalizado' },
];

const STATUS_LABEL = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function pctClass(v) {
  if (v == null || v === 0) return 'flat';
  return v > 0 ? 'up' : 'down';
}

function pctLabel(v) {
  if (v == null) return '— vs. período anterior';
  if (v === 0) return 'estável vs. período anterior';
  return `${v > 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('pt-BR')}% vs. período anterior`;
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function dateBR(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function avgTickSeries(series) {
  let acc = { count: 0, revenue: 0 };
  const out = [];
  for (const s of series || []) {
    acc = { count: acc.count + Number(s.count || 0), revenue: acc.revenue + Number(s.revenue || 0) };
    out.push(acc.count ? Math.round((acc.revenue / acc.count) * 100) / 100 : 0);
  }
  return out;
}
function Skeleton() {
  return (
    <div className="dash-grid">
      <div className="admin-card kpi-hero skeleton-card">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line" style={{ width: '70%' }} />
        <div className="skeleton-row" />
      </div>
      <div className="admin-card skeleton-card dash-grid-4-item"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card dash-grid-4-item"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card dash-grid-4-item"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card dash-grid-4-item"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card span-2"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card"><div className="skeleton-line" /><div className="skeleton-row" /></div>
      <div className="admin-card skeleton-card"><div className="skeleton-line" /><div className="skeleton-row" /></div>
    </div>
  );
}
function Dashboard() {
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState(() => {
    const t = new Date();
    const p = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const from = new Date(t); from.setDate(t.getDate() - 30);
    return { from: p(from), to: p(t) };
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = getSessionUser();

  const load = (prd, cst) => {
    setLoading(true);
    setError(null);
    const q = prd === 'custom'
      ? `period=custom&from=${cst.from}&to=${cst.to}`
      : `period=${prd}`;
    apiGet(`/api/dashboard/analytics?${q}`)
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(period, custom); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [period]);

  const applyCustom = () => load('custom', custom);

  if (loading && !data) return (
    <div className="admin-page">
      <div className="admin-page-head"><h1>Dashboard</h1></div>
      <Skeleton />
    </div>
  );

  if (error && !data) return (
    <div className="admin-page">
      <div className="admin-page-head"><h1>Dashboard</h1></div>
      <div className="alert-error">
        Não foi possível carregar os dados.
        <div><button className="retry-btn" onClick={() => load(period, custom)}>Tentar novamente</button></div>
      </div>
    </div>
  );

  const k = data?.kpi || {};
  const deltaLabel = k.revenueDelta == null && k.revenue === 0
    ? { text: 'Sem faturamento no período', cls: 'flat' }
    : { text: pctLabel(k.revenueDelta), cls: pctClass(k.revenueDelta) };
  const periodLabel = {
    today: `Hoje · ${new Date(data.period.start + 'T00:00:00').toLocaleDateString('pt-BR')}`,
    week: `Esta semana · ${new Date(data.period.start + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(data.period.end + 'T00:00:00').toLocaleDateString('pt-BR')}`,
    month: `${new Date(data.period.start + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
    custom: `${new Date(data.period.start + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(data.period.end + 'T00:00:00').toLocaleDateString('pt-BR')}`,
  }[data.period.period];

  const paymentSegs = (data.payments || []).map((p, i) => ({
    label: p.label, value: p.total, pct: p.pct, color: PAY_COLORS[i % PAY_COLORS.length],
  }));
  const svcSegs = (data.services || []).map((s, i) => ({
    label: s.name, value: s.count, pct: s.pct, color: SVC_COLORS[i % SVC_COLORS.length],
  }));
  const occSegs = [
    { label: 'Ocupado', value: k.occupancy || 0, color: GOLD },
    { label: 'Disponível', value: Math.max(0, 100 - (k.occupancy || 0)), color: '#22242A' },
  ];
return (
    <div className="admin-page">
      <div className="dash-head-row">
        <div>
          <div className="admin-page-head" style={{ marginBottom: 0 }}>
            <h1>Dashboard</h1>
            <p className="dash-hello">
              <strong>{greeting()}, {user?.name || 'Henrique'}.</strong> Veja como está o desempenho da sua barbearia.
            </p>
          </div>
        </div>
        <div className="period-filters" role="group" aria-label="Período">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              className={`period-btn ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="period-custom">
            <input type="date" aria-label="De" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })} />
            <input type="date" aria-label="Até" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })} />
            <button className="btn-primary btn-sm" onClick={applyCustom}>Aplicar</button>
          </div>
        )}
      </div>

      {loading && data && <div className="alert-tiny"><span className="skeleton skeleton-line" style={{ width: 180 }} /></div>}
      {error && <div className="alert-error">{error} <button className="retry-btn" onClick={() => load(period, custom)}>Tentar novamente</button></div>}

      {/* KPI principal: FATURAMENTO */}
      <div className="admin-card kpi-hero">
        <div className="kpi-hero-inner">
          <div className="kpi-hero-main">
            <span className="kpi-hero-label">Faturamento · {periodLabel}</span>
            <div className="kpi-hero-value">{formatMoney(k.revenue)}</div>
            <span className={`kpi-hero-delta ${deltaLabel.cls}`}>{deltaLabel.text}</span>
            <p className="kpi-hero-note">
              {k.completed} atendimento{k.completed === 1 ? '' : 's'} concluído{k.completed === 1 ? '' : 's'} · {data.period.days} dia{data.period.days === 1 ? '' : 's'}
            </p>
          </div>
          <div className="kpi-hero-chart">
            <LineChart data={data.series || []} height={190} />
          </div>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="dash-grid-4">
        <div className="admin-card kpi-mini">
          <div>
            <span className="stat-label">Atendimentos</span>
            <strong className="stat-value">{k.appointments}</strong>
            <div className="stat-footer">
              <span className={`stat-delta ${pctClass(k.appointmentsDelta)}`}>
                {k.appointmentsDelta == null ? '—' : `${k.appointmentsDelta > 0 ? '↑' : '↓'} ${Math.abs(k.appointmentsDelta)}%`}
              </span>
              {' '}vs. anterior
            </div>
          </div>
          <Sparkline values={(data.series || []).map(s => s.count)} color={GOLD} />
        </div>
        <div className="admin-card kpi-mini">
          <div>
            <span className="stat-label">Ticket médio</span>
            <strong className="stat-value">{formatMoney(k.avgTicket)}</strong>
            <div className="stat-footer">
              <span className={`stat-delta ${k.avgTicketPrev && k.avgTicket >= k.avgTicketPrev ? 'up' : k.avgTicketPrev ? 'down' : 'flat'}`}>
                {k.avgTicketPrev ? (k.avgTicket >= k.avgTicketPrev ? 'acima' : 'abaixo') : '—'}
              </span>
              {' '}do anterior
            </div>
          </div>
          <Sparkline values={avgTickSeries(data.series)} color={GOLD_SOFT} />
        </div>
        <div className="admin-card kpi-mini">
          <div>
            <span className="stat-label">Ocupação</span>
            <strong className="stat-value">{k.occupancy}%</strong>
            <div className="stat-footer">Capacidade {k.capacity} horários</div>
          </div>
          <div className="donut-mini"><span>{k.occupancy}%</span></div>
        </div>
        <div className="admin-card kpi-mini">
          <div>
            <span className="stat-label">Clientes novos</span>
            <strong className="stat-value">{k.newCustomers}</strong>
            <div className="stat-footer">
              <span className={`stat-delta ${pctClass(k.newCustomersDelta)}`}>
                {k.newCustomersDelta == null ? '—' : `${k.newCustomersDelta > 0 ? '↑' : '↓'} ${Math.abs(k.newCustomersDelta)}%`}
              </span>
              {' '}vs. anterior
            </div>
          </div>
          <Sparkline values={[k.newCustomersPrev || 0, k.newCustomers]} color={METAL} />
        </div>
      </div>

      {/* Donuts: pagamentos / serviços / ocupação */}
      <div className="pie-3col">
        <div className="admin-card section-card">
          <h2 className="card-title">Formas de pagamento</h2>
          {data.payments.length === 0 ? (
            <div className="empty-state small">Sem pagamentos concluídos no período.</div>
          ) : (
            <div className="pie-wrap">
              <Donut
                segments={paymentSegs}
                size={148}
                thickness={18}
                centerTitle="Recebido"
                centerValue={formatMoney(k.revenue)}
              />
              <DonutLegend segments={paymentSegs} />
            </div>
          )}
        </div>
        <div className="admin-card section-card">
          <h2 className="card-title">Serviços</h2>
          {data.services.length === 0 ? (
            <div className="empty-state small">Sem serviços concluídos no período.</div>
          ) : (
            <div className="pie-wrap">
              <Donut
                segments={svcSegs}
                size={148}
                thickness={18}
                centerTitle="Atendimentos"
                centerValue={k.completed}
              />
              <DonutLegend segments={svcSegs} money={false} />
            </div>
          )}
        </div>
        <div className="admin-card section-card">
          <h2 className="card-title">Ocupação</h2>
          <div className="pie-wrap">
            <Donut
              segments={occSegs}
              size={148}
              thickness={18}
              centerTitle="Ocupação"
              centerValue={`${k.occupancy}%`}
            />
            <div className="donut-legend">
              <div className="legend-row"><span className="legend-dot" style={{ background: GOLD }} /><span className="legend-name">Ocupado</span><strong className="legend-val">{k.occupancy}%</strong></div>
              <div className="legend-row"><span className="legend-dot" style={{ background: '#22242A' }} /><span className="legend-name">Disponível</span><strong className="legend-val">{Math.max(0, 100 - k.occupancy)}%</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top serviços + horários */}
      <div className="dash-grid">
        <div className="admin-card section-card">
          <h2 className="card-title">Top serviços</h2>
          <HBarList
            items={data.services.map(s => ({ label: s.name, value: s.count, pct: s.pct, sub: formatMoney(s.revenue) }))}
            useMoney={false}
          />
        </div>
        <div className="admin-card section-card">
          <h2 className="card-title">Horários mais movimentados</h2>
          <HourHeatmap items={data.hours} max={data.maxHourCount} />
        </div>
      </div>

      {/* Próximos + Atividade */}
      <div className="dash-grid">
        <div className="admin-card section-card">
          <h2 className="card-title">Próximos agendamentos</h2>
          {data.upcoming.length === 0 ? (
            <div className="empty-state small">Nenhum agendamento futuro.</div>
          ) : (
            <div className="upcoming-list">
              {data.upcoming.map(a => (
                <div key={a.id} className="upcoming-item">
                  <div className="upcoming-time">
                    <strong>{a.start_time}</strong>
                    <span>{dateBR(a.date)}</span>
                  </div>
                  <div className="upcoming-who">
                    <strong>{a.customer_name}</strong>
                    <span>{a.service_name}{a.barber_name ? ` · ${a.barber_name}` : ''}</span>
                  </div>
                  <span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="admin-card section-card">
          <h2 className="card-title">Atividade recente</h2>
          {(data.activity || []).length === 0 ? (
            <div className="empty-state small">Sem atividade no período.</div>
          ) : (
            <div className="activity-list">
              {(data.activity || []).map((act, i) => (
                <div key={i} className="activity-item">
                  <span className={`activity-dot ${act.kind === 'appointment' ? act.status : act.kind}`} />
                  <div className="activity-body">
                    <p>{act.text || act.detail}</p>
                    <span>{fmtTime(act.time)}{act.value != null ? ` · ${formatMoney(act.value)}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="admin-card section-card" style={{ marginTop: 'var(--sp-5)' }}>
          <h2 className="card-title">Insights da barbearia</h2>
          <div className="insights-list">
            {data.insights.map((ins, i) => (
              <div key={i} className="insight-item">
                <span className="insight-icon">▸</span>
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;