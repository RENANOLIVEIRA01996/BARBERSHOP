import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const FULL_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function Footer() {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/public/shop`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.shop) setShop(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const s = shop?.shop || {};
  const hours = (shop?.hours || []).filter((h) => h.active);

  const timesFor = (days) => {
    const times = hours
      .filter((h) => days.includes(h.day_of_week))
      .map((h) => (h.open_time && h.close_time ? `${h.open_time} – ${h.close_time}` : null))
      .filter(Boolean);
    return [...new Set(times)];
  };

  const schedule = [
    { label: 'Segunda a Quinta', times: timesFor([1, 2, 3, 4]) },
    { label: 'Sexta', times: timesFor([5]) },
    { label: 'Sábado', times: timesFor([6]) },
    { label: 'Domingo', times: timesFor([0]) },
  ].filter((g) => g.times.length > 0);

  const instagramUser = (s.instagram || '').replace('@', '');

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/assets/02_logo_horizontal.png" alt="Henrique Barber" />
          <p className="footer-tagline">{s.tagline || 'Barbearia premium'}</p>
          <p className="footer-desc">
            {s.description ||
              'Cortes precisos, barba impecável e aquele cuidado de verdade. Atendimento personalizado do primeiro ao último minuto.'}
          </p>
        </div>

        <div className="footer-col">
          <h4>Horário de funcionamento</h4>
          <ul className="footer-hours">
            {schedule.length > 0 ? (
              schedule.map((g) => (
                <li key={g.label}>
                  <span>{g.label}</span>
                  <strong>{g.times.join(' · ')}</strong>
                </li>
              ))
            ) : (
              <li>
                <span>Em horários especiais</span>
                <strong>Consulte no WhatsApp</strong>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contato</h4>
          <ul className="footer-contact">
            <li>
              <span>Endereço</span>
              <span>{s.address}
                {s.city ? ` — ${s.city}${s.state ? `, ${s.state}` : ''}` : ''}
              </span>
            </li>
            <li>
              <span>Telefone</span>
              <span>{s.phone}</span>
            </li>
            {s.whatsapp && (
              <li>
                <span>WhatsApp</span>
                <a
                  href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Olá! Quero agendar um horário. 🕐')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chamar no WhatsApp
                </a>
              </li>
            )}
            {instagramUser && (
              <li>
                <span>Instagram</span>
                <a
                  href={`https://instagram.com/${instagramUser}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.instagram}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Navegação</h4>
          <nav className="footer-nav">
            <Link to="/">Início</Link>
            <Link to="/servicos">Serviços</Link>
            <Link to="/barbeiros">Barbeiros</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/contato">Contato</Link>
            <Link to="/agendar">Agendar horário</Link>
            <Link to="/admin/login">Área do administrador</Link>
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {new Date().getFullYear()} {s.name || 'HENRIQUE BARBER'} — Todos os direitos reservados.</span>
          <span className="footer-made">
            Feito com <span className="gold">✂</span> e precisão
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;