import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, mediaUrl } from '../../api/client';

function BarbeirosAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/api/barbers')
      .then(d => setItems(d.barbers || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing({});
    setForm({ name: '', photo: '', description: '', phone: '', whatsapp: '', specialties: '', status: 'active' });
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      ...item,
      specialties: (item.specialties || []).join(', '),
      whatsapp: item.whatsapp || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        photo: form.photo || null,
        description: form.description || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp ? String(form.whatsapp).replace(/\D/g, '') : null,
        specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        status: form.status || 'active',
      };
      if (editing.id) await apiPut(`/api/barbers/${editing.id}`, payload);
      else await apiPost('/api/barbers', payload);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir o barbeiro "${item.name}"?`)) return;
    try {
      await apiDelete(`/api/barbers/${item.id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="page-loading">Carregando barbeiros…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Barbeiros</h1>
        <p className="admin-page-sub">Equipe de profissionais da casa.</p>
        <button className="btn-hero btn-sm" onClick={openNew}>+ Novo barbeiro</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {editing && (
        <div className="admin-card form-card">
          <h2 className="card-title">{editing.id ? 'Editar barbeiro' : 'Novo barbeiro'}</h2>
          <div className="admin-form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Especialidades (separadas por vírgula)</label>
              <input className="form-input" value={form.specialties || ''} onChange={e => setForm({ ...form, specialties: e.target.value })} placeholder="Degradê, Barba" />
            </div>
            <div className="form-group">
              <label>Foto (URL / caminho)</label>
              <input className="form-input" value={form.photo || ''} onChange={e => setForm({ ...form, photo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>WhatsApp</label>
              <input className="form-input" value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea className="form-input" rows="3" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button className="btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        {items.length === 0 ? (
          <p className="empty-state">Nenhum barbeiro cadastrado.</p>
        ) : (
          <div className="admin-grid-list">
            {items.map(b => (
              <div key={b.id} className="admin-list-item">
                <img src={mediaUrl(b.photo) || '/assets/05_perfil_redes_sociais.png'} alt={b.name} className="admin-list-avatar" />
                <div className="admin-list-info">
                  <strong>{b.name}</strong>
                  <span>{(b.specialties || []).join(', ') || 'Cortes e barba'}</span>
                  <span className={`badge badge-${b.status}`}>{b.status}</span>
                </div>
                <div className="td-actions">
                  <button className="btn-outline btn-xs" onClick={() => openEdit(b)}>Editar</button>
                  <button className="btn-danger btn-xs" onClick={() => handleDelete(b)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BarbeirosAdmin;