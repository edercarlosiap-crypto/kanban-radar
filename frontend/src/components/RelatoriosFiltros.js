import React from 'react';

export default function RelatoriosFiltros({ filtros, setFiltros, opcoes }) {
  const { camadas = [], diretorias = [], responsaveis = [] } = opcoes || {};
  const statusOptions = [
    { value: 'todos', label: 'Todos os status' },
    { value: 'Não iniciado - no prazo', label: 'Não iniciado - no prazo' },
    { value: 'Não iniciado - atrasado', label: 'Não iniciado - atrasado' },
    { value: 'Em andamento - no prazo', label: 'Em andamento - no prazo' },
    { value: 'Em andamento - atrasado', label: 'Em andamento - atrasado' },
    { value: 'Finalizado - no prazo', label: 'Finalizado - no prazo' },
    { value: 'Finalizado - com atraso', label: 'Finalizado - com atraso' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.field}>
        <label style={styles.label}>Camada</label>
        <select
          value={filtros.camada}
          onChange={(e) => setFiltros(prev => ({ ...prev, camada: e.target.value }))}
          style={styles.select}
        >
          <option value="">Todas</option>
          {camadas.map((camada) => (
            <option key={camada} value={camada}>{camada}</option>
          ))}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Diretoria</label>
        <select
          value={filtros.diretoria}
          onChange={(e) => setFiltros(prev => ({ ...prev, diretoria: e.target.value }))}
          style={styles.select}
        >
          <option value="">Todas</option>
          {diretorias.map((diretoria) => (
            <option key={diretoria} value={diretoria}>{diretoria}</option>
          ))}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Responsavel</label>
        <select
          value={filtros.responsavel}
          onChange={(e) => setFiltros(prev => ({ ...prev, responsavel: e.target.value }))}
          style={styles.select}
        >
          <option value="">Todos</option>
          {responsaveis.map((resp) => (
            <option key={resp} value={resp}>{resp}</option>
          ))}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Status</label>
        <select
          value={filtros.status}
          onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
          className="report-filter"
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => setFiltros({ camada: '', diretoria: '', responsavel: '', status: 'todos' })}
        style={styles.clearBtn}
      >
        Limpar filtros
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px'
  },
  label: {
    fontSize: '12px',
    color: '#475569',
    marginBottom: '6px'
  },
  select: {
    minHeight: '40px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  clearBtn: {
    minHeight: '40px',
    padding: '8px 14px',
    background: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};
