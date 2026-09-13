import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiPost, setSession } from '../../api/client';

function Login() {
  const [email, setEmail] = useState('admin@henriquebarber.com.br');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost('/api/auth/login', { email, password });
      setSession(data);
      const from = location.state?.from || '/admin';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <img src="/assets/01_logo_principal.png" alt="HENRIQUE BARBER" className="login-logo" />
        <h1>Painel Administrativo</h1>
        <p className="login-sub">
          Acesso restrito. Entre com suas credenciais para gerenciar a barbearia.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@henriquebarber.com.br"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn-hero btn-block" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="login-back">
          <Link to="/">← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;