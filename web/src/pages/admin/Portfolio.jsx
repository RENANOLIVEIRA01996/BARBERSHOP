import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPatch, mediaUrl } from '../../api/client';

function PortfolioAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ image: '', title: '', description: '', service_id: '', barber_id: '', published: true });
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([apiGet('/api/portfolio'), apiGet('/api/services'), apiGet('/api/barbers')])
      .then(([p, s, b]) => { setItems(p.items || []); setServices(s.services || []); setBarbers(b.barbers || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/portfolio', {
        ...form,
        service_id: form.service_id || null,
        barber_id: form.barber_id || null,
      });
      setForm({ image: '', title: '', description: '', service_id: '', barber_id: '', published: true });
      load();
    } catch (err) { setError(err.message); }
  };

  const toggle = async (item) => {
    try {
      await apiPatch(`/api/portfolio/${item.id}/publish`, { published: !item.published });
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remover este item?')) return;
    try { await apiDelete(`/api/portfolio/${id}`); load(); } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="page-loading">Carregando portfólio…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Portfólio</h1>
        <p className="admin-page-sub">Galeria de cortes da barbearia.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-card form-card">
        <h2 className="card-title">Novo item</h2>
        <form onSubmit={add} className="admin-form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Imagem (URL / caminho) *</label>
            <input className="form-input" required value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="/uploads/foto.jpg ou https://…" />
          </div>
          <div className="form-group">
            <label>Título</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Serviço</label>
            <select className="form-input" value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}>
              <option value="">—</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Barbeiro</label>
            <select className="form-input" value={form.barber_id} onChange={e => setForm({ ...form, barber_id: e.target.value })}>
              <option value="">—</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group filter-actions">
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </div>

      <div className="portfolio-grid-admin">
        {items.length === 0 ? <p className="empty-state">Nenhum item no portfólio.</p> : items.map(p => (
          <div key={p.id} className="portfolio-item-admin">
            <img src={mediaUrl(p.image)} alt={p.title || 'Corte'} />
            <div className="portfolio-item-info">
              <strong>{p.title || 'Sem título'}</strong>
              <span>{p.service_name || ''}{p.barber_name ? ` · ${p.barber_name}` : ''}</span>
              <span className={`badge ${p.published ? 'badge-active' : 'badge-inactive'}`}>{p.published ? 'Publicado' : 'Oculto'}</span>
            </div>
            <div className="td-actions">
              <button className="btn-outline btn-xs" onClick={() => toggle(p)}>{p.published ? 'Ocultar' : 'Publicar'}</button>
              <button className="btn-danger btn-xs" onClick={() => remove(p.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PortfolioAdmin;