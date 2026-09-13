import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../api/client';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function HorariosAdmin() {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/api/hours')
      .then(d => {
        const base = [0, 1, 2, 3, 4, 5, 6].map(day => {
          const found = (d.hours || []).find(h => h.day_of_week === day);
          return found || { day_of_week: day, open_time: '09:00', close_time: '18:00', active: day === 0 ? 0 : 1 };
        });
        setHours(base);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (i, key, value) => {
    const next = [...hours];
    next[i] = { ...next[i], [key]: value };
    setHours(next);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiPut('/api/hours', { hours });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Carregando horários…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Horários</h1>
        <p className="admin-page-sub">Horário de funcionamento da barbearia.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">Horários salvos!</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Funciona</th>
                <th>Abertura</th>
                <th>Fechamento</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h, i) => (
                <tr key={h.day_of_week}>
                  <td><strong>{WEEKDAYS[h.day_of_week]}</strong></td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={!!h.active} onChange={e => update(i, 'active', e.target.checked ? 1 : 0)} />
                      <span className="switch-slider" />
                    </label>
                  </td>
                  <td>
                    <input type="time" className="form-input" value={h.open_time || ''} disabled={!h.active}
                      onChange={e => update(i, 'open_time', e.target.value)} />
                  </td>
                  <td>
                    <input type="time" className="form-input" value={h.close_time || ''} disabled={!h.active}
                      onChange={e => update(i, 'close_time', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-actions">
          <button className="btn-hero" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar horários'}</button>
        </div>
      </div>
    </div>
  );
}

export default HorariosAdmin;