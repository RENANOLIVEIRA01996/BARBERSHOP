import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import { Helmet } from 'react-helmet';

const API_URL = import.meta.env.VITE_API_URL || '';

/* ---------- ícones SVG dos serviços ---------- */
function ServiceIcon({ name }) {
  const n = (name || '').toLowerCase();
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (n.includes('barba')) {
    return (
      <svg {...common}>
        <rect x="3" y="9" width="18" height="6" rx="1.5" />
        <path d="M7 15v3M10 15v3M14 15v3M17 15v3" />
        <path d="M5 9c0-2 1.5-3 3-4" />
        <path d="M21 9c-1.2 1.4-2.6 2-4 2" />
      </svg>
    );
  }
  if (n.includes('sobrancelha') || n.includes('peeling') || n.includes('skin')) {
    return (
      <svg {...common}>
        <path d="M3 16l3-6 3 6" />
        <path d="M8 13.5h2.5l2.5-4 2.5 4H18" />
        <path d="M18 16l3-6 3 3-3 3-3-3 3-6" />
      </svg>
    );
  }
  if (n.includes('combo') || n.includes('completo') || n.includes('kids') || n.includes('criança')) {
    return (
      <svg {...common}>
        <path d="M12 3l1.9 4.6L19 9l-4.6 1.9L12 16l-1.9-5.1L5 9l5.1-1.4L12 3z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.6 15.4" />
      <path d="M13.5 8.5L20 4" />
      <path d="M8.6 8.6L3 3" />
      <path d="M20 20L9 9" />
    </svg>
  );
}

/* ---------- estrelas ---------- */
function Stars({ rating }) {
  const total = 5;
  return (
    <span className="stars" aria-label={`${rating} de ${total} estrelas`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < Math.round(rating) ? 'on' : 'off'}>★</span>
      ))}
    </span>
  );
}

const formatPrice = (v) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/public/shop`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const shop = data?.shop || {};
  const services = data?.services || [];
  const barbers = data?.barbers || [];
  const reviews = data?.reviews || [];
  const rating = data?.rating || { avg: '5.0', count: reviews.length };

  return (
    <>
      <Helmet>
        <title>Henrique Barber - Barbearia Premium</title>
        <meta name="description" content="Agende seu horário online na Henrique Barber. Barbearia premium com atendimento personalizado, barbeiros qualificados e produtos de alta qualidade." />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://henriquebarber.com.br/" />
        <meta property="og:title" content="Henrique Barber - Barbearia Premium" />
        <meta property="og:description" content="Agende seu horário online na Henrique Barber. Barbearia premium com atendimento personalizado, barbeiros qualificados e produtos de alta qualidade." />
        <meta property="og:image" content="https://henriquebarber.com.br/assets/banner.jpg" />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://henriquebarber.com.br/" />
        <meta property="twitter:title" content="Henrique Barber - Barbearia Premium" />
        <meta property="twitter:description" content="Agende seu horário online na Henrique Barber. Barbearia premium com atendimento personalizado, barbeiros qualificados e produtos de alta qualidade." />
        <meta property="twitter:image" content="https://henriquebarber.com.br/assets/banner.jpg" />
      </Helmet>

      <main className="lp">
        {/* ============ HERO ============ */}
        <section className="lp-hero">
          <div
            className="lp-hero-media"
            role="img"
            aria-label="Banner Henrique Barber — barbearia premium"
          />
          <div className="container lp-hero-inner">
            <span className="lp-eyebrow">✂ Barbearia premium</span>
            <h1 className="lp-hero-title">
              Seu estilo.
              <br />
              <span className="gold">Seu momento.</span>
            </h1>
            <p className="lp-hero-sub">
              {shop.description ||
                'Cortes precisos, barba impecável e aquele cuidado de verdade. Atendimento personalizado do primeiro ao último minuto.'}
            </p>
            <div className="lp-hero-actions">
              <Link to="/agendar" className="btn-gold">Agendar horário</Link>
              <Link to="/servicos" className="btn-ghost">Conheça os serviços</Link>
            </div>
            <div className="lp-hero-stats">
              <div className="stat">
                <strong>{services.length}</strong>
                <span>Serviços</span>
              </div>
              <div className="stat">
                <strong>{rating.avg}</strong>
                <span>Avaliação média</span>
              </div>
              <div className="stat">
                <strong>{barbers.length}</strong>
                <span>Barbeiros</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SERVIÇOS ============ */}
        <section className="lp-section lp-section-alt">
          <div className="container">
            <div className="lp-section-head">
              <span className="lp-section-eyebrow">Nossos serviços</span>
              <h2>Tudo para o seu visual</h2>
              <p>Corte, barba e tratamentos executados com técnica apurada e as melhores marcas do mercado.</p>
            </div>

            {services.length === 0 ? (
              <div className="empty-state">Os serviços ainda não foram cadastrados.</div>
            ) : (
              <div className="lp-services-grid">
                {services.map((s) => (
                  <Link key={s.id} to="/agendar" className="lp-service-card">
                    <div className="lp-service-icon">
                      <ServiceIcon name={s.name} />
                    </div>
                    <h3>{s.name}</h3>
                    <span className="lp-service-meta">{s.duration_minutes} min</span>
                    <p className="lp-service-desc">{s.description}</p>
                    <span className="lp-service-price">{formatPrice(s.price)}</span>
                    <span className="btn-mini">Agendar →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============ SOBRE / EQUIPE ============ */}
        <section className="lp-section">
          <div className="container lp-about-grid">
            <div className="lp-about-media">
              <div className="img-frame">
                <img src="/assets/06_wallpaper.png" alt="Ambiente Henrique Barber" />
              </div>
              <div className="lp-about-badge">
                Atenção aos
                <br />
                detalhes
              </div>
            </div>
            <div className="lp-about-text">
              <span className="lp-section-eyebrow">Sobre a casa</span>
              <h2>Tradição e técnica em cada corte</h2>
              <p>
                A HENRIQUE BARBER nasceu da paixão pelo estilo masculino. Aqui, cada cliente é único e
                recebe um atendimento sob medida: da conversa sobre o corte desejado ao acabamento impecável.
              </p>
              <ul className="lp-about-points">
                <li>Atendimento personalizado</li>
                <li>Barbeiros qualificados</li>
                <li>Produtos premium</li>
                <li>Ambiente sofisticado</li>
                <li>Agendamento online</li>
                <li>Acabamento impecável</li>
              </ul>

              {barbers.length > 0 && (
                <div className="lp-team-section">
                  <span className="lp-section-eyebrow">Nossa equipe</span>
                  <div className="lp-team">
                    {barbers.map((b) => (
                      <Link key={b.id} to="/barbeiros" className="lp-team-card">
                        <img
                          src={b.photo ? `${API_URL}${b.photo}` : '/assets/05_perfil_redes_sociais.png'}
                          alt={b.name}
                        />
                        <div>
                          <div className="name">{b.name}</div>
                          <div className="spec">
                            {b.specialties && b.specialties.length > 0
                              ? b.specialties.slice(0, 2).join(' · ')
                              : 'Especialista'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/sobre" className="btn-gold" style={{ marginTop: '2.2rem' }}>
                Conheça nossa história
              </Link>
            </div>
          </div>
        </section>

        {/* ============ AVALIAÇÕES ============ */}
        {reviews.length > 0 && (
          <section className="lp-section lp-section-alt">
            <div className="container">
              <div className="lp-section-head">
                <span className="lp-section-eyebrow">Avaliações</span>
                <h2>Quem confia, recomenda</h2>
                <p>A satisfação dos nossos clientes é o nosso maior prêmio.</p>
              </div>

              <div className="lp-reviews-head">
                <span className="avg">{rating.avg}</span>
                <div>
                  <Stars rating={Number(rating.avg)} />
                  <div className="count">
                    {rating.count} {rating.count === 1 ? 'avaliação' : 'avaliações'}
                  </div>
                </div>
              </div>

              <div className="lp-reviews-grid">
                {reviews.slice(0, 6).map((r) => (
                  <div key={r.id} className="lp-review-card">
                    <Stars rating={r.rating} />
                    <p>{r.comment || 'Atendimento excelente!'}</p>
                    <div className="customer">{r.customer_name}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============ CTA FINAL ============ */}
        <section className="lp-cta">
          <div className="container lp-cta-inner">
            <h2>Pronto para mudar o visual?</h2>
            <p>Escolha o serviço, o barbeiro e o horário — tudo em poucos cliques.</p>
            <Link to="/agendar" className="btn-gold btn-lg">Agendar horário agora</Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;