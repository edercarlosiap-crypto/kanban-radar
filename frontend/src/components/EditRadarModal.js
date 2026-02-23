import React, { useState, useEffect } from 'react';
import { radarAPI, configAPI } from '../services/api';

export default function EditRadarModal({ item, onClose, onSave, onDelete, canDelete }) {
  const DEFAULT_CAMADAS = [
    '🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI',
    '🟡 CAMADA 2 — EXPANSÃO DE RECEITA (MÉDIO PRAZO)',
    '🔵 CAMADA 3 — MARCA E PRESENÇA (SUPORTE AO CRESCIMENTO)',
    '⚪ CAMADA 4 — OPERACIONAL / SUPORTE'
  ];

  const DEFAULT_PRIORIDADES_CAMADA1 = [
    '🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO',
    '🅱️ 1B — ORGANIZA A BASE PARA ESCALAR',
    '🅲 1C — ESTRUTURA FUTURA'
  ];

  const DEFAULT_TIPOS = ['Tarefa', 'Projeto', 'OKR'];
  const DEFAULT_EQUIPES = ['Comercial', 'Marketing', 'Gov', 'Retenção', 'Diretoria Comercial'];
  const DEFAULT_RESPONSAVEIS = ['Osmilton', 'Sergio', 'Eder', 'Ezequias', 'João Paulo', 'Mailon'];

  const [opcoesRadar, setOpcoesRadar] = useState({
    camadas: DEFAULT_CAMADAS,
    prioridadesCamada1: DEFAULT_PRIORIDADES_CAMADA1,
    tipos: DEFAULT_TIPOS,
    equipes: DEFAULT_EQUIPES,
    responsaveis: DEFAULT_RESPONSAVEIS
  });

  const CAMADAS = opcoesRadar.camadas;

  const TIPOS = opcoesRadar.tipos;
  const EQUIPES = opcoesRadar.equipes;
  const RESPONSAVEIS = opcoesRadar.responsaveis;

  const [form, setForm] = useState({
    titulo: '',
    camada: '',
    prioridade: '',
    observacao: '',
    tipo: '',
    equipe: '',
    responsavel: '',
    concluirAte: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        titulo: item.titulo || item.acao || '',
        camada: item.camada || '',
        prioridade: item.prioridade || '',
        observacao: item.observacao || '',
        tipo: item.tipo || '',
        equipe: item.equipe || '',
        responsavel: item.responsavel || '',
        concluirAte: item.concluirAte || ''
      });
    }
  }, [item]);

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const response = await configAPI.obterRadarOpcoes();
        const dados = response.data || {};
        setOpcoesRadar({
          camadas: dados.camadas || DEFAULT_CAMADAS,
          prioridadesCamada1: dados.prioridadesCamada1 || DEFAULT_PRIORIDADES_CAMADA1,
          tipos: dados.tipos || DEFAULT_TIPOS,
          equipes: dados.equipes || DEFAULT_EQUIPES,
          responsaveis: dados.responsaveis || DEFAULT_RESPONSAVEIS
        });
      } catch (erro) {
        console.error('Erro ao carregar opções do radar:', erro);
      }
    };

    carregarOpcoes();
  }, []);

  const handleChange = (key, value) => {
    // ao mudar camada, limpa prioridade se não for CAMADA 1
    if (key === 'camada' && value !== CAMADAS[0]) {
      setForm(prev => ({ ...prev, camada: value, prioridade: '' }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.titulo) return setError('Título é obrigatório');
    if (!form.concluirAte) return setError('Prazo é obrigatório');

    const payload = {
      acao: form.titulo,
      camada: form.camada,
      prioridade: form.camada === CAMADAS[0] ? form.prioridade || null : null,
      observacao: form.observacao,
      tipo: form.tipo,
      equipe: form.equipe,
      responsavel: form.responsavel,
      concluirAte: form.concluirAte
    };

    try {
      setSaving(true);
      const resp = await radarAPI.atualizar(item.id, payload);
      const updated = resp.data && resp.data.item ? resp.data.item : { ...item, ...payload, id: item.id };
      onSave(updated);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    const confirmado = window.confirm('Tem certeza que deseja excluir este item?');
    if (!confirmado) return;

    try {
      setDeleting(true);
      setError('');
      await radarAPI.deletar(item.id);
      if (onDelete) onDelete(item.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={overlayStyles.wrap} onMouseDown={onClose}>
      <div style={overlayStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h3>Editar Item</h3>
        {error && <div style={overlayStyles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={overlayStyles.form}>
          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Título*</label>
            <input style={overlayStyles.input} value={form.titulo} onChange={(e) => handleChange('titulo', e.target.value)} required />
          </div>

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Camada</label>
            <select value={form.camada} onChange={(e) => handleChange('camada', e.target.value)}>
              <option value="">Selecione...</option>
              {CAMADAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {form.camada === CAMADAS[0] && (
            <div style={overlayStyles.row}>
              <label style={overlayStyles.label}>Prioridade</label>
              <select value={form.prioridade} onChange={(e) => handleChange('prioridade', e.target.value)}>
                <option value="">Selecione...</option>
                {opcoesRadar.prioridadesCamada1.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Tipo</label>
            <select value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Equipe</label>
            <select value={form.equipe} onChange={(e) => handleChange('equipe', e.target.value)}>
              <option value="">Selecione...</option>
              {EQUIPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Responsável</label>
            <select value={form.responsavel} onChange={(e) => handleChange('responsavel', e.target.value)}>
              <option value="">Selecione...</option>
              {RESPONSAVEIS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Prazo*</label>
            <input type="date" value={form.concluirAte} onChange={(e) => handleChange('concluirAte', e.target.value)} required />
          </div>

          <div style={overlayStyles.row}>
            <label style={overlayStyles.label}>Observação</label>
            <textarea value={form.observacao} onChange={(e) => handleChange('observacao', e.target.value)} style={{ minHeight: 80, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
          </div>

          <div style={overlayStyles.controls}>
            {canDelete && (
              <button type="button" style={overlayStyles.delete} onClick={handleDelete} disabled={saving || deleting}>
                🗑️ Excluir
              </button>
            )}
            <button type="submit" style={overlayStyles.save} disabled={saving || deleting}>💾 Salvar</button>
            <button type="button" style={overlayStyles.cancel} onClick={onClose} disabled={saving || deleting}>❌ Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyles = {
  wrap: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2,6,23,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 160ms ease-in'
  },
  modal: {
    width: '520px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(2,6,23,0.2)',
    transform: 'translateY(0)',
    transition: 'all 160ms ease-in'
  },
  form: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
    marginTop: '8px'
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    color: '#334155'
  },
  input: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  controls: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px'
  },
  save: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  cancel: {
    background: '#e2e8f0',
    color: '#1f2937',
    border: '1px solid #cbd5e1',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  delete: {
    background: '#b91c1c',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '8px 10px',
    borderRadius: '8px',
    marginBottom: '8px'
  }
};
