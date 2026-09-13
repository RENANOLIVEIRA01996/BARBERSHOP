import { useEffect, useState } from 'react';
import { apiGet, apiPatch, formatMoney } from '../../api/client';

function todayBR() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function AgendaAdmin() {
  const [date, setDate] = useState(todayBR());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    apiGet(`/api/appointments?date=${date}`)
      .then(d => setItems(d.appointments || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [date]);

  const changeStatus = async (id, status) => {
    try {
      await apiPatch(`/api/appointments/${id}/status`, { status });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Agenda</h1>
        <p className="admin-page-sub">Visualização diária dos atendimentos.</p>
      </div>

      <div className="admin-filters">
        <div className="form-group">
          <label>Data</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="page-loading">Carregando agenda…</div> : (
        <div className="admin-card">
          {items.length === 0 ? (
            <p className="empty-state">Nenhum agendamento para esta data.</p>
          ) : (
            <div className="timeline-day">
              {items.map(a => (
                <div key={a.id} className={`timeline-item status-${a.status}`}>
                  <div className="timeline-time">{a.start_time}</div>
                  <div className="timeline-body">
                    <strong>{a.customer_name}</strong>
                    <span>{a.service_name} · {a.barber_name || 'Qualquer barbeiro'} · {formatMoney(a.value)}</span>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </div>
                  <div className="td-actions">
                    {['scheduled', 'confirmed'].includes(a.status) && (
                      <>
                        <button className="btn-primary btn-xs" onClick={() => changeStatus(a.id, 'completed')}>OK</button>
                        <button className="btn-danger btn-xs" onClick={() => changeStatus(a.id, 'cancelled')}>X</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgendaAdmin;