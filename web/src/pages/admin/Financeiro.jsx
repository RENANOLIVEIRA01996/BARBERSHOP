import { useEffect, useState } from 'react';
import { apiGet, formatMoney } from '../../api/client';

function monthRange() {
  const now = new Date();
  const f = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const t = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate()}`;
  return { from: f, to: t };
}

function FinanceiroAdmin() {
  const [range, setRange] = useState(monthRange());
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet(`/api/financial/summary?from=${range.from}&to=${range.to}`),
      apiGet(`/api/payments?from=${range.from}&to=${range.to}`),
    ])
      .then(([s, p]) => { setSummary(s); setPayments(p.payments || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Financeiro</h1>
        <p className="admin-page-sub">Controle de pagamentos e faturamento.</p>
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
          <button className="btn-primary" onClick={load}>Aplicar</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="page-loading">Carregando…</div> : (
        <>
          <div className="admin-cards">
            <div className="admin-card stat">
              <span className="stat-label">Faturamento (concluídos)</span>
              <strong className="stat-value gold">{formatMoney(summary?.total)}</strong>
              <span>{summary?.count} atendimentos</span>
            </div>
            {(summary?.byMethod || []).map(m => (
              <div key={m.method} className="admin-card stat">
                <span className="stat-label">Pagamento · {m.method}</span>
                <strong className="stat-value">{formatMoney(m.total)}</strong>
                <span>{m.count} pagamento(s)</span>
              </div>
            ))}
            {(summary?.byMethod || []).length === 0 && (
              <div className="admin-card stat">
                <span className="stat-label">Sem pagamentos registrados</span>
                <strong className="stat-value">—</strong>
              </div>
            )}
          </div>

          <div className="admin-card">
            <h2 className="card-title">Pagamentos</h2>
            {payments.length === 0 ? (
              <p className="empty-state">Nenhum pagamento no período.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Serviço</th>
                      <th>Forma</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td>{p.appt_date}</td>
                        <td>{p.customer_name}</td>
                        <td>{p.service_name}</td>
                        <td>{p.method}</td>
                        <td className="gold">{formatMoney(p.value)}</td>
                        <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FinanceiroAdmin;