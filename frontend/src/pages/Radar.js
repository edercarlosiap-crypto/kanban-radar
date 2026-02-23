import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { radarAPI, configAPI } from '../services/api';
import * as XLSX from 'xlsx';
import LogoImage from '../components/LogoImage';

export default function RadarLista() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canEditar = ['editor', 'gestor', 'admin'].includes(perfil);
  const canDeletar = ['gestor', 'admin'].includes(perfil);
  const canImportar = ['gestor', 'admin'].includes(perfil);
  const canCriar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [novoItemAberto, setNovoItemAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [formData, setFormData] = useState({
    camada: '',
    prioridade: '',
    tipo: '',
    acao: '',
    equipe: '',
    responsavel: '',
    concluirAte: '',
    kanban: 'Backlog',
    observacao: '',
    linkBitrix: '',
  });

  const DEFAULT_CAMADAS = [
    '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
    '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
    '🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)',
    '⚪ CAMADA 4 — OPERACIONAL / SUPORTE'
  ];

  const DEFAULT_TIPOS = ['Tarefa', 'Projeto', 'OKR'];
  const DEFAULT_EQUIPES = ['Comercial', 'Marketing', 'Gov', 'Retenção', 'Diretoria Comercial'];
  const DEFAULT_RESPONSAVEIS = ['Osmilton', 'Sergio', 'Eder', 'Ezequias', 'João Paulo', 'Mailon'];
  const DEFAULT_PRIORIDADES_CAMADA1 = [
    { value: '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO', code: '1A' },
    { value: '🅱️ 1B — ORGANIZA A BASE PARA ESCALAR', code: '1B' },
    { value: '🅲 1C — ESTRUTURA FUTURA', code: '1C' }
  ];

  const [opcoesRadar, setOpcoesRadar] = useState({
    camadas: DEFAULT_CAMADAS,
    tipos: DEFAULT_TIPOS,
    equipes: DEFAULT_EQUIPES,
    responsaveis: DEFAULT_RESPONSAVEIS,
    prioridadesCamada1: DEFAULT_PRIORIDADES_CAMADA1
  });

  const CAMADAS = opcoesRadar.camadas;

  const PRIORIDADES_CAMADA1 = [
    { value: '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO', code: '1A' },
    { value: '🅱️ 1B — ORGANIZA A BASE PARA ESCALAR', code: '1B' },
    { value: '🅲 1C — ESTRUTURA FUTURA', code: '1C' }
  ];

  const [filterCamada, setFilterCamada] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'concluirAte', direction: 'asc' });

  useEffect(() => {
    carregarRadar();
  }, []);

  useEffect(() => {
    if (itens.length === 0) return;
    if (itemEditando) return;
    const focusId = localStorage.getItem('radarFocusId');
    if (!focusId) return;
    const alvo = itens.find((item) => String(item.id) === String(focusId));
    if (alvo) {
      setItemEditando(alvo);
    }
    localStorage.removeItem('radarFocusId');
  }, [itens, itemEditando]);

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const response = await configAPI.obterRadarOpcoes();
        const dados = response.data || {};
        const prioridades = (dados.prioridadesCamada1 || DEFAULT_PRIORIDADES_CAMADA1).map((value) => {
          if (typeof value === 'string') {
            const code = value.split(' ')[1] || value;
            return { value, code };
          }
          return value;
        });

        setOpcoesRadar({
          camadas: dados.camadas || DEFAULT_CAMADAS,
          tipos: dados.tipos || DEFAULT_TIPOS,
          equipes: dados.equipes || DEFAULT_EQUIPES,
          responsaveis: dados.responsaveis || DEFAULT_RESPONSAVEIS,
          prioridadesCamada1: prioridades
        });
      } catch (erro) {
        console.error('Erro ao carregar opções do radar:', erro);
      }
    };

    carregarOpcoes();
  }, []);

  // Preenche o formulário quando um item é marcado para edição
  useEffect(() => {
    if (itemEditando) {
      setFormData({
        camada: itemEditando.camada || '',
        prioridade: itemEditando.prioridade || '',
        tipo: itemEditando.tipo || '',
        acao: itemEditando.acao || '',
        equipe: itemEditando.equipe || '',
        responsavel: itemEditando.responsavel || '',
        concluirAte: itemEditando.concluirAte || '',
        kanban: itemEditando.kanban || 'Backlog',
        observacao: itemEditando.observacao || '',
        linkBitrix: itemEditando.linkBitrix || '',
      });
      setNovoItemAberto(true);
    }
  }, [itemEditando]);

  const carregarRadar = async () => {
    try {
      setCarregando(true);
      const response = await radarAPI.listar();
      setItens(response.data.itens || []);
    } catch (erro) {
      setErro('Erro ao carregar itens');
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  };

  const exportarDados = (formato) => {
    if (exibidos.length === 0) {
      alert('Sem itens para exportar.');
      return;
    }

    const linhas = exibidos.map(item => ({
      'Ação': item.acao || '',
      'Camada': item.camada || '',
      'Prioridade': item.prioridade || '',
      'Tipo': item.tipo || '',
      'Equipe': item.equipe || '',
      'Responsável': item.responsavel || '',
      'Concluir até': item.concluirAte || '',
      'Kanban': item.kanban || '',
      'Status': item.status || '',
      'Dias restantes': item.diasRestantes ?? '',
      'Observação': item.observacao || '',
      'Link Bitrix': item.linkBitrix || '',
      'Data criação': item.dataCriacao || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Radar');

    const hoje = new Date();
    const dataRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const nomeBase = `radar-export-${dataRef}`;

    if (formato === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${nomeBase}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    XLSX.writeFile(workbook, `${nomeBase}.xlsx`);
  };

  const limparFormulario = () => {
    setFormData({
      camada: '',
      prioridade: '',
      tipo: '',
      acao: '',
      equipe: '',
      responsavel: '',
      concluirAte: '',
      kanban: 'Backlog',
      observacao: '',
      linkBitrix: '',
    });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    try {
      const dados = { ...formData };

      // Regras de submissão: prioridade só para CAMADA 1
      if (dados.camada !== CAMADAS[0]) {
        dados.prioridade = null;
      } else {
        if (!dados.prioridade) {
          setErro('Prioridade obrigatória para CAMADA 1');
          return;
        }
      }

      if (itemEditando) {
        await radarAPI.atualizar(itemEditando.id, dados);
      } else {
        dados.dataCriacao = new Date().toISOString().split('T')[0];
        await radarAPI.criar(dados);
      }

      await carregarRadar();
      setItemEditando(null);
      limparFormulario();
      setNovoItemAberto(false);
    } catch (erro) {
      setErro(itemEditando ? 'Erro ao atualizar item' : 'Erro ao criar item');
      console.error(erro);
    }
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esse item?')) {
      try {
        await radarAPI.deletar(id);
        carregarRadar();
      } catch (erro) {
        setErro('Erro ao deletar item');
      }
    }
  };

  const getCorIndicador = (indicador) => {
    const cores = {
      'verde': '#10b981',
      'amarelo': '#f59e0b',
      'vermelho': '#ef4444',
      'vermelho-atrasado': '#dc2626',
      'neutro': '#94a3b8'
    };
    return cores[indicador] || '#94a3b8';
  };

  const getIndicadorLabel = (indicador) => {
    if (indicador === 'verde') return 'No prazo';
    if (indicador === 'amarelo') return 'Atenção';
    if (indicador === 'vermelho') return 'Crítico';
    if (indicador === 'vermelho-atrasado') return 'Atrasado';
    return 'Neutro';
  };

  const getSortValue = (item, key) => {
    if (key === 'diasRestantes') return item.diasRestantes ?? 0;
    if (key === 'concluirAte') return item.concluirAte ? new Date(item.concluirAte).getTime() : 0;
    if (key === 'status') return item.statusRadar || '';
    return (item[key] || '').toString().toLowerCase();
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // Lista filtrada com base nos filtros selecionados
  const exibidos = itens.filter(it => {
    if (filterCamada && it.camada !== filterCamada) return false;
    if (filterCamada === CAMADAS[0] && filterPrioridade && it.prioridade !== filterPrioridade) return false;
    return true;
  }).slice().sort((a, b) => {
    const aValue = getSortValue(a, sortConfig.key);
    const bValue = getSortValue(b, sortConfig.key);
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (carregando) {
    return (
      <div className="app-layout">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Carregando itens do radar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <LogoImage size={32} />
          <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </a>
          <a onClick={() => navigate('/radar')} className="active">
            📈 Radar
          </a>
          <a onClick={() => navigate('/kanban')}>
            🎯 Kanban
          </a>
          <a onClick={() => navigate('/ai-insights')}>
            🧠 Smart Priority AI
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')}>
            📑 Relatórios
          </a>
          {canImportar && (
            <a onClick={() => navigate('/importar')}>
              📥 Importar Excel
            </a>
          )}
          {isAdmin && (
            <a onClick={() => navigate('/admin/usuarios')}>
              👥 Usuários
            </a>
          )}
        </nav>

        <div style={{ 
          marginTop: '32px', 
          padding: '16px', 
          background: 'rgba(0, 122, 255, 0.08)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>👤 {usuario.nome}</div>
          <small style={{ color: '#8E8E93' }}>{usuario.email}</small>
          <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#007AFF' }}>
            {perfil.toUpperCase()}
          </div>
        </div>

        <button onClick={sairDoSistema} className="logout-btn">
          🚪 Sair
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <LogoImage size={42} />
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Itens do Radar</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Gerencie e acompanhe todos os itens estratégicos</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {canCriar && (
              <button 
                onClick={() => setNovoItemAberto(!novoItemAberto)}
                className="btn btn-primary"
              >
                <span style={{ fontSize: '18px', marginRight: '8px' }}>+</span>
                Novo Item
              </button>
            )}

            <button
              onClick={() => exportarDados('xlsx')}
              className="btn btn-secondary"
              title="Exportar para Excel"
            >
              ⬇️ Excel
            </button>

            <button
              onClick={() => exportarDados('csv')}
              className="btn btn-secondary"
              title="Exportar para CSV"
            >
              ⬇️ CSV
            </button>

            {canDeletar && (
              <button
                onClick={async () => {
                  if (!window.confirm('ATENÇÃO: Esta ação deletará TODOS os itens do seu radar. Deseja continuar?')) return;
                  try {
                    await radarAPI.deletarTodos();
                    await carregarRadar();
                    alert('Todos os itens foram deletados.');
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao deletar todos os itens. Verifique o console.');
                  }
                }}
                className="btn btn-danger"
                title="Deletar todos os itens"
              >
                🗑 Deletar Todos
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Filtrar por Camada</label>
              <select 
                className="form-select"
                value={filterCamada} 
                onChange={(e) => { setFilterCamada(e.target.value); setFilterPrioridade(''); }}
              >
                <option value="">Todas as camadas</option>
                {CAMADAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {filterCamada === CAMADAS[0] && (
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Filtrar por Prioridade</label>
                <select 
                  className="form-select"
                  value={filterPrioridade} 
                  onChange={(e) => setFilterPrioridade(e.target.value)}
                >
                  <option value="">Todas as prioridades</option>
                  {opcoesRadar.prioridadesCamada1.map(s => (
                    <option key={s.value} value={s.value}>{s.value}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="text-secondary" style={{ fontSize: '14px' }}>
                {exibidos.length} {exibidos.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>
        </div>

        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
            {erro}
          </div>
        )}

        {/* Formulário para novo/editar item */}
        {novoItemAberto && canCriar && (
          <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
            <h3 className="card-title" style={{ marginBottom: '24px' }}>
              {itemEditando ? '✏️ Editar Item' : '➕ Criar Novo Item'}
            </h3>
            <form onSubmit={handleSalvar}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Camada*</label>
                  <select
                    className="form-select"
                    value={formData.camada}
                    onChange={(e) => {
                      const novo = e.target.value;
                      if (novo !== CAMADAS[0]) {
                        setFormData({ ...formData, camada: novo, prioridade: '' });
                      } else {
                        setFormData({ ...formData, camada: novo });
                      }
                    }}
                    required
                  >
                    <option value="">Selecione uma camada...</option>
                    {CAMADAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo*</label>
                  <select 
                    className="form-select"
                    value={formData.tipo} 
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} 
                    required
                  >
                    <option value="">Selecione um tipo...</option>
                    {opcoesRadar.tipos.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Equipe*</label>
                  <select 
                    className="form-select"
                    value={formData.equipe} 
                    onChange={(e) => setFormData({ ...formData, equipe: e.target.value })} 
                    required
                  >
                    <option value="">Selecione uma equipe...</option>
                    {opcoesRadar.equipes.map(equipe => (
                      <option key={equipe} value={equipe}>{equipe}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Ação*</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.acao}
                    onChange={(e) => setFormData({ ...formData, acao: e.target.value })}
                    placeholder="Descreva a ação a ser realizada..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsável*</label>
                  <select 
                    className="form-select"
                    value={formData.responsavel} 
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} 
                    required
                  >
                    <option value="">Selecione um responsável...</option>
                    {opcoesRadar.responsaveis.map(responsavel => (
                      <option key={responsavel} value={responsavel}>{responsavel}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Concluir Até*</label>
                  <input
                    className="form-input"
                    type="date"
                    value={formData.concluirAte}
                    onChange={(e) => setFormData({ ...formData, concluirAte: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Kanban</label>
                  <select
                    className="form-select"
                    value={formData.kanban}
                    onChange={(e) => setFormData({ ...formData, kanban: e.target.value })}
                  >
                    <option>Backlog</option>
                    <option>Planejado</option>
                    <option>Em Estruturação</option>
                    <option>Em Execução</option>
                    <option>Travado</option>
                    <option>Validação</option>
                    <option>Concluído</option>
                  </select>
                </div>
              </div>

              {formData.camada === CAMADAS[0] && (
                <div className="form-group">
                  <label className="form-label">Prioridade* (obrigatória para Camada 1)</label>
                  <select
                    className="form-select"
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                    required
                  >
                    <option value="">Selecione uma prioridade...</option>
                    {opcoesRadar.prioridadesCamada1.map(s => (
                      <option key={s.value} value={s.value}>{s.value}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-textarea"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Adicione observações relevantes..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Link Bitrix</label>
                <input
                  className="form-input"
                  type="text"
                  value={formData.linkBitrix}
                  onChange={(e) => setFormData({ ...formData, linkBitrix: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {itemEditando ? '💾 Salvar Alterações' : '✓ Criar Item'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setNovoItemAberto(false); setItemEditando(null); limparFormulario(); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  ✕ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Itens */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {exibidos.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <h3>Nenhum item encontrado</h3>
              <p>
                {!novoItemAberto && canCriar ? (
                  <button onClick={() => setNovoItemAberto(true)} className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Criar Primeiro Item
                  </button>
                ) : (
                  'Ajuste os filtros ou adicione novos itens ao radar.'
                )}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('acao')} style={{ cursor: 'pointer' }}>
                      Ação {sortConfig.key === 'acao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('camada')} style={{ cursor: 'pointer' }}>
                      Camada {sortConfig.key === 'camada' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('tipo')} style={{ cursor: 'pointer' }}>
                      Tipo {sortConfig.key === 'tipo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('responsavel')} style={{ cursor: 'pointer' }}>
                      Responsável {sortConfig.key === 'responsavel' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('equipe')} style={{ cursor: 'pointer' }}>
                      Equipe {sortConfig.key === 'equipe' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('concluirAte')} style={{ cursor: 'pointer' }}>
                      Concluir Até {sortConfig.key === 'concluirAte' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('kanban')} style={{ cursor: 'pointer' }}>
                      Kanban {sortConfig.key === 'kanban' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => handleSort('diasRestantes')} style={{ textAlign: 'center', cursor: 'pointer' }}>
                      Dias Rest. {sortConfig.key === 'diasRestantes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exibidos.map((item) => {
                    const camadaCor = 
                      item.camada === CAMADAS[0] ? 'var(--success)' : 
                      item.camada === CAMADAS[1] ? 'var(--warning)' : 
                      item.camada === CAMADAS[2] ? 'var(--primary)' : 
                      'var(--text-tertiary)';

                    return (
                      <tr key={item.id} style={{ borderLeft: `4px solid ${camadaCor}` }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: getCorIndicador(item.indicador),
                              }}
                            />
                            <span style={{ color: getCorIndicador(item.indicador), fontWeight: 600 }}>
                              {getIndicadorLabel(item.indicador)}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: '600', maxWidth: '300px' }}>{item.acao}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ flex: 1, fontSize: '13px' }}>{item.camada}</span>
                            {item.camada === CAMADAS[0] && item.prioridade && (
                              <span className="badge badge-dark">
                                {(() => {
                                  const found = opcoesRadar.prioridadesCamada1.find(s => s.value === item.prioridade);
                                  return found ? found.code : item.prioridade.split(' ')[1] || item.prioridade;
                                })()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{item.tipo}</td>
                        <td>{item.responsavel}</td>
                        <td>{item.equipe}</td>
                        <td>{item.concluirAte}</td>
                        <td><span className="badge badge-secondary">{item.kanban}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {item.diasRestantes !== null && item.diasRestantes !== undefined ? (
                            <span style={{ 
                              color: item.diasRestantes < 0 ? 'var(--danger)' : item.diasRestantes < 7 ? 'var(--warning)' : 'var(--success)' 
                            }}>
                              {item.diasRestantes}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {canEditar && (
                              <button
                                onClick={() => setItemEditando(item)}
                                className="btn-icon btn-icon-primary"
                                title="Editar item"
                              >
                                ✏️
                              </button>
                            )}
                            {canDeletar && (
                              <button
                                onClick={() => handleDeletar(item.id)}
                                className="btn-icon btn-icon-danger"
                                title="Deletar item"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
