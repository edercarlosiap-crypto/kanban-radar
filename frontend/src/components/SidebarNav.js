import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';

const menuSections = [
  {
    title: 'Relatorios',
    icon: 'chart',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/relatorio-vendas', label: 'Relatorio de Vendas', icon: 'sales' },
      { to: '/relatorio-ativacoes-churn', label: 'Ativacoes e Churn', icon: 'activity' },
      { to: '/dashboard-variavel', label: 'Dashboard Variavel', icon: 'analytics' },
      { to: '/relatorio-metas', label: 'Relatorio de Metas', icon: 'target' },
      { to: '/relatorio-comissionamento', label: 'Comissionamento', icon: 'money' },
      { to: '/simulador-remuneracao', label: 'Simulador de Remuneracao', icon: 'analytics' },
      { to: '/relatorio-consolidado', label: 'Consolidado Geral', icon: 'chart' },
      { to: '/retencao', label: 'Retencao de Clientes', icon: 'activity' },
      { to: '/contratos', label: 'Analise de Contratos', icon: 'briefcase' },
      { to: '/marketing-orcado-real', label: 'Marketing Orcado x Real', icon: 'chart' }
    ]
  },
  {
    title: 'Cadastros',
    icon: 'folder',
    items: [
      { to: '/vendas-mensais', label: 'Vendas Mensais', icon: 'box' },
      { to: '/colaboradores', label: 'Colaboradores', icon: 'users' },
      { to: '/regionais', label: 'Regionais', icon: 'map' },
      { to: '/regional-cidades', label: 'Cidades da Regional', icon: 'city' },
      { to: '/funcoes', label: 'Funcoes', icon: 'briefcase' },
      { to: '/tipos-meta', label: 'Tipos de Meta', icon: 'list' },
      { to: '/regras-comissao', label: 'Regras de Comissao', icon: 'settings' },
      { to: '/usuarios', label: 'Usuarios', icon: 'lock' }
    ]
  }
];

export default function SidebarNav() {
  const [expandedSections, setExpandedSections] = useState(new Set([0, 1]));

  const toggleSection = (index) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <nav className="sidebar-nav">
      {menuSections.map((section, idx) => (
        <div key={section.title} className="menu-section">
          <button
            type="button"
            className="menu-section-toggle"
            onClick={() => toggleSection(idx)}
          >
            <span className="menu-section-title">
              <Icon name={section.icon} size={14} />
              {section.title}
            </span>
            <span className={`menu-chevron ${expandedSections.has(idx) ? 'open' : ''}`}>
              <Icon name="list" size={12} />
            </span>
          </button>
          {expandedSections.has(idx) && (
            <ul className="menu-items">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
