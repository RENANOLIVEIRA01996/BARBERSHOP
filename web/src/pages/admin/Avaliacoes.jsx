import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiDelete, formatDateTimeBR } from '../../api/client';

function AvaliacoesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    apiGet(`/api/reviews${filter ? `?status=${filter}` : ''}`)
      .then(d => setItems(d.reviews || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const setStatus = async (id, status) => {
    try { await apiPatch(`/api/reviews/${id}/status`, { status }); load(); }
    catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    try { await apiDelete(`/api/reviews/${id}`); load(); }
    catch (e) { setError(e.message); }
  };

  if (loading) return <div className="page-loading">Carregando avaliações…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Avaliações</h1>
        <p className="admin-page-sub">Aprove, oculte ou remova avaliações dos clientes.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-tabs">
        <button className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Todas</button>
        <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pendentes</button>
        <button className={`tab ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Aprovadas</button>
        <button className={`tab ${filter === 'hidden' ? 'active' : ''}`} onClick={() => setFilter('hidden')}>Ocultas</button>
      </div>

      <div className="admin-card">
        {items.length === 0 ? (
          <p className="empty-state">Nenhuma avaliação.</p>
        ) : (
          <div className="reviews-list">
            {items.map(r => (
              <div key={r.id} className="review-item">
                <div className="review-head">
                  <div>
                    <strong>{r.customer_name}</strong>
                    <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <span className="muted">{formatDateTimeBR(r.created_at)}</span>
                </div>
                {r.comment && <p className="review-comment">“{r.comment}”</p>}
                {r.service_name && <span className="muted">Serviço: {r.service_name}</span>}
                <div className="review-actions">
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                  {r.status !== 'approved' && <button className="btn-primary btn-xs" onClick={() => setStatus(r.id, 'approved')}>Aprovar</button>}
                  {r.status !== 'hidden' && <button className="btn-outline btn-xs" onClick={() => setStatus(r.id, 'hidden')}>Ocultar</button>}
                  <button className="btn-danger btn-xs" onClick={() => remove(r.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AvaliacoesAdmin;