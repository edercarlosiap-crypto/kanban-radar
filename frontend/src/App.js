import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ColaboradoresPage = lazy(() => import('./pages/ColaboradoresPage'));
const FuncoesPage = lazy(() => import('./pages/FuncoesPage'));
const RegionaisPage = lazy(() => import('./pages/RegionaisPage'));
const RegionalCidadesPage = lazy(() => import('./pages/RegionalCidadesPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const TiposMetaPage = lazy(() => import('./pages/TiposMetaPage'));
const RegrasComissaoPage = lazy(() => import('./pages/RegrasComissaoPage'));
const RelatorioMetasPage = lazy(() => import('./pages/RelatorioMetasPage'));
const VendasMensaisPage = lazy(() => import('./pages/VendasMensaisPage'));
const RelatorioVendasPage = lazy(() => import('./pages/RelatorioVendasPage'));
const RelatorioAtivacoesChurnPage = lazy(() => import('./pages/RelatorioAtivacoesChurnPage'));
const DashboardVariavelPage = lazy(() => import('./pages/DashboardVariavelPage'));
const RelatorioComissionamentoPage = lazy(() => import('./pages/RelatorioComissionamentoPage'));
const SimuladorRemuneracaoPage = lazy(() => import('./pages/SimuladorRemuneracaoPage'));
const RelatorioConsolidadoPage = lazy(() => import('./pages/RelatorioConsolidadoPage'));
const RetencaoPage = lazy(() => import('./pages/RetencaoPage'));
const ContratosPage = lazy(() => import('./pages/ContratosPage'));
const MarketingOrcadoRealPage = lazy(() => import('./pages/MarketingOrcadoRealPage'));

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
          <Route path="/regional-cidades" element={<PrivateRoute><RegionalCidadesPage /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute><UsuariosPage /></PrivateRoute>} />
          <Route path="/tipos-meta" element={<PrivateRoute><TiposMetaPage /></PrivateRoute>} />
          <Route path="/regras-comissao" element={<PrivateRoute><RegrasComissaoPage /></PrivateRoute>} />
          <Route path="/relatorio-metas" element={<PrivateRoute><RelatorioMetasPage /></PrivateRoute>} />
          <Route path="/vendas-mensais" element={<PrivateRoute><VendasMensaisPage /></PrivateRoute>} />
          <Route path="/relatorio-vendas" element={<PrivateRoute><RelatorioVendasPage /></PrivateRoute>} />
          <Route path="/relatorio-ativacoes-churn" element={<PrivateRoute><RelatorioAtivacoesChurnPage /></PrivateRoute>} />
          <Route path="/dashboard-variavel" element={<PrivateRoute><DashboardVariavelPage /></PrivateRoute>} />
          <Route path="/relatorio-comissionamento" element={<PrivateRoute><RelatorioComissionamentoPage /></PrivateRoute>} />
          <Route path="/simulador-remuneracao" element={<PrivateRoute><SimuladorRemuneracaoPage /></PrivateRoute>} />
          <Route path="/simulador" element={<Navigate to="/simulador-remuneracao" replace />} />
          <Route path="/relatorio-consolidado" element={<PrivateRoute><RelatorioConsolidadoPage /></PrivateRoute>} />
          <Route path="/retencao" element={<PrivateRoute><RetencaoPage /></PrivateRoute>} />
          <Route path="/contratos" element={<PrivateRoute><ContratosPage /></PrivateRoute>} />
          <Route path="/marketing-orcado-real" element={<PrivateRoute><MarketingOrcadoRealPage /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
