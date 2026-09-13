import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../api/client';

const BOOKING_FIELDS = [
  ['booking.min_advance_hours', 'Aviso mínimo p/ agendar (horas)'],
  ['booking.max_future_days', 'Permitir agendar até (dias)'],
  ['booking.slot_interval_minutes', 'Intervalo entre horários (min)'],
  ['booking.cancel_deadline_hours', 'Cancelamento até (h antes)'],
  ['booking.allow_reschedule', 'Permitir reagendar'],
  ['booking.allow_cancel', 'Permitir cancelar pelo cliente'],
];

function ConfiguracoesAdmin() {
  const [shop, setShop] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/api/barbershop'), apiGet('/api/settings')])
      .then(([b, s]) => {
        setShop(b.shop);
        setSettings(s.settings || {});
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const saveShop = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const updated = await apiPut('/api/barbershop', shop);
      setShop(updated.shop);
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const payload = {};
      for (const [k] of BOOKING_FIELDS) payload[k] = settings[k];
      const updated = await apiPut('/api/settings', payload);
      setSettings(updated.settings);
      setMessage('Configurações salvas!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando configurações…</div>;

  const field = (key) => shop ? shop[key] ?? '' : '';
  const setField = (key, value) => setShop({ ...shop, [key]: value });
  const boolValue = (key) => {
    const v = settings[key];
    return v === '1' || v === true || v === 'true';
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Configurações</h1>
        <p className="admin-page-sub">Perfil da barbearia e regras de agendamento.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {shop && (
        <form className="admin-card form-card" onSubmit={saveShop}>
          <h2 className="card-title">Perfil da barbearia</h2>
          <div className="admin-form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input className="form-input" value={field('name')} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tagline</label>
              <input className="form-input" value={field('tagline')} onChange={e => setField('tagline', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Descrição</label>
              <textarea className="form-input" rows="3" value={field('description')} onChange={e => setField('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input className="form-input" value={field('phone')} onChange={e => setField('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label>WhatsApp (com DDI/DDD)</label>
              <input className="form-input" value={field('whatsapp')} onChange={e => setField('whatsapp', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Instagram</label>
              <input className="form-input" value={field('instagram')} onChange={e => setField('instagram', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mapa (URL)</label>
              <input className="form-input" value={field('map_url')} onChange={e => setField('map_url', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Endereço</label>
              <input className="form-input" value={field('address')} onChange={e => setField('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label>CEP</label>
              <input className="form-input" value={field('cep')} onChange={e => setField('cep', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input className="form-input" value={field('city')} onChange={e => setField('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label>UF</label>
              <input className="form-input" value={field('state')} onChange={e => setField('state', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-hero" disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</button>
          </div>
        </form>
      )}
<form className="admin-card form-card" onSubmit={saveSettings}>
        <h2 className="card-title">Regras de agendamento</h2>
        <div className="admin-form-grid">
          {BOOKING_FIELDS.map(([key, label]) => {
            if (['booking.allow_reschedule', 'booking.allow_cancel'].includes(key)) {
              return (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <select className="form-input" value={boolValue(key) ? '1' : '0'} onChange={e => setSettings({ ...settings, [key]: e.target.value })}>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </div>
              );
            }
            return (
              <div key={key} className="form-group">
                <label>{label}</label>
                <input className="form-input" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
              </div>
            );
          })}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-hero" disabled={saving}>{saving ? 'Salvando…' : 'Salvar regras'}</button>
        </div>
      </form>
    </div>
  );
}

export default ConfiguracoesAdmin;