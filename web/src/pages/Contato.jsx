import { useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import { Helmet } from 'react-helmet';

const API_URL = import.meta.env.VITE_API_URL || '';

function Contato() {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to send message');
      }
      setSuccess(true);
      setFormData({ name: '', whatsapp: '', email: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="container">
      <section className="page-header">
        <h1>Fale Conosco</h1>
        <p>
          Dúvidas, sugestões ou quer agendar por telefone? Estamos aqui para ajudar.
        </p>
      </section>

      {success ? (
        <div className="success-card">
          <h2>Mensagem enviada!</h2>
          <p>Entraremos em contato em breve.</p>
          <Link to="/" className="btn-hero">
            Voltar para home
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Nome</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp / telefone</label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="voce@email.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensagem</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Sua mensagem..."
                rows="5"
                required
              />
            </div>
            <button type="submit" className="btn-hero" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
            </button>
          </form>
        </>
      )}

      <section className="contact-info">
        <div className="info-grid">
          <div className="info-item">
            <h3>Endereço</h3>
            <p>Rua das Palmeiras, 123 - Centro</p>
            <p>São Paulo - SP, 01310-100</p>
          </div>
          <div className="info-item">
            <h3>Telefone</h3>
            <p>(11) 99999-9999</p>
          </div>
          <div className="info-item">
            <h3>WhatsApp</h3>
            <p>(11) 99999-9999</p>
            <p><a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">Clique para conversar</a></p>
          </div>
          <div className="info-item">
            <h3>Instagram</h3>
            <p>@henriquebarber</p>
            <p><a href="https://instagram.com/henriquebarber" target="_blank" rel="noopener noreferrer">@henriquebarber</a></p>
          </div>
        </div>
      </section>
      </div>
      <Footer />
    </>
  );
}

export default Contato;