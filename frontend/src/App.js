import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import FuncoesPage from './pages/FuncoesPage';
import RegionaisPage from './pages/RegionaisPage';
import UsuariosPage from './pages/UsuariosPage';
import TiposMetaPage from './pages/TiposMetaPage';
import RegrasComissaoPage from './pages/RegrasComissaoPage';
import RelatorioMetasPage from './pages/RelatorioMetasPage';
import VendasMensaisPage from './pages/VendasMensaisPage';
import RelatorioVendasPage from './pages/RelatorioVendasPage';
import RelatorioComissionamentoPage from './pages/RelatorioComissionamentoPage';
import RelatorioConsolidadoPage from './pages/RelatorioConsolidadoPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas privadas */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/colaboradores" element={<PrivateRoute><ColaboradoresPage /></PrivateRoute>} />
        <Route path="/funcoes" element={<PrivateRoute><FuncoesPage /></PrivateRoute>} />
        <Route path="/regionais" element={<PrivateRoute><RegionaisPage /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute><UsuariosPage /></PrivateRoute>} />
        <Route path="/tipos-meta" element={<PrivateRoute><TiposMetaPage /></PrivateRoute>} />
        <Route path="/regras-comissao" element={<PrivateRoute><RegrasComissaoPage /></PrivateRoute>} />
        <Route path="/relatorio-metas" element={<PrivateRoute><RelatorioMetasPage /></PrivateRoute>} />
        <Route path="/vendas-mensais" element={<PrivateRoute><VendasMensaisPage /></PrivateRoute>} />
        <Route path="/relatorio-vendas" element={<PrivateRoute><RelatorioVendasPage /></PrivateRoute>} />
        <Route path="/relatorio-comissionamento" element={<PrivateRoute><RelatorioComissionamentoPage /></PrivateRoute>} />
        <Route path="/relatorio-consolidado" element={<PrivateRoute><RelatorioConsolidadoPage /></PrivateRoute>} />

        {/* Redirect padrão */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
