import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { apiGet, getSessionUser, clearSession, apiPatch } from '../../api/client';

const MENU = [
  {
    title: 'Visão geral',
    items: [
      { to: '/admin', label: 'Dashboard', icon: '⌁', end: true },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { to: '/admin/agenda', label: 'Agenda', icon: '◷' },
      { to: '/admin/agendamentos', label: 'Agendamentos', icon: '☰' },
      { to: '/admin/clientes', label: 'Clientes', icon: '◉' },
      { to: '/admin/servicos', label: 'Serviços', icon: '⛌' },
      { to: '/admin/barbeiros', label: 'Barbeiros', icon: '✂' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { to: '/admin/horarios', label: 'Horários', icon: '◴' },
      { to: '/admin/bloqueios', label: 'Bloqueios', icon: '⊘' },
      { to: '/admin/portfolio', label: 'Portfólio', icon: '▦' },
      { to: '/admin/avaliacoes', label: 'Avaliações', icon: '✦' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/admin/financeiro', label: 'Financeiro', icon: '◈' },
      { to: '/admin/relatorios', label: 'Relatórios', icon: '≋' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { to: '/admin/configuracoes', label: 'Configurações', icon: '⚙' },
    ],
  },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notif, setNotif] = useState({ unread: 0, notifications: [] });
  const navigate = useNavigate();
  const user = getSessionUser();

  useEffect(() => {
    apiGet('/api/dashboard/notifications').then(d => setNotif(d || { unread: 0, notifications: [] })).catch(() => {});
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/admin/login');
  };

  const markAllRead = async () => {
    try {
      await apiPatch('/api/dashboard/notifications/read-all', {});
      setNotif(n => ({ ...n, unread: 0, notifications: (n.notifications || []).map(x => ({ ...x, read: 1 })) }));
    } catch { /* ignore */ }
  };

  const initials = (user?.name || 'Ad').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <img src="/assets/02_logo_horizontal.png" alt="HENRIQUE BARBER" />
        </div>
        <nav className="admin-nav">
          {MENU.map(group => (
            <div key={group.title} className="admin-nav-group">
              <span className="admin-nav-group-title">{group.title}</span>
              {group.items.map(item => (
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
            </div>
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
            <div className="admin-notif-wrap">
              <button
                className="admin-notif-btn"
                aria-label={`Notificações${notif.unread ? ` (${notif.unread} não lidas)` : ''}`}
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllRead(); }}
              >
                🔔
                {notif.unread > 0 && <span className="admin-notif-badge">{notif.unread}</span>}
              </button>
              {notifOpen && (
                <div className="admin-notif-panel">
                  <div className="admin-notif-panel-head">
                    <strong>Notificações</strong>
                    <button className="admin-notif-clear" onClick={markAllRead}>Marcar todas lidas</button>
                  </div>
                  <div className="admin-notif-list">
                    {(notif.notifications || []).length === 0 && (
                      <p className="admin-notif-empty">Nenhuma notificação.</p>
                    )}
                    {(notif.notifications || []).slice(0, 8).map(n => (
                      <div key={n.id} className={`admin-notif-item ${n.read ? '' : 'unread'}`}>
                        <span className="admin-notif-item-title">{n.title}</span>
                        {n.message && <span className="admin-notif-item-msg">{n.message}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="admin-user-avatar" aria-hidden="true">{initials}</span>
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