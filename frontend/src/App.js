import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ColaboradoresPage = lazy(() => import('./pages/ColaboradoresPage'));
const FuncoesPage = lazy(() => import('./pages/FuncoesPage'));
const RegionaisPage = lazy(() => import('./pages/RegionaisPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const TiposMetaPage = lazy(() => import('./pages/TiposMetaPage'));
const RegrasComissaoPage = lazy(() => import('./pages/RegrasComissaoPage'));
const RelatorioMetasPage = lazy(() => import('./pages/RelatorioMetasPage'));
const VendasMensaisPage = lazy(() => import('./pages/VendasMensaisPage'));
const RelatorioVendasPage = lazy(() => import('./pages/RelatorioVendasPage'));
const RelatorioComissionamentoPage = lazy(() => import('./pages/RelatorioComissionamentoPage'));
const RelatorioConsolidadoPage = lazy(() => import('./pages/RelatorioConsolidadoPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

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

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
