import { useEffect, useState } from 'react';
import { apiGet, formatDateTimeBR } from '../../api/client';

function ClientesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const load = () => {
    setLoading(true);
    apiGet(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(d => setItems(d.customers || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openDetail = async (id) => {
    try {
      const d = await apiGet(`/api/customers/${id}`);
      setDetail(d);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="page-loading">Carregando clientes…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Clientes</h1>
        <p className="admin-page-sub">Cadastro e histórico de atendimentos.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-filters">
        <div className="form-group">
          <label>Buscar (nome / WhatsApp / e-mail)</label>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite para buscar…" />
        </div>
        <div className="form-group filter-actions">
          <label>&nbsp;</label>
          <button className="btn-primary" onClick={load}>Buscar</button>
        </div>
      </div>

      <div className="admin-card">
        {items.length === 0 ? (
          <p className="empty-state">Nenhum cliente encontrado.</p>
        ) : (
          <div className="admin-grid-list">
            {items.map(c => (
              <button key={c.id} className="admin-list-item clickable" onClick={() => openDetail(c.id)}>
                <div className="admin-list-avatar avatar-initial">{String(c.name || '?').charAt(0).toUpperCase()}</div>
                <div className="admin-list-info">
                  <strong>{c.name}</strong>
                  <span>{c.whatsapp ? `+${c.whatsapp}` : 'sem WhatsApp'}</span>
                  <span>{c.completed_visits} visitas concluídas</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <div className="admin-modal">
          <div className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>{detail.customer.name}</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <p className="admin-page-sub">
              WhatsApp: {detail.customer.whatsapp ? `+${detail.customer.whatsapp}` : '—'} ·
              E-mail: {detail.customer.email || '—'} · Cadastro: {formatDateTimeBR(detail.customer.created_at)}
            </p>
            {detail.customer.notes && <p className="notes-box">{detail.customer.notes}</p>}
            <h3 className="card-title">Histórico de agendamentos</h3>
            {detail.history.length === 0 ? (
              <p className="empty-state">Sem histórico.</p>
            ) : (
              <div className="agenda-list">
                {detail.history.map(h => (
                  <div key={h.id} className="agenda-row">
                    <div className="agenda-when">
                      <span className="agenda-time">{h.start_time}</span>
                      <span className="agenda-date">{h.date}</span>
                    </div>
                    <div className="agenda-who">
                      <strong>{h.service_name}</strong>
                      <span>{h.barber_name || '—'}</span>
                    </div>
                    <span className={`badge badge-${h.status}`}>{h.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientesAdmin;