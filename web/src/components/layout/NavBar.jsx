import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  const linkClass = ({ isActive }) =>
    `nav-link${isActive ? ' nav-link-active' : ''}`;

  return (
    <header className="site-header">
      <div className="container header-content">
        <Link to="/" className="logo-link" onClick={close} aria-label="Henrique Barber — voltar ao início">
          <img
            src="/assets/02_logo_horizontal.png"
            alt="Henrique Barber"
            className="logo-header"
          />
        </Link>

        <button
          className={`nav-toggle${isOpen ? ' open' : ''}`}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        {isOpen && <div className="nav-overlay" onClick={close} aria-hidden="true" />}

        <nav className={`nav-header${isOpen ? ' open' : ''}`}>
          <NavLink to="/" end className={linkClass} onClick={close}>
            Início
          </NavLink>
          <NavLink to="/servicos" className={linkClass} onClick={close}>
            Serviços
          </NavLink>
          <NavLink to="/barbeiros" className={linkClass} onClick={close}>
            Barbeiros
          </NavLink>
          <NavLink to="/sobre" className={linkClass} onClick={close}>
            Sobre
          </NavLink>
          <NavLink to="/contato" className={linkClass} onClick={close}>
            Contato
          </NavLink>
          <Link to="/agendar" className="header-cta" onClick={close}>
            Agendar horário
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;