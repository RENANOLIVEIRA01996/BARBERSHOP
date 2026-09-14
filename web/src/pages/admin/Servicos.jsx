import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, formatMoney, mediaUrl } from '../../api/client';

function ServicosAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = fechado, {}=novo, obj=editar
  const [form, setForm] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/api/services')
      .then(d => setItems(d.services || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing({});
    setForm({ name: '', description: '', price: '', duration_minutes: '', status: 'active' });
    setImagePreview(null);
    setImageFile(null);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item });
    if (item.photo) {
      setImagePreview(mediaUrl(item.photo));
      setImageFile(null); // we don't have the file content, just the URL for preview
    } else {
      setImagePreview(null);
      setImageFile(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    // Permite escolher o mesmo arquivo novamente em trocas subsequentes
    e.target.value = '';
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Se o usuário escolheu um novo arquivo, sobe a imagem e pega a URL pública
      let photo = form.photo || null;
      if (imageFile) {
        photo = await apiUpload(imageFile); // ex.: /uploads/123-456.png
      } else if (imagePreview === null) {
        photo = null; // usuário removeu a foto
      }

      const payload = {
        ...form,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        photo,
      };
      if (editing.id) {
        await apiPut(`/api/services/${editing.id}`, payload);
      } else {
        await apiPost('/api/services', payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir o serviço "${item.name}"?`)) return;
    try {
      await apiDelete(`/api/services/${item.id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="page-loading">Carregando serviços…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Serviços</h1>
        <p className="admin-page-sub">Preços e durações são exibidos sempre do banco.</p>
        <button className="btn-hero btn-sm" onClick={openNew}>+ Novo serviço</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {editing && (
        <div className="admin-card form-card">
          <h2 className="card-title">{editing.id ? 'Editar serviço' : 'Novo serviço'}</h2>
          <div className="admin-form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <input className="form-input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Preço (R$) *</label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Duração (min) *</label>
              <input type="number" min="5" step="5" className="form-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Foto do serviço</label>
              <div className="service-photo-upload">
                {imagePreview ? (
                  <div className="service-photo-preview-wrap">
                    <img src={imagePreview} alt="Prévia da foto" className="service-photo-preview" />
                    <div className="service-photo-actions">
                      <label className="btn-outline btn-sm">
                        Trocar foto
                        <input type="file" accept="image/*" className="file-input" onChange={handleImageChange} />
                      </label>
                      <button className="btn-danger btn-sm" onClick={handleImageRemove}>Remover</button>
                    </div>
                  </div>
                ) : (
                  <label className="btn-hero btn-sm service-photo-add">
                    <span>Adicionar foto</span>
                    <input type="file" accept="image/*" className="file-input" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button className="btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-table-wrap">
          {items.length === 0 ? (
            <p className="empty-state">Nenhum serviço cadastrado.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nome</th>
                  <th>Duração</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Concluídos</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id}>
                    <td className="admin-service-photo-cell">
                      {s.photo ? (
                        <img src={mediaUrl(s.photo)} alt={s.name} className="admin-service-photo-thumb" />
                      ) : (
                        <span className="admin-service-photo-empty">—</span>
                      )}
                    </td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.duration_minutes} min</td>
                    <td className="gold">{formatMoney(s.price)}</td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td>{s.completed_count}</td>
                    <td className="td-actions">
                      <button className="btn-outline btn-xs" onClick={() => openEdit(s)}>Editar</button>
                      <button className="btn-danger btn-xs" onClick={() => handleDelete(s)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServicosAdmin;