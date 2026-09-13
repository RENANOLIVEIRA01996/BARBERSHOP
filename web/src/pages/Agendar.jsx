import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';

const API_URL = import.meta.env.VITE_API_URL || '';

function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMin(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmtMin(mins) {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function brandUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

function formatDateBR(iso) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPrice(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Agendar() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [shopData, setShopData] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedBarberId, setSelectedBarberId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [appointmentCode, setAppointmentCode] = useState('');
  const [availableDays, setAvailableDays] = useState([]);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Shop data
  useEffect(() => {
    const fetchShop = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/public/shop`);
        if (!res.ok) throw new Error('Falha ao carregar a barbearia.');
        const data = await res.json();
        setShopData(data);
        setServices(data.services || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, []);

  // Available days for the calendar (service + barber)
  useEffect(() => {
    if (!selectedServiceId || !selectedBarberId) {
      setAvailableDays([]);
      setSelectedDate('');
      return;
    }
    let cancelled = false;
    const fetchDays = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/public/days?service_id=${selectedServiceId}&barber_id=${selectedBarberId}&days=60`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAvailableDays(data.days || []);
      } catch {
        /* ignore */
      }
    };
    fetchDays();
    return () => { cancelled = true; };
  }, [selectedServiceId, selectedBarberId]);

  // Slots for the selected date
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/public/availability?service_id=${selectedServiceId}&date=${selectedDate}&barber_id=${selectedBarberId || ''}`
        );
        if (!res.ok) throw new Error('Falha ao verificar horários.');
        const data = await res.json();
        const barberIdNum = Number(selectedBarberId);
        const slots = (data.slots || []).filter(
          s => !barberIdNum || Number(s.barber_id) === barberIdNum
        );
        if (!cancelled) setAvailableSlots(slots);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAvailability();
    return () => { cancelled = true; };
  }, [selectedServiceId, selectedBarberId, selectedDate]);

  const selectedService = useMemo(
    () => services.find(s => Number(s.id) === Number(selectedServiceId)),
    [services, selectedServiceId]
  );
  const selectedBarber = useMemo(
    () => (shopData?.barbers || []).find(b => Number(b.id) === Number(selectedBarberId)),
    [shopData, selectedBarberId]
  );

  // Full day grid for the selected date (available vs occupied/disabled)
  const timeSlots = useMemo(() => {
    if (!selectedDate || !shopData) return [];
    const dow = new Date(selectedDate + 'T00:00:00').getDay();
    const hours = (shopData.hours || []).find(h => Number(h.day_of_week) === dow);
    if (!hours || !hours.active || !hours.open_time || !hours.close_time) return [];

    const interval = Number(shopData.bookingRules?.slotInterval) || 30;
    const start = toMin(hours.open_time);
    const end = toMin(hours.close_time);
    const availSet = new Set(availableSlots.map(s => s.time));
    const out = [];
    for (let m = start; m + interval <= end; m += interval) {
      const time = fmtMin(m);
      out.push({
        time,
        end: fmtMin(m + interval),
        available: availSet.has(time),
      });
    }
    return out;
  }, [selectedDate, shopData, availableSlots]);

  // ---- Calendar helpers ----
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const offset = firstDay.getDay();
    const todayStr = ymd(new Date());
    const availSet = new Set(availableDays || []);
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      const dStr = ymd(d);
      const available = dStr >= todayStr && availSet.has(dStr);
      const selected = dStr === selectedDate;
      cells.push({ day, date: dStr, available, selected });
    }
    return cells;
  }, [viewMonth, availableDays, selectedDate]);

  const canGoPrev = useMemo(() => {
    const now = new Date();
    return (
      viewMonth.getFullYear() > now.getFullYear() ||
      (viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() > now.getMonth())
    );
  }, [viewMonth]);

  const canGoNext = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + 60);
    return (
      viewMonth.getFullYear() < max.getFullYear() ||
      (viewMonth.getFullYear() === max.getFullYear() && viewMonth.getMonth() < max.getMonth())
    );
  }, [viewMonth]);

  const changeMonth = (delta) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const goToStep1 = () => {
    setStep(1);
    const el = document.getElementById('agendamento-flow');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !selectedServiceId) return setError('Selecione um serviço.');
    if (step === 2 && !selectedBarberId) return setError('Selecione um barbeiro.');
    if (step === 3 && !selectedDate) return setError('Selecione uma data.');
    if (step === 4 && !selectedTime) return setError('Selecione um horário.');
    if (step === 5) {
      if (!formData.name.trim()) return setError('Informe seu nome.');
      if (!formData.whatsapp.trim()) return setError('Informe seu WhatsApp.');
    }
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        service_id: Number(selectedServiceId),
        barber_id: Number(selectedBarberId),
        date: selectedDate,
        start_time: selectedTime,
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim() || null,
      };
      const res = await fetch(`${API_URL}/api/public/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Não foi possível confirmar o agendamento.');
      setSuccess(true);
      setAppointmentCode(data.appointment?.code || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedServiceId(null);
    setSelectedBarberId(null);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedTime(null);
    setFormData({ name: '', whatsapp: '', email: '' });
    setAvailableDays([]);
    setSuccess(false);
    setAppointmentCode('');
    setViewMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };

  if (success) {
    return (
      <>
        <NavBar />
        <div className="container">
        <div className="card success-card">
          <div className="success-icon">✂️</div>
          <h2>Agendamento confirmado!</h2>
          <p>Seu código de agendamento é:</p>
          <div className="success-code">{appointmentCode}</div>
          <p style={{ marginTop: '1.5rem', color: '#b0b0b0' }}>
            Em breve entraremos em contato via WhatsApp para confirmar.
          </p>
          <div className="btn-group">
            <button onClick={() => navigate('/')} className="btn-outline">
              Voltar ao início
            </button>
            <button onClick={resetFlow} className="btn-primary">
              Novo agendamento
            </button>
          </div>
        </div>
      </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container">
      {/* HERO */}
      <section className="page-header">
        <h1>Agende seu horário</h1>
        <p>
          Cortes precisos, barba impecável e atendimento personalizado. Escolha abaixo
          o serviço, o barbeiro e o melhor momento para você.
        </p>
        <button onClick={goToStep1} className="btn-hero" style={{ marginTop: '1rem' }}>
          Começar agendamento
        </button>
      </section>

      <div id="agendamento-flow">
        {/* STEPPER */}
        <div className="stepper">
          {[
            { n: 1, label: 'Serviço' },
            { n: 2, label: 'Barbeiro' },
            { n: 3, label: 'Data' },
            { n: 4, label: 'Horário' },
            { n: 5, label: 'Cliente' },
            { n: 6, label: 'Confirmar' },
          ].map(item => (
            <div
              key={item.n}
              className={`stepper-step ${step > item.n ? 'completed' : ''} ${step === item.n ? 'active' : ''}`}
            >
              <div className="stepper-circle">{step > item.n ? '✓' : item.n}</div>
              <div className="stepper-label">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Erro */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* 1 — SERVIÇO */}
        {step === 1 && (
          <section className="step-card">
            <h2>Escolha o serviço</h2>
            <p className="step-desc">Selecione o serviço que você deseja realizar.</p>
            <div className="services-grid">
              {services.map(service => (
                <div
                  key={service.id}
                  className={`service-card ${Number(selectedServiceId) === Number(service.id) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setSelectedBarberId(null);
                    setSelectedDate('');
                    setAvailableSlots([]);
                    setSelectedTime(null);
                    setError(null);
                  }}
                >
                  <img
                    src="/assets/07_simbolo.png"
                    alt=""
                    className="service-icon"
                  />
                  <h3>{service.name}</h3>
                  <span className="service-duration">
                    {service.duration_minutes || service.duration} minutos
                  </span>
                  <div className="service-price">{formatPrice(service.price)}</div>
                </div>
              ))}
            </div>
            <div className="step-actions">
              <button onClick={goToStep1} className="btn-outline">Início</button>
              <button onClick={handleNext} className="btn-primary" disabled={!selectedServiceId}>
                Próximo
              </button>
            </div>
          </section>
        )}

        {/* 2 — BARBEIRO */}
        {step === 2 && (
          <section className="step-card">
            <h2>Escolha o barbeiro</h2>
            <p className="step-desc">Todos os nossos barbeiros são profissionais experientes.</p>
            {loading && <div className="empty-state">Carregando…</div>}
            {!loading && (shopData?.barbers || []).length === 0 && (
              <div className="empty-state">Nenhum barbeiro disponível no momento.</div>
            )}
            <div className="barbers-grid">
              {(shopData?.barbers || []).map(barber => (
                <div
                  key={barber.id}
                  className={`barber-card ${Number(selectedBarberId) === Number(barber.id) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBarberId(barber.id);
                    setSelectedDate('');
                    setAvailableSlots([]);
                    setSelectedTime(null);
                    setError(null);
                  }}
                >
                  <img
                    src={brandUrl(barber.photo)}
                    alt={barber.name}
                    className="barber-avatar"
                    onError={(e) => { e.target.src = '/assets/05_perfil_redes_sociais.png'; }}
                  />
                  <div>
                    <h3>{barber.name}</h3>
                    <div className="barber-specialty">
                      {(barber.specialties || []).join('  •  ') || 'Barbeiro'}
                    </div>
                    {barber.description && <p className="barber-desc">{barber.description}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="step-actions">
              <button onClick={handleBack} className="btn-outline">Voltar</button>
              <button onClick={handleNext} className="btn-primary" disabled={!selectedBarberId}>
                Próximo
              </button>
            </div>
          </section>
        )}

        {/* 3 — DATA */}
        {step === 3 && (
          <section className="step-card">
            <h2>Escolha a data</h2>
            <p className="step-desc">
              Dias em cinza escuro têm horários disponíveis para o barbeiro selecionado.
            </p>
            <div className="calendar">
              <div className="calendar-header">
                <button
                  type="button"
                  className="calendar-nav"
                  onClick={() => changeMonth(-1)}
                  disabled={!canGoPrev}
                  aria-label="Mês anterior"
                >
                  ‹
                </button>
                <div className="calendar-title">
                  {viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  type="button"
                  className="calendar-nav"
                  onClick={() => changeMonth(1)}
                  disabled={!canGoNext}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>
              <div className="calendar-grid">
                {WEEKDAYS.map((w, i) => (
                  <div key={i} className="calendar-dow">{w}</div>
                ))}
                {calendarCells.map((cell, i) =>
                  cell === null ? (
                    <div key={i} className="calendar-day empty" />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      className={`calendar-day ${cell.available ? 'available' : ''} ${cell.selected ? 'selected' : ''}`}
                      disabled={!cell.available}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setAvailableSlots([]);
                        setSelectedTime(null);
                        setError(null);
                      }}
                    >
                      {cell.day}
                    </button>
                  )
                )}
              </div>
              <div className="calendar-legend">
                <span className="legend-avail">Disponível</span>
                <span className="legend-sel">Selecionado</span>
              </div>
            </div>
            <div className="step-actions">
              <button onClick={handleBack} className="btn-outline">Voltar</button>
              <button onClick={handleNext} className="btn-primary" disabled={!selectedDate}>
                Próximo
              </button>
            </div>
          </section>
        )}

        {/* 4 — HORÁRIO */}
        {step === 4 && (
          <section className="step-card">
            <h2>Escolha o horário</h2>
            <p className="step-desc">
              {selectedDate ? formatDateBR(selectedDate) : ''}
            </p>
            {loading && <div className="empty-state">Verificando horários…</div>}
            {!loading && timeSlots.length === 0 && (
              <div className="empty-state">Nenhum horário disponível para esta data.</div>
            )}
            {!loading && timeSlots.length > 0 && (
              <>
                <div className="time-grid">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      type="button"
                      className={`time-slot ${slot.available ? '' : 'disabled'} ${selectedTime === slot.time ? 'active' : ''}`}
                      disabled={!slot.available}
                      title={`${slot.time} – ${slot.end}`}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setError(null);
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                <div className="time-legend">
                  <span className="legend-avail">Disponível</span>
                  <span className="legend-sel">Selecionado</span>
                  <span className="legend-off">Indisponível</span>
                </div>
              </>
            )}
            <div className="step-actions">
              <button onClick={handleBack} className="btn-outline">Voltar</button>
              <button onClick={handleNext} className="btn-primary" disabled={!selectedTime}>
                Próximo
              </button>
            </div>
          </section>
        )}

        {/* 5 — CLIENTE */}
        {step === 5 && (
          <section className="step-card">
            <h2>Dados do cliente</h2>
            <p className="step-desc">Como podemos identificar você no dia do atendimento?</p>
            <div className="form-group">
              <label htmlFor="name">Nome completo</label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp / telefone</label>
              <input
                id="whatsapp"
                type="tel"
                className="form-input"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">E-mail (opcional)</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </div>
            <div className="step-actions">
              <button onClick={handleBack} className="btn-outline">Voltar</button>
              <button onClick={handleNext} className="btn-primary">Revisar</button>
            </div>
          </section>
        )}

        {/* 6 — CONFIRMAÇÃO */}
        {step === 6 && (
          <section className="step-card">
            <h2>Confirme seu agendamento</h2>
            <p className="step-desc">Revise as informações antes de confirmar.</p>

            <div className="summary-card">
              <div className="summary-row">
                <span className="summary-label">Serviço</span>
                <span className="summary-value">{selectedService?.name || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Duração</span>
                <span className="summary-value">
                  {selectedService ? `${selectedService.duration_minutes || selectedService.duration} min` : '—'}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Barbeiro</span>
                <span className="summary-value">{selectedBarber?.name || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Data</span>
                <span className="summary-value">{selectedDate ? formatDateBR(selectedDate) : '—'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Horário</span>
                <span className="summary-value">{selectedTime || '—'}</span>
              </div>
              <div className="summary-total">
                <span className="summary-label">Valor</span>
                <span className="summary-value total">
                  {formatPrice(selectedService?.price || 0)}
                </span>
              </div>
            </div>

            <button type="button" className="btn-confirm" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Confirmando…' : 'CONFIRMAR AGENDAMENTO'}
            </button>

            <div className="step-actions">
              <button onClick={handleBack} className="btn-outline">Voltar</button>
            </div>
          </section>
        )}
      </div>
      </div>
      <Footer />
    </>
  );
}

export default Agendar;

