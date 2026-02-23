import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EditRadarModal from '../components/EditRadarModal';
import TooltipInfo from '../components/TooltipInfo';
import { radarAPI, configAPI } from '../services/api';
import LogoImage from '../components/LogoImage';
import './Kanban.css';

export default function Kanban() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  const canEditar = ['editor', 'gestor', 'admin'].includes(perfil);
  const canImportar = ['gestor', 'admin'].includes(perfil);
  const canExcluir = ['gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [itens, setItens] = useState({
    Backlog: [],
    Planejado: [],
    'Em Estruturação': [],
    'Em Execução': [],
    Travado: [],
    Validação: [],
    Concluído: []
  });
  const [allItems, setAllItems] = useState([]); // Armazena todos os itens do radar, sem filtro
  const [selectedCamada, setSelectedCamada] = useState(''); // Estado para o filtro de camada
  const [selectedIndicador, setSelectedIndicador] = useState(''); // Estado para o filtro de indicador/prazo
  const [selectedResponsavel, setSelectedResponsavel] = useState(''); // Estado para o filtro de responsável
  const [carregando, setCarregando] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const colunas = [
    'Backlog',
    'Planejado',
    'Em Estruturação',
    'Em Execução',
    'Travado',
    'Validação',
    'Concluído'
  ];

  const DEFAULT_CAMADAS = [
    '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
    '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
    '🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)',
    '⚪ CAMADA 4 — OPERACIONAL / SUPORTE'
  ];

  const [camadas, setCamadas] = useState(DEFAULT_CAMADAS);

  const calcularIndicador = (diasRestantes, kanban) => {
    // Se concluído
    if (kanban === 'Concluído') {
      return 'verde';
    }

    // Se atrasado
    if (diasRestantes < 0) {
      return 'vermelho-atrasado';
    }

    // Crítico: 0-3 dias
    if (diasRestantes >= 0 && diasRestantes <= 3) {
      return 'vermelho';
    }

    // Atenção: 4-7 dias
    if (diasRestantes > 3 && diasRestantes <= 7) {
      return 'amarelo';
    }

    // No prazo: >7 dias
    if (diasRestantes > 7) {
      return 'verde';
    }

    return 'neutro';
  };

  const aplicarFiltro = useCallback(() => {
    let itensFiltrados = allItems;
    if (selectedCamada) {
      itensFiltrados = itensFiltrados.filter(item => item.camada === selectedCamada);
    }
    if (selectedIndicador) {
      itensFiltrados = itensFiltrados.filter(item => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataConclui = new Date(item.concluirAte);
        const diasRestantes = Math.floor((dataConclui - hoje) / (1000 * 60 * 60 * 24));
        const indicador = calcularIndicador(diasRestantes, item.kanban);
        return indicador === selectedIndicador;
      });
    }
    if (selectedResponsavel) {
      itensFiltrados = itensFiltrados.filter(item => item.responsavel === selectedResponsavel);
    }

    const agrupado = {
      Backlog: [],
      Planejado: [],
      'Em Estruturação': [],
      'Em Execução': [],
      Travado: [],
      Validação: [],
      Concluído: []
    };

    itensFiltrados.forEach(item => {
      if (agrupado[item.kanban]) {
        agrupado[item.kanban].push(item);
      }
    });
    setItens(agrupado);
  }, [allItems, selectedCamada, selectedIndicador, selectedResponsavel]); // Dependências do useCallback

  const showToast = useCallback((message, tone = 'success') => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    carregarRadar();
  }, []);

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const response = await configAPI.obterRadarOpcoes();
        const dados = response.data || {};
        setCamadas(dados.camadas || DEFAULT_CAMADAS);
      } catch (erro) {
        console.error('Erro ao carregar camadas:', erro);
      }
    };

    carregarOpcoes();
  }, []);

  useEffect(() => {
    aplicarFiltro();
  }, [allItems, selectedCamada, selectedIndicador, selectedResponsavel, aplicarFiltro]); // Dependências

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!draggedItem) return;
    const handleMouseMove = (e) => {
      setDragPosition({
        x: e.clientX - 140,
        y: e.clientY - 60
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [draggedItem]);

  const carregarRadar = async () => {
    try {
      const response = await radarAPI.listar();
      const dados = response.data.itens || [];
      setAllItems(dados); // Armazena todos os itens, sem filtro

      // O filtro será aplicado pelo useEffect que observa allItems e selectedCamada

    } catch (erro) {
      console.error('Erro ao carregar:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleDragEnd = async (result) => {
    setDraggedItem(null);
    
    if (!canEditar) return;
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumn = source.droppableId;
    const destColumn = destination.droppableId;
    const itemId = parseInt(draggableId);

    // Encontra o item
    const item = itens[sourceColumn][source.index];

    // Copia os itens
    const novasListas = { ...itens };
    const sourceItens = Array.from(novasListas[sourceColumn]);
    const destItens = sourceColumn === destColumn ? sourceItens : Array.from(novasListas[destColumn]);

    // Remove da origem
    const [removido] = sourceItens.splice(source.index, 1);

    // Adiciona no destino
    destItens.splice(destination.index, 0, removido);

    // Atualiza o estado local
    novasListas[sourceColumn] = sourceItens;
    if (sourceColumn !== destColumn) {
      novasListas[destColumn] = destItens;
    }

    setItens(novasListas);

    // Atualiza no backend
    try {
      await radarAPI.atualizar(itemId, {
        kanban: destColumn
      });
    } catch (erro) {
      console.error('Erro ao atualizar:', erro);
      // Recarrega se houver erro
      carregarRadar();
    }
  };

  const handleDragStart = (start) => {
    const sourceColumn = start.source.droppableId;
    const item = itens[sourceColumn][start.source.index];
    setDraggedItem(item);
  };

  const handleDragUpdate = (update) => {
    if (update.destination) {
      setDragPosition({
        x: update.destination.droppableId === update.source.droppableId ? 0 : -50,
        y: 0
      });
    }
  };

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
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

  const getStatusClass = (status) => {
    const safeStatus = status || '';
    if (safeStatus.includes('Finalizado - no prazo')) return 'status-verde';
    if (safeStatus.includes('Finalizado - com atraso')) return 'status-laranja';
    if (safeStatus.includes('Em andamento - no prazo')) return 'status-azul';
    if (safeStatus.includes('Em andamento - atrasado')) return 'status-vermelho';
    if (safeStatus.includes('Não iniciado - no prazo')) return 'status-cinza';
    if (safeStatus.includes('Não iniciado - atrasado')) return 'status-roxo';
    return '';
  };

  const getStatusColor = (status) => {
    const safeStatus = status || '';
    if (safeStatus.includes('Finalizado - no prazo')) return { background: '#2ecc71', color: 'white' };
    if (safeStatus.includes('Finalizado - com atraso')) return { background: '#e67e22', color: 'white' };
    if (safeStatus.includes('Em andamento - no prazo')) return { background: '#3498db', color: 'white' };
    if (safeStatus.includes('Em andamento - atrasado')) return { background: '#e74c3c', color: 'white' };
    if (safeStatus.includes('Não iniciado - no prazo')) return { background: '#bdc3c7', color: 'black' };
    if (safeStatus.includes('Não iniciado - atrasado')) return { background: '#9b59b6', color: 'white' };
    return {};
  };

  const getStageClass = (coluna) => {
    const normalizado = coluna.toLowerCase();
    if (normalizado === 'backlog') return 'stage-backlog';
    if (normalizado === 'planejado') return 'stage-planejado';
    if (normalizado.includes('estruturação')) return 'stage-estruturacao';
    if (normalizado.includes('execução')) return 'stage-execucao';
    if (normalizado === 'travado') return 'stage-travado';
    if (normalizado === 'validação') return 'stage-validacao';
    if (normalizado === 'concluído') return 'stage-concluido';
    return '';
  };

  const formatarData = (dataISO) => {
    if (!dataISO) return '';
    // Aceita string ISO, timestamp, ou objeto Date
    const d = dataISO instanceof Date ? dataISO : new Date(dataISO);
    if (Number.isNaN(d.getTime())) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = String(d.getFullYear()).slice(-2);
    return `${dia}/${mes}/${ano}`;
  };

  if (carregando) {
    return (
      <div className="app-layout">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Carregando Kanban...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className={`sidebar ${menuCollapsed ? 'collapsed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoImage size={32} />
            {!menuCollapsed && <h1 style={{ margin: 0, fontSize: '22px' }}>Radar PRO</h1>}
          </div>
          <button
            onClick={() => setMenuCollapsed((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px'
            }}
            title={menuCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {menuCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')}>
            {menuCollapsed ? '📊' : '📊 Dashboard'}
          </a>
          <a onClick={() => navigate('/radar')}>
            {menuCollapsed ? '📈' : '📈 Radar'}
          </a>
          <a onClick={() => navigate('/kanban')} className="active">
            {menuCollapsed ? '🎯' : '🎯 Kanban'}
          </a>
          <a onClick={() => navigate('/ai-insights')}>
            {menuCollapsed ? '🧠' : '🧠 Smart Priority AI'}
          </a>
          <a onClick={() => navigate('/relatorios/visao-geral')}>
            {menuCollapsed ? '📑' : '📑 Relatórios'}
          </a>
          {canImportar && (
            <a onClick={() => navigate('/importar')}>
              {menuCollapsed ? '📥' : '📥 Importar Excel'}
            </a>
          )}
          {isAdmin && (
            <a onClick={() => navigate('/admin/usuarios')}>
              {menuCollapsed ? '👥' : '👥 Usuários'}
            </a>
          )}
        </nav>

        {!menuCollapsed && (
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
        )}

        <button onClick={sairDoSistema} className="logout-btn">
          {menuCollapsed ? '🚪' : '🚪 Sair'}
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="main-content" style={{ overflowX: 'auto' }}>
        {toast && (
          <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <LogoImage size={42} />
              <div>
                <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Kanban Estratégico</h1>
                <p style={{ color: '#8E8E93', margin: 0 }}>Arraste os cartões para mover entre as etapas</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <TooltipInfo />
              <select
                className="form-select"
                value={selectedCamada}
                onChange={(e) => setSelectedCamada(e.target.value)}
                style={{ minWidth: '280px' }}
              >
                <option value="">Todas as Camadas</option>
                {camadas.map(camada => (
                  <option key={camada} value={camada}>
                    {camada}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={selectedIndicador}
                onChange={(e) => setSelectedIndicador(e.target.value)}
                style={{ minWidth: '200px' }}
              >
                <option value="">Todos os Prazos</option>
                <option value="verde">🟢 No Prazo</option>
                <option value="amarelo">🟡 Atenção (4-7 dias)</option>
                <option value="vermelho">🔴 Crítico (0-3 dias)</option>
                <option value="vermelho-atrasado">🔴 Atrasado</option>
              </select>
              <select
                className="form-select"
                value={selectedResponsavel}
                onChange={(e) => setSelectedResponsavel(e.target.value)}
                style={{ minWidth: '200px' }}
              >
                <option value="">Todos os Responsáveis</option>
                {Array.from(new Set(allItems.map(item => item.responsavel).filter(Boolean))).map(responsavel => (
                  <option key={responsavel} value={responsavel}>
                    👤 {responsavel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} onDragUpdate={handleDragUpdate}>
          <div className="kanban-container">
            {colunas.map((coluna) => (
              <div key={coluna} className={`kanban-coluna ${getStageClass(coluna)}`}>
                <div className="kanban-coluna-header">
                  <h3>{coluna}</h3>
                  <span className="kanban-coluna-badge">{itens[coluna]?.length || 0}</span>
                </div>

                <Droppable droppableId={coluna}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="kanban-coluna-content"
                      style={{
                        background: snapshot.isDraggingOver ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                      }}
                    >
                      {itens[coluna]?.map((item, index) => (
                        <Draggable
                          key={item.id.toString()}
                          draggableId={item.id.toString()}
                          index={index}
                          isDragDisabled={!canEditar}
                        >
                          {(provided, snapshot) => {
                            const camadaMap = {
                              'CAMADA 1': '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
                              'CAMADA 2': '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
                              'CAMADA 3': '🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)',
                              'CAMADA 4': '⚪ CAMADA 4 — OPERACIONAL / SUPORTE'
                            };

                            const prioridadeMap = {
                              '1A': '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
                              '1B': '🅱️ 1B — ORGANIZA A BASE PARA ESCALAR',
                              '1C': '🅲 1C — ESTRUTURA FUTURA'
                            };

                            const camadaKey = (() => {
                              if (!item.camada) return '';
                              if (item.camada.includes('CAMADA 1')) return 'CAMADA 1';
                              if (item.camada.includes('CAMADA 2')) return 'CAMADA 2';
                              if (item.camada.includes('CAMADA 3')) return 'CAMADA 3';
                              if (item.camada.includes('CAMADA 4')) return 'CAMADA 4';
                              return item.camada;
                            })();

                            const prioridadeCode = (() => {
                              if (!item.prioridade) return '';
                              const m = String(item.prioridade).match(/1A|1B|1C/);
                              return m ? m[0] : item.prioridade;
                            })();

                            const statusText = item.status || '';
                            const entregaTitulo = item.titulo || item.acao || '';

                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onDoubleClick={() => setEditingItem(item)}
                                className={`card-kanban ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                style={{
                                  background: snapshot.isDragging 
                                    ? 'linear-gradient(135deg, var(--primary-light), white)' 
                                    : 'white',
                                  transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                  ...provided.draggableProps.style,
                                  zIndex: snapshot.isDragging ? 9999 : 'auto'
                                }}
                              >
                                {/* Indicador de dias restantes */}
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  marginBottom: '10px',
                                  fontSize: '12px',
                                  color: 'var(--text-secondary)'
                                }}>
                                  <div
                                    style={{
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      background: getCorIndicador(item.indicador),
                                    }}
                                  />
                                  <span>
                                    {item.diasRestantes >= 0 
                                      ? `${item.diasRestantes} dias` 
                                      : `${Math.abs(item.diasRestantes)} dias de atraso`}
                                  </span>
                                </div>

                                {/* Camada */}
                                <div style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '600', 
                                  marginBottom: '6px',
                                  color: 'var(--text-primary)'
                                }}>
                                  {camadaMap[camadaKey] || item.camada}
                                </div>

                                {/* Prioridade (só CAMADA 1) */}
                                {camadaKey === 'CAMADA 1' && prioridadeCode && (
                                  <div className="badge badge-dark" style={{ marginBottom: '8px', fontSize: '11px' }}>
                                    {prioridadeMap[prioridadeCode] || prioridadeCode}
                                  </div>
                                )}

                                {/* Status */}
                                {statusText && (
                                  <div 
                                    className="badge"
                                    style={{ 
                                      marginBottom: '8px',
                                      fontSize: '10px',
                                      ...getStatusColor(statusText)
                                    }}
                                  >
                                    {statusText}
                                  </div>
                                )}

                                {/* Responsável e Equipe */}
                                <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                  👤 {item.responsavel}
                                </div>
                                <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                  👥 {item.equipe}
                                </div>

                                {/* Entrega */}
                                <div style={{ 
                                  fontSize: '12px', 
                                  fontWeight: '600', 
                                  marginBottom: '6px',
                                  color: 'var(--text-primary)',
                                  lineHeight: '1.4'
                                }}>
                                  {entregaTitulo}
                                </div>

                                {/* Prazo */}
                                {item.concluirAte && (
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '10px'
                                  }}>
                                    📅 {formatarData(item.concluirAte)}
                                  </div>
                                )}

                                {/* Botão editar */}
                                {canEditar && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                                    className="btn btn-sm btn-primary"
                                    style={{ width: '100%', marginTop: '8px' }}
                                  >
                                    ✏️ Editar
                                  </button>
                                )}
                              </div>
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {draggedItem && ReactDOM.createPortal(
          <div 
            className="card-kanban-ghost"
            style={{
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
              {draggedItem.titulo || draggedItem.acao}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '8px' }}>
              {draggedItem.equipe}
            </div>
          </div>,
          document.body
        )}

        {editingItem && (
          <EditRadarModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(updated) => {
              setAllItems(prev => {
                const newAllItems = prev.map(item => 
                  item.id === updated.id ? { ...item, ...updated } : item
                );
                if (!newAllItems.some(item => item.id === updated.id)) {
                  newAllItems.push(updated);
                }
                return newAllItems;
              });
              showToast('Item atualizado com sucesso');
              setEditingItem(null);
            }}
            onDelete={(id) => {
              setAllItems(prev => prev.filter(item => item.id !== id));
              showToast('Item excluido com sucesso');
              setEditingItem(null);
            }}
            canDelete={canExcluir}
          />
        )}
      </div>
    </div>
  );
}
