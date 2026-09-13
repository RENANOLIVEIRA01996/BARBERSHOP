import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';

const API_URL = import.meta.env.VITE_API_URL || '';

function Barbeiros() {
  const [barbeiros, setBarbeiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBarbeiros = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/shop`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setBarbeiros(data.barbers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBarbeiros();
  }, [API_URL]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Carregando barbeiros...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Erro ao carregar barbeiros: {error}</div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container">
      <section className="page-header">
        <h1>Nossos Barbeiros</h1>
        <p>
          Conheça nossa equipe de profissionais qualificados, prontos para
          oferecer o melhor atendimento e estilo.
        </p>
      </section>

      <section className="barbers-grid">
        {barbeiros.map(barbeiro => (
          <Link key={barbeiro.id} to="/agendar" className="barber-card" data-barber-id={barbeiro.id}>
            <img
              src={barbeiro.photo ? `${API_URL}${barbeiro.photo}` : '/assets/05_perfil_redes_sociais.png'}
              alt={barbeiro.name}
              className="barber-avatar"
            />
            <div className="barber-info">
              <h3>{barbeiro.name}</h3>
              <p className="barber-specialty">
                {barbeiro.specialties && barbeiro.specialties.length > 0
                  ? barbeiro.specialties.join(', ')
                  : 'Cortes e barba'}
              </p>
              <p className="barber-desc">{barbeiro.description}</p>
            </div>
          </Link>
        ))}
      </section>
      </div>
      <Footer />
    </>
  );
}

export default Barbeiros;