import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Radar from './pages/Radar';
import Kanban from './pages/Kanban';
import ImportarExcel from './pages/ImportarExcel';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminLogs from './pages/AdminLogs';
import RelatoriosVisaoGeral from './pages/RelatoriosVisaoGeral';
import RelatoriosRiscos from './pages/RelatoriosRiscos';
import RelatoriosPessoas from './pages/RelatoriosPessoas';
import RelatoriosDiretorias from './pages/RelatoriosDiretorias';
import RelatoriosTimeline from './pages/RelatoriosTimeline';
import RelatoriosConstrutor from './pages/RelatoriosConstrutor';
import AiInsights from './pages/AiInsights';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública de login */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/radar" element={<PrivateRoute><Radar /></PrivateRoute>} />
        <Route path="/kanban" element={<PrivateRoute><Kanban /></PrivateRoute>} />
        <Route path="/importar" element={<PrivateRoute><ImportarExcel /></PrivateRoute>} />
        <Route path="/admin/usuarios" element={<PrivateRoute><AdminUsuarios /></PrivateRoute>} />
        <Route path="/admin/logs" element={<PrivateRoute><AdminLogs /></PrivateRoute>} />
        <Route path="/relatorios/visao-geral" element={<PrivateRoute><RelatoriosVisaoGeral /></PrivateRoute>} />
        <Route path="/relatorios/riscos" element={<PrivateRoute><RelatoriosRiscos /></PrivateRoute>} />
        <Route path="/relatorios/pessoas" element={<PrivateRoute><RelatoriosPessoas /></PrivateRoute>} />
        <Route path="/relatorios/diretorias" element={<PrivateRoute><RelatoriosDiretorias /></PrivateRoute>} />
        <Route path="/relatorios/timeline" element={<PrivateRoute><RelatoriosTimeline /></PrivateRoute>} />
        <Route path="/relatorios/construtor" element={<PrivateRoute><RelatoriosConstrutor /></PrivateRoute>} />
        <Route path="/ai-insights" element={<PrivateRoute><AiInsights /></PrivateRoute>} />

        {/* Rota padrão redireciona para dashboard (que exigirá login) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
