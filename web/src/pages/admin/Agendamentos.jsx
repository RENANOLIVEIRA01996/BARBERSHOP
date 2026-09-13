import { useEffect, useState } from 'react';
import { apiGet, apiPatch, formatMoney, formatDateTimeBR } from '../../api/client';

const STATUS_LABEL = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

function AgendamentosAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ date: '', status: '', from: '', to: '' });

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.date) q.set('date', filters.date);
    if (filters.status) q.set('status', filters.status);
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    apiGet(`/api/appointments${q.toString() ? `?${q}` : ''}`)
      .then(d => setItems(d.appointments || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters.status, filters.date]);

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
        <h1>Agendamentos</h1>
        <p className="admin-page-sub">Consulte, filtre e gerencie todos os agendamentos.</p>
      </div>

      {/* Filtros */}
      <div className="admin-filters">
        <div className="form-group">
          <label>Data específica</label>
          <input type="date" className="form-input" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>De</label>
          <input type="date" className="form-input" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Até</label>
          <input type="date" className="form-input" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="form-input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group filter-actions">
          <label>&nbsp;</label>
          <button className="btn-primary" onClick={load}>Filtrar</button>
          <button className="btn-outline" onClick={() => setFilters({ date: '', status: '', from: '', to: '' })}>Limpar</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="page-loading">Carregando…</div> : (
        <div className="admin-card">
          {items.length === 0 ? (
            <p className="empty-state">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Barbeiro</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th className="th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(a => (
                    <tr key={a.id}>
                      <td>{a.date} <span className="muted">· {a.start_time}</span></td>
                      <td><strong>{a.customer_name}</strong></td>
                      <td>{a.service_name} <span className="muted">({a.service_duration}min)</span></td>
                      <td>{a.barber_name || '—'}</td>
                      <td className="gold">{formatMoney(a.value)}</td>
                      <td><span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span></td>
                      <td className="td-actions">
                        {a.status === 'scheduled' && <button className="btn-outline btn-xs" onClick={() => changeStatus(a.id, 'confirmed')}>Confirmar</button>}
                        {['scheduled', 'confirmed'].includes(a.status) && <button className="btn-primary btn-xs" onClick={() => changeStatus(a.id, 'completed')}>Concluir</button>}
                        {['scheduled', 'confirmed'].includes(a.status) && <button className="btn-danger btn-xs" onClick={() => changeStatus(a.id, 'cancelled')}>Cancelar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgendamentosAdmin;