import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../../api/client';

function BloqueiosAdmin() {
  const [blocked, setBlocked] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', start_time: '09:00', end_time: '10:00', all_day: false, reason: '' });
  const [holidayForm, setHolidayForm] = useState({ title: '', date: '', type: 'holiday' });
  const [tab, setTab] = useState('blocked');

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet('/api/blocked?all=1'),
      apiGet('/api/holidays'),
    ])
      .then(([b, h]) => { setBlocked(b.blocked || []); setHolidays(h.holidays || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addBlock = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/blocked', form);
      setForm({ title: '', date: '', start_time: '09:00', end_time: '10:00', all_day: false, reason: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const removeBlock = async (id) => {
    try { await apiDelete(`/api/blocked/${id}`); load(); } catch (err) { setError(err.message); }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/holidays', holidayForm);
      setHolidayForm({ title: '', date: '', type: 'holiday' });
      load();
    } catch (err) { setError(err.message); }
  };

  const removeHoliday = async (id) => {
    try { await apiDelete(`/api/holidays/${id}`); load(); } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="page-loading">Carregando…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Bloqueios &amp; Folgas</h1>
        <p className="admin-page-sub">Bloqueie horários ou marque feriados/folgas.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-tabs">
        <button className={`tab ${tab === 'blocked' ? 'active' : ''}`} onClick={() => setTab('blocked')}>Bloqueios</button>
        <button className={`tab ${tab === 'holidays' ? 'active' : ''}`} onClick={() => setTab('holidays')}>Feriados / Folgas</button>
      </div>

      {tab === 'blocked' && (
        <>
          <div className="admin-card form-card">
            <h2 className="card-title">Novo bloqueio</h2>
            <form onSubmit={addBlock} className="admin-form-grid">
              <div className="form-group">
                <label>Título</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Fechado para manutenção" />
              </div>
              <div className="form-group">
                <label>Data *</label>
                <input type="date" className="form-input" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              {!form.all_day && (
                <>
                  <div className="form-group">
                    <label>De</label>
                    <input type="time" className="form-input" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Até</label>
                    <input type="time" className="form-input" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Motivo</label>
                <input className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} />
                  Dia inteiro
                </label>
              </div>
              <div className="form-group filter-actions">
                <button type="submit" className="btn-primary">Adicionar</button>
              </div>
            </form>
          </div>

          <div className="admin-card">
            {blocked.length === 0 ? <p className="empty-state">Nenhum bloqueio.</p> : (
              <div className="agenda-list">
                {blocked.map(b => (
                  <div key={b.id} className="agenda-row">
                    <div className="agenda-when">
                      <span className="agenda-date">{b.date}</span>
                      <span className="agenda-time">{b.all_day ? 'Dia inteiro' : `${b.start_time}–${b.end_time}`}</span>
                    </div>
                    <div className="agenda-who">
                      <strong>{b.title}</strong>
                      <span>{b.reason || '—'}{b.is_recurring ? ' · recorrente' : ''}</span>
                    </div>
                    <button className="btn-danger btn-xs" onClick={() => removeBlock(b.id)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
{tab === 'holidays' && (
        <>
          <div className="admin-card form-card">
            <h2 className="card-title">Novo feriado / folga</h2>
            <form onSubmit={addHoliday} className="admin-form-grid">
              <div className="form-group">
                <label>Título *</label>
                <input className="form-input" required value={holidayForm.title} onChange={e => setHolidayForm({ ...holidayForm, title: e.target.value })} placeholder="Natal" />
              </div>
              <div className="form-group">
                <label>Data *</label>
                <input type="date" className="form-input" required value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="form-input" value={holidayForm.type} onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}>
                  <option value="holiday">Feriado</option>
                  <option value="leave">Folga</option>
                  <option value="vacation">Férias</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="form-group filter-actions">
                <button type="submit" className="btn-primary">Adicionar</button>
              </div>
            </form>
          </div>

          <div className="admin-card">
            {holidays.length === 0 ? <p className="empty-state">Nenhum feriado/folga.</p> : (
              <div className="agenda-list">
                {holidays.map(h => (
                  <div key={h.id} className="agenda-row">
                    <div className="agenda-when">
                      <span className="agenda-date">{h.date}</span>
                    </div>
                    <div className="agenda-who">
                      <strong>{h.title}</strong>
                      <span>{h.type}{h.recurring ? ' · recorrente' : ''}</span>
                    </div>
                    <button className="btn-danger btn-xs" onClick={() => removeHoliday(h.id)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BloqueiosAdmin;