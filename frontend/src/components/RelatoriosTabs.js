import React from 'react';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/relatorios/visao-geral', label: 'Visao Geral' },
  { path: '/relatorios/riscos', label: 'Riscos' },
  { path: '/relatorios/pessoas', label: 'Pessoas' },
  { path: '/relatorios/diretorias', label: 'Diretorias' },
  { path: '/relatorios/timeline', label: 'Timeline' },
  { path: '/relatorios/construtor', label: 'Construtor' }
];

export default function RelatoriosTabs({ ativo }) {
  const navigate = useNavigate();

  return (
    <div className="report-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`report-btn ${ativo === tab.path ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
