import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Agendar from './pages/Agendar';
import Servicos from './pages/Servicos';
import Barbeiros from './pages/Barbeiros';
import Sobre from './pages/Sobre';
import Contato from './pages/Contato';

import AdminGuard from './components/AdminGuard';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Agenda from './pages/admin/Agenda';
import Agendamentos from './pages/admin/Agendamentos';
import ServicosAdmin from './pages/admin/Servicos';
import BarbeirosAdmin from './pages/admin/Barbeiros';
import Clientes from './pages/admin/Clientes';
import Horarios from './pages/admin/Horarios';
import Bloqueios from './pages/admin/Bloqueios';
import Portfolio from './pages/admin/Portfolio';
import Avaliacoes from './pages/admin/Avaliacoes';
import Financeiro from './pages/admin/Financeiro';
import Relatorios from './pages/admin/Relatorios';
import Configuracoes from './pages/admin/Configuracoes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/agendar" element={<Agendar />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/barbeiros" element={<Barbeiros />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contato" element={<Contato />} />

        {/* Painel administrativo */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="agendamentos" element={<Agendamentos />} />
            <Route path="servicos" element={<ServicosAdmin />} />
            <Route path="barbeiros" element={<BarbeirosAdmin />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="bloqueios" element={<Bloqueios />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="avaliacoes" element={<Avaliacoes />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Route>

        {/* Redireciona rotas desconhecidas para home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;