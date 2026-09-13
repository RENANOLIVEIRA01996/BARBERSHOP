import { useState } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { getSessionUser, clearSession } from '../../api/client';

const MENU = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: '📅' },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: '🗓️' },
  { to: '/admin/servicos', label: 'Serviços', icon: '💈' },
  { to: '/admin/barbeiros', label: 'Barbeiros', icon: '✂️' },
  { to: '/admin/clientes', label: 'Clientes', icon: '👤' },
  { to: '/admin/horarios', label: 'Horários', icon: '⏰' },
  { to: '/admin/bloqueios', label: 'Bloqueios', icon: '🚫' },
  { to: '/admin/portfolio', label: 'Portfólio', icon: '🖼️' },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: '⭐' },
  { to: '/admin/financeiro', label: 'Financeiro', icon: '💰' },
  { to: '/admin/relatorios', label: 'Relatórios', icon: '📈' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = getSessionUser();

  const handleLogout = () => {
    clearSession();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <img src="/assets/02_logo_horizontal.png" alt="HENRIQUE BARBER" />
        </div>
        <nav className="admin-nav">
          {MENU.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-side-link">← Ver site público</Link>
        </div>
      </aside>

      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
          <div className="admin-topbar-title">
            <span className="admin-gold">HENRIQUE BARBER</span> · Painel
          </div>
          <div className="admin-user">
            <span className="admin-user-name">{user?.name || 'Admin'}</span>
            <button className="admin-logout" onClick={handleLogout}>Sair</button>
          </div>
        </header>
        <main className="admin-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;