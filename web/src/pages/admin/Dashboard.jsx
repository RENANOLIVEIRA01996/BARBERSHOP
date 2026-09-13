import { useEffect, useState } from 'react';
import { apiGet, formatMoney } from '../../api/client';

function Dashboard() {
  const [data, setData] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([apiGet('/api/dashboard/overview'), apiGet('/api/dashboard/charts?months=6')])
      .then(([over, ch]) => { if (alive) { setData(over); setCharts(ch); } })
      .catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="page-loading">Carregando dashboard…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const cards = data?.cards || {};
  const maxMonth = Math.max(1, ...(charts?.monthly || []).map(m => Number(m.revenue)));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <p className="admin-page-sub">Visão geral da barbearia em {new Date(data.today + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Cards resumo */}
      <div className="admin-cards">
        <div className="admin-card stat">
          <span className="stat-label">Agendamentos hoje</span>
          <strong className="stat-value">{cards.appointmentsToday}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Concluídos hoje</span>
          <strong className="stat-value">{cards.servicesDone}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Cancelados hoje</span>
          <strong className="stat-value">{cards.cancelled}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Faturamento hoje</span>
          <strong className="stat-value gold">{formatMoney(cards.revenueDay)}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Faturamento semana</span>
          <strong className="stat-value gold">{formatMoney(cards.revenueWeek)}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Faturamento mês</span>
          <strong className="stat-value gold">{formatMoney(cards.revenueMonth)}</strong>
        </div>
        <div className="admin-card stat">
          <span className="stat-label">Clientes cadastrados</span>
          <strong className="stat-value">{cards.customersCount}</strong>
        </div>
      </div>

      <div className="admin-grid-2">
        {/* Próximos horários */}
        <div className="admin-card">
          <h2 className="card-title">Próximos horários</h2>
          {(data.upcoming || []).length === 0 ? (
            <p className="empty-state">Nenhum agendamento futuro.</p>
          ) : (
            <div className="agenda-list">
              {(data.upcoming || []).map(a => (
                <div key={a.id} className="agenda-row">
                  <div className="agenda-when">
                    <span className="agenda-time">{a.start_time}</span>
                    <span className="agenda-date">{a.date}</span>
                  </div>
                  <div className="agenda-who">
                    <strong>{a.customer_name}</strong>
                    <span>{a.service_name}{a.barber_name ? ` · ${a.barber_name}` : ''}</span>
                  </div>
                  <span className={`badge badge-${a.status}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidência mensal */}
        <div className="admin-card">
          <h2 className="card-title">Faturamento mensal (6 meses)</h2>
          {(charts?.monthly || []).length === 0 ? (
            <p className="empty-state">Sem dados no período.</p>
          ) : (
            <div className="chart-bars">
              {charts.monthly.map(m => (
                <div key={m.month} className="chart-bar-col" title={`${m.month}: ${formatMoney(m.revenue)} (${m.total} atend.)`}>
                  <div className="chart-bar" style={{ height: `${Math.round((Number(m.revenue) / maxMonth) * 100)}%` }} />
                  <span className="chart-bar-label">{m.month.slice(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Serviços mais agendados */}
      <div className="admin-card">
        <h2 className="card-title">Serviços mais realizados (mês atual)</h2>
        {(charts?.topServices || []).length === 0 ? (
          <p className="empty-state">Sem atendimentos concluídos neste mês.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Atendimentos</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {charts.topServices.map(s => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.count}</td>
                    <td className="gold">{formatMoney(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;