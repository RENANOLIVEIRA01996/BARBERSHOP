import { useEffect, useState } from 'react';
import { apiGet, formatMoney } from '../../api/client';

function monthRange() {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  };
}

function RelatoriosAdmin() {
  const [range, setRange] = useState(monthRange());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    const q = `from=${range.from}&to=${range.to}`;
    Promise.all([
      apiGet(`/api/reports/revenue?${q}&group=day`),
      apiGet(`/api/reports/services?${q}`),
      apiGet(`/api/reports/barbers?${q}`),
      apiGet(`/api/reports/customers?${q}`),
    ])
      .then(([rev, serv, barb, cust]) => setData({ rev, serv, barb, cust }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const maxRev = Math.max(1, ...(data?.rev?.serie || []).map(r => Number(r.total)));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Relatórios</h1>
        <p className="admin-page-sub">Visões consolidadas por período.</p>
      </div>

      <div className="admin-filters">
        <div className="form-group">
          <label>De</label>
          <input type="date" className="form-input" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Até</label>
          <input type="date" className="form-input" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} />
        </div>
        <div className="form-group filter-actions">
          <label>&nbsp;</label>
          <button className="btn-primary" onClick={load}>Gerar</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="page-loading">Gerando relatório…</div> : data && (
        <>
          <div className="admin-cards">
            <div className="admin-card stat">
              <span className="stat-label">Novos clientes</span>
              <strong className="stat-value">{data.cust.newCustomers}</strong>
            </div>
            <div className="admin-card stat">
              <span className="stat-label">Clientes recorrentes</span>
              <strong className="stat-value">{data.cust.recurring}</strong>
            </div>
            <div className="admin-card stat">
              <span className="stat-label">Inativos (30d)</span>
              <strong className="stat-value">{data.cust.inactive}</strong>
            </div>
          </div>

          <div className="admin-grid-2">
            <div className="admin-card">
              <h2 className="card-title">Faturamento diário</h2>
              <div className="chart-bars">
                {(data.rev.serie || []).map(r => (
                  <div key={r.bucket} className="chart-bar-col" title={`${r.bucket}: ${formatMoney(r.total)}`}>
                    <div className="chart-bar" style={{ height: `${Math.round((Number(r.total) / maxRev) * 100)}%` }} />
                    <span className="chart-bar-label">{r.bucket.slice(5)}</span>
                  </div>
                ))}
                {(data.rev.serie || []).length === 0 && <p className="empty-state">Sem dados.</p>}
              </div>
              <div className="chart-total">Total: <strong className="gold">{formatMoney((data.rev.serie || []).reduce((s, r) => s + Number(r.total), 0))}</strong></div>
            </div>

            <div className="admin-card">
              <h2 className="card-title">Serviços (período)</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Serviço</th><th>Vendidos</th><th>Receita</th></tr></thead>
                  <tbody>
                    {(data.serv.services || []).map(s => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.sold}</td>
                        <td className="gold">{formatMoney(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="card-title">Desempenho dos barbeiros</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Barbeiro</th><th>Concluídos</th><th>Total</th><th>Receita</th></tr></thead>
                <tbody>
                  {(data.barb.barbers || []).map(b => (
                    <tr key={b.id}>
                      <td><strong>{b.name}</strong></td>
                      <td>{b.completed}</td>
                      <td>{b.total}</td>
                      <td className="gold">{formatMoney(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RelatoriosAdmin;