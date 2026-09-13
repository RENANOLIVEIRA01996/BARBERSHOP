import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';

const API_URL = import.meta.env.VITE_API_URL || '';

function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServicos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/shop`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setServicos(data.services || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchServicos();
  }, [API_URL]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Carregando serviços...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Erro ao carregar serviços: {error}</div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container">
      <section className="page-header">
        <h1>Nossos Serviços</h1>
        <p>
          Cada serviço é executado com precisão e atenção aos detalhes,
          utilizando as melhores técnicas e produtos do mercado.
        </p>
      </section>

      <section className="services-grid">
        {servicos.map(servico => (
          <Link key={servico.id} to="/agendar" className="service-card" data-service-id={servico.id}>
            <div className="service-content">
              {servico.photo && (
                <img src={servico.photo} alt={servico.name} className="service-photo" />
              )}
              {!servico.photo && (
                <div className="service-photo-placeholder">
                  <img src="/assets/07_simbolo.png" alt="Símbolo" className="service-icon" />
                </div>
              )}
              <div className="service-info">
                <h3>{servico.name}</h3>
                <p className="service-desc">{servico.description}</p>
                <div className="service-meta">
                  <span className="service-duration">{servico.duration_minutes} min</span>
                  <span className="service-price">R$ {servico.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>
      </div>
      <Footer />
    </>
  );
}

export default Servicos;