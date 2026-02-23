import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const menuSections = [
  {
    titulo: '📊 Relatórios',
    items: [
      { to: '/dashboard', label: '🏠 Dashboard', end: true },
      { to: '/relatorio-vendas', label: '💰 Relatório de Vendas' },
      { to: '/relatorio-metas', label: '🎯 Relatório de Metas' },
      { to: '/relatorio-comissionamento', label: '💵 Comissionamento' },
      { to: '/relatorio-consolidado', label: '📊 Consolidado Geral' }
    ]
  },
  {
    titulo: '📝 Cadastros',
    items: [
      { to: '/vendas-mensais', label: '📦 Vendas Mensais' },
      { to: '/colaboradores', label: '👥 Colaboradores' },
      { to: '/regionais', label: '🗺️ Regionais' },
      { to: '/funcoes', label: '💼 Funções' },
      { to: '/tipos-meta', label: '📋 Tipos de Meta' },
      { to: '/regras-comissao', label: '⚙️ Regras de Comissão' },
      { to: '/usuarios', label: '🔐 Usuários' }
    ]
  }
];

export default function SidebarNav() {
  const [secoesExpandidas, setSecoesExpandidas] = useState(new Set([0, 1])); // Ambas expandidas por padrão

  const alternarSecao = (indice) => {
    setSecoesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(indice)) {
        next.delete(indice);
      } else {
        next.add(indice);
      }
      return next;
    });
  };

  return (
    <nav>
      {menuSections.map((secao, idx) => (
        <div key={idx} style={{ marginBottom: '16px' }}>
          <h3 
            onClick={() => alternarSecao(idx)}
            style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: 'var(--text-secondary, #999)', 
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 8px 0',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '6px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>{secao.titulo}</span>
            <span style={{ 
              fontSize: '10px', 
              transition: 'transform 0.2s ease',
              transform: secoesExpandidas.has(idx) ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </h3>
          {secoesExpandidas.has(idx) && (
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              animation: 'slideDown 0.2s ease'
            }}>
              {secao.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  );
}

