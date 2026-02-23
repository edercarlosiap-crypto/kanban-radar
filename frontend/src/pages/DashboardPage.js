import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoImage from '../components/LogoImage';
import SidebarNav from '../components/SidebarNav';

export default function DashboardPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.role || 'leitura';

  const canEditar = ['editor', 'gestor', 'admin'].includes(perfil);
  const canDeletar = ['gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <LogoImage />

        <SidebarNav />

        <div className="sidebar-profile">
          <div className="profile-card">
            <strong>{usuario.nome}</strong>
            <p>{usuario.email}</p>
            <p style={{ fontSize: '12px', color: 'var(--primary)' }}>
              🏷️ {perfil.toUpperCase()}
            </p>
          </div>
          <button className="btn-sair" onClick={handleLogout}>
            🚪 Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <h1>📊 Dashboard</h1>
          <p>Bem-vindo ao Sistema de Cálculo de Comissão</p>
        </header>

        <div className="glass-card">
          <h3>Seu Perfil</h3>
          <p><strong>Nome:</strong> {usuario.nome}</p>
          <p><strong>Email:</strong> {usuario.email}</p>
          <p><strong>Função:</strong> {perfil.toUpperCase()}</p>
          {usuario.regionalId && <p><strong>Regional:</strong> {usuario.regionalId}</p>}
        </div>

        <div className="glass-card">
          <h3>Funcionalidades Disponíveis</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li>📊 Visualizar Dashboard</li>
            {isAdmin && <li>🗺️ Gerenciar Regionais</li>}
            {isAdmin && <li>👥 Gerenciar Usuários</li>}
            {isAdmin && <li>📋 Configurar Regras de Comissão</li>}
          </ul>
        </div>

        <div className="glass-card">
          <h3>Informações Técnicas</h3>
          <p><strong>Backend:</strong> Node.js + Express</p>
          <p><strong>Frontend:</strong> React 18.2.0</p>
          <p><strong>Banco de Dados:</strong> SQLite</p>
          <p><strong>Autenticação:</strong> JWT</p>
          <p><strong>Design:</strong> iOS Modern Style</p>
        </div>
      </main>
    </div>
  );
}
