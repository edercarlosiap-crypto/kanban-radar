# 📝 TEMPLATES DE CÓDIGO - Radar PRO
## Exemplos prontos para copiar e colar

---

## 🗄️ MODEL TEMPLATE

```javascript
// models/NomeDoModel.js
const { db_run, db_get, db_all } = require('../config/database');

class NomeDoModel {
  // Criar novo item
  static async criar(dados, usuarioId) {
    try {
      const result = await db_run(
        `INSERT INTO tabela (
          campo1, campo2, campo3, usuarioId, dataCriacao
        ) VALUES (?, ?, ?, ?, datetime('now'))`,
        [dados.campo1, dados.campo2, dados.campo3, usuarioId]
      );
      return result.id;
    } catch (erro) {
      throw erro;
    }
  }

  // Buscar por ID
  static async buscarPorId(id, usuarioId) {
    try {
      const item = await db_get(
        `SELECT * FROM tabela WHERE id = ? AND usuarioId = ?`,
        [id, usuarioId]
      );
      return item;
    } catch (erro) {
      throw erro;
    }
  }

  // Listar todos
  static async listar(usuarioId) {
    try {
      const itens = await db_all(
        `SELECT * FROM tabela WHERE usuarioId = ? ORDER BY dataCriacao DESC`,
        [usuarioId]
      );
      return itens;
    } catch (erro) {
      throw erro;
    }
  }

  // Atualizar
  static async atualizar(id, dados, usuarioId) {
    try {
      const result = await db_run(
        `UPDATE tabela SET 
          campo1 = ?, campo2 = ?, campo3 = ?
        WHERE id = ? AND usuarioId = ?`,
        [dados.campo1, dados.campo2, dados.campo3, id, usuarioId]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  // Deletar
  static async deletar(id, usuarioId) {
    try {
      const result = await db_run(
        `DELETE FROM tabela WHERE id = ? AND usuarioId = ?`,
        [id, usuarioId]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }

  // Deletar todos (apenas para admin)
  static async deletarTodos(usuarioId) {
    try {
      const result = await db_run(
        `DELETE FROM tabela WHERE usuarioId = ?`,
        [usuarioId]
      );
      return result.changes;
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = NomeDoModel;
```

---

## 🎮 CONTROLLER TEMPLATE

```javascript
// controllers/nomeController.js
const Model = require('../models/NomeDoModel');

// GET /api/recurso - Lista todos
exports.listar = async (req, res) => {
  try {
    const itens = await Model.listar(req.usuarioId);
    res.json({ itens });
  } catch (erro) {
    console.error('Erro ao listar:', erro);
    res.status(500).json({ erro: 'Erro ao listar itens' });
  }
};

// GET /api/recurso/:id - Busca por ID
exports.buscar = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Model.buscarPorId(id, req.usuarioId);
    
    if (!item) {
      return res.status(404).json({ erro: 'Item não encontrado' });
    }
    
    res.json(item);
  } catch (erro) {
    console.error('Erro ao buscar:', erro);
    res.status(500).json({ erro: 'Erro ao buscar item' });
  }
};

// POST /api/recurso - Cria novo
exports.criar = async (req, res) => {
  try {
    const dados = req.body;
    
    // Validações
    if (!dados.campo1 || !dados.campo2) {
      return res.status(400).json({ 
        erro: 'Campos obrigatórios não fornecidos' 
      });
    }

    const id = await Model.criar(dados, req.usuarioId);
    
    res.status(201).json({ 
      mensagem: 'Item criado com sucesso', 
      id 
    });
  } catch (erro) {
    console.error('Erro ao criar:', erro);
    res.status(500).json({ erro: 'Erro ao criar item' });
  }
};

// PUT /api/recurso/:id - Atualiza
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;
    
    const alteracoes = await Model.atualizar(id, dados, req.usuarioId);
    
    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Item não encontrado' });
    }
    
    res.json({ mensagem: 'Item atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar item' });
  }
};

// DELETE /api/recurso/:id - Deleta
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alteracoes = await Model.deletar(id, req.usuarioId);
    
    if (alteracoes === 0) {
      return res.status(404).json({ erro: 'Item não encontrado' });
    }
    
    res.json({ mensagem: 'Item deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar:', erro);
    res.status(500).json({ erro: 'Erro ao deletar item' });
  }
};

// DELETE /api/recurso - Deleta todos (gestor/admin)
exports.deletarTodos = async (req, res) => {
  try {
    const alteracoes = await Model.deletarTodos(req.usuarioId);
    
    res.json({ 
      mensagem: `${alteracoes} itens deletados com sucesso`,
      total: alteracoes
    });
  } catch (erro) {
    console.error('Erro ao deletar todos:', erro);
    res.status(500).json({ erro: 'Erro ao deletar itens' });
  }
};
```

---

## 🛣️ ROUTE TEMPLATE

```javascript
// routes/recursoRoutes.js
const express = require('express');
const router = express.Router();
const { 
  autenticar, 
  apenasAdmin, 
  apenasGestorOuSuperior 
} = require('../middleware/auth');
const controller = require('../controllers/nomeController');

// Todas as rotas exigem autenticação
router.use(autenticar);

// GET /api/recurso - Lista todos
router.get('/', controller.listar);

// GET /api/recurso/:id - Busca por ID
router.get('/:id', controller.buscar);

// POST /api/recurso - Cria novo
router.post('/', controller.criar);

// PUT /api/recurso/:id - Atualiza
router.put('/:id', controller.atualizar);

// DELETE /api/recurso/:id - Deleta
router.delete('/:id', controller.deletar);

// DELETE /api/recurso - Deleta todos (apenas gestor/admin)
router.delete('/', apenasGestorOuSuperior, controller.deletarTodos);

module.exports = router;
```

---

## 🎨 PÁGINA TEMPLATE (Frontend)

```javascript
// pages/NomeDaPagina.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recursoAPI } from '../services/api';
import LogoImage from '../components/LogoImage';

export default function NomeDaPagina() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil || 'leitura';
  
  // Permissões
  const canEditar = ['editor', 'gestor', 'admin'].includes(perfil);
  const canDeletar = ['gestor', 'admin'].includes(perfil);
  const canCriar = ['editor', 'gestor', 'admin'].includes(perfil);
  const isAdmin = perfil === 'admin';
  
  // Estados
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [formData, setFormData] = useState({
    campo1: '',
    campo2: '',
    campo3: ''
  });

  // Carrega dados ao montar
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const response = await recursoAPI.listar();
      setItens(response.data.itens || []);
    } catch (erro) {
      setErro('Erro ao carregar dados');
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    
    try {
      if (itemEditando) {
        await recursoAPI.atualizar(itemEditando.id, formData);
      } else {
        await recursoAPI.criar(formData);
      }
      
      await carregarDados();
      limparFormulario();
      setFormAberto(false);
    } catch (erro) {
      setErro('Erro ao salvar item');
      console.error(erro);
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return;
    
    try {
      await recursoAPI.deletar(id);
      await carregarDados();
    } catch (erro) {
      setErro('Erro ao deletar item');
      console.error(erro);
    }
  };

  const handleEditar = (item) => {
    setItemEditando(item);
    setFormData({
      campo1: item.campo1 || '',
      campo2: item.campo2 || '',
      campo3: item.campo3 || ''
    });
    setFormAberto(true);
  };

  const limparFormulario = () => {
    setFormData({
      campo1: '',
      campo2: '',
      campo3: ''
    });
    setItemEditando(null);
  };

  const sairDoSistema = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // Loading
  if (carregando) {
    return (
      <div className="app-layout">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Carregando...</p>
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
          <h1 style={{ margin: 0, fontSize: '22px' }}>Sistema</h1>
        </div>
        
        <nav>
          <a onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </a>
          <a onClick={() => navigate('/recurso')} className="active">
            📈 Recurso
          </a>
        </nav>

        <div style={{ 
          marginTop: '32px', 
          padding: '16px', 
          background: 'rgba(0, 122, 255, 0.08)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            👤 {usuario.nome}
          </div>
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
        {/* Cabeçalho */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <LogoImage size={42} />
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>
                Título da Página
              </h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>
                Descrição da página
              </p>
            </div>
          </div>

          {canCriar && (
            <button 
              onClick={() => {
                limparFormulario();
                setFormAberto(!formAberto);
              }}
              className="btn btn-primary"
            >
              + Novo Item
            </button>
          )}
        </div>

        {/* Formulário */}
        {formAberto && (
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">
              {itemEditando ? 'Editar Item' : 'Novo Item'}
            </h2>
            
            <form onSubmit={handleSalvar}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Campo 1 *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.campo1}
                    onChange={(e) => setFormData({ ...formData, campo1: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Campo 2 *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.campo2}
                    onChange={(e) => setFormData({ ...formData, campo2: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Campo 3</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.campo3}
                    onChange={(e) => setFormData({ ...formData, campo3: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary">
                  {itemEditando ? 'Atualizar' : 'Criar'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setFormAberto(false);
                    limparFormulario();
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Itens */}
        <div className="glass-card">
          <h2 className="card-title">Itens ({itens.length})</h2>

          {erro && (
            <div className="alert alert-danger">{erro}</div>
          )}

          {itens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
              Nenhum item encontrado
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campo 1</th>
                    <th>Campo 2</th>
                    <th>Campo 3</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td>{item.campo1}</td>
                      <td>{item.campo2}</td>
                      <td>{item.campo3}</td>
                      <td>
                        {canEditar && (
                          <button 
                            onClick={() => handleEditar(item)}
                            className="btn-icon"
                            title="Editar"
                          >
                            ✏️
                          </button>
                        )}
                        {canDeletar && (
                          <button 
                            onClick={() => handleDeletar(item.id)}
                            className="btn-icon"
                            title="Deletar"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 🔌 API SERVICE TEMPLATE

```javascript
// services/api.js - Adicionar novo recurso

export const recursoAPI = {
  // Lista todos
  listar: () =>
    api.get('/recurso'),

  // Busca específico
  buscar: (id) =>
    api.get(`/recurso/${id}`),

  // Cria novo
  criar: (dados) =>
    api.post('/recurso', dados),

  // Atualiza
  atualizar: (id, dados) =>
    api.put(`/recurso/${id}`, dados),

  // Deleta
  deletar: (id) =>
    api.delete(`/recurso/${id}`),

  // Deleta todos
  deletarTodos: () =>
    api.delete('/recurso'),

  // Exportar Excel
  exportar: (formato = 'xlsx') =>
    api.get(`/recurso/export?format=${formato}`, {
      responseType: 'blob'
    }),

  // Importar Excel - Preparar
  prepararImportacao: (arquivo) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return api.post('/recurso/preparar-importacao', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Importar Excel - Executar
  importarExcel: (arquivo, mapeamento) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('mapeamento', JSON.stringify(mapeamento));
    return api.post('/recurso/importar-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
```

---

## 🗃️ CREATE TABLE TEMPLATE

```sql
-- Tabela básica com campos comuns
CREATE TABLE IF NOT EXISTS tabela (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campo1 TEXT NOT NULL,
  campo2 TEXT NOT NULL,
  campo3 TEXT,
  dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuarioId INTEGER NOT NULL,
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tabela_usuario ON tabela(usuarioId);
CREATE INDEX IF NOT EXISTS idx_tabela_data ON tabela(dataCriacao);
```

---

## 📊 EXPORT EXCEL TEMPLATE

```javascript
// Frontend - Exportar Excel
import * as XLSX from 'xlsx';

const exportarDados = (dados, formato = 'xlsx') => {
  if (dados.length === 0) {
    alert('Sem dados para exportar.');
    return;
  }

  // Mapeia dados para formato Excel
  const linhas = dados.map(item => ({
    'Campo 1': item.campo1 || '',
    'Campo 2': item.campo2 || '',
    'Campo 3': item.campo3 || '',
    'Data Criação': item.dataCriacao || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Nome do arquivo com data
  const hoje = new Date();
  const dataRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const nomeBase = `export-${dataRef}`;

  // Exporta CSV
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

  // Exporta XLSX
  XLSX.writeFile(workbook, `${nomeBase}.xlsx`);
};
```

---

## 📥 IMPORT EXCEL TEMPLATE

```javascript
// Backend - Importar Excel
const XLSX = require('xlsx');

exports.importarExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.arquivo) {
      return res.status(400).json({ erro: 'Arquivo não enviado' });
    }

    const arquivo = req.files.arquivo;
    const mapeamento = JSON.parse(req.body.mapeamento || '{}');

    // Lê arquivo Excel
    const workbook = XLSX.read(arquivo.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dadosRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (dadosRaw.length < 2) {
      return res.status(400).json({ erro: 'Arquivo vazio' });
    }

    const headersRaw = dadosRaw[0];
    const linhasDados = dadosRaw.slice(1);

    let itensImportados = 0;
    const erros = [];

    // Processa cada linha
    for (let i = 0; i < linhasDados.length; i++) {
      const linha = linhasDados[i];
      const dados = {};

      // Mapeia colunas de acordo com o mapeamento
      Object.keys(mapeamento).forEach(campo => {
        const coluna = mapeamento[campo];
        const indice = headersRaw.indexOf(coluna);
        if (indice !== -1) {
          dados[campo] = linha[indice];
        }
      });

      // Valida campos obrigatórios
      if (!dados.campo1 || !dados.campo2) {
        erros.push(`Linha ${i + 2}: Campos obrigatórios não preenchidos`);
        continue;
      }

      // Cria no banco
      try {
        await Model.criar(dados, req.usuarioId);
        itensImportados++;
      } catch (erro) {
        erros.push(`Linha ${i + 2}: ${erro.message}`);
      }
    }

    res.json({
      mensagem: 'Importação concluída',
      itensImportados,
      totalLinhas: linhasDados.length,
      erros: erros.length > 0 ? erros : null
    });
  } catch (erro) {
    console.error('Erro ao importar:', erro);
    res.status(500).json({ erro: 'Erro ao importar arquivo' });
  }
};
```

---

## 🎨 CSS HELPERS

```css
/* Helpers úteis - adicionar ao App.css */

/* Botão ícone */
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 8px;
  transition: transform 0.2s ease;
}

.btn-icon:hover {
  transform: scale(1.2);
}

/* Grid de formulário */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

/* Container de tabela responsiva */
.data-table-container {
  overflow-x: auto;
  margin-top: 20px;
}

/* Tabela de dados */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--background-secondary);
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--divider);
  font-size: 15px;
  color: var(--text-primary);
}

.data-table tr:hover {
  background: var(--background-secondary);
}

/* Loading spinner */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.spinner {
  border: 4px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Alertas */
.alert {
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-size: 15px;
}

.alert-success {
  background: rgba(52, 199, 89, 0.1);
  color: var(--success);
  border: 1px solid rgba(52, 199, 89, 0.3);
}

.alert-danger {
  background: rgba(255, 59, 48, 0.1);
  color: var(--danger);
  border: 1px solid rgba(255, 59, 48, 0.3);
}

.alert-warning {
  background: rgba(255, 149, 0, 0.1);
  color: var(--warning);
  border: 1px solid rgba(255, 149, 0, 0.3);
}

/* Botão logout */
.logout-btn {
  width: 100%;
  padding: 14px;
  margin-top: auto;
  background: var(--gradient-danger);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Card title */
.card-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
```

---

## 🔐 AUTH HELPERS

```javascript
// utils/auth.js - Frontend
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getUsuario = () => {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
};

export const getPerfil = () => {
  const usuario = getUsuario();
  return usuario?.perfil || 'leitura';
};

export const canEditar = () => {
  const perfil = getPerfil();
  return ['editor', 'gestor', 'admin'].includes(perfil);
};

export const canDeletar = () => {
  const perfil = getPerfil();
  return ['gestor', 'admin'].includes(perfil);
};

export const isAdmin = () => {
  return getPerfil() === 'admin';
};

export const logout = (navigate) => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  navigate('/login');
};
```

---

## 📅 DATE HELPERS

```javascript
// utils/dates.js
export const formatarData = (data) => {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
};

export const formatarDataHora = (data) => {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleString('pt-BR');
};

export const calcularDiasRestantes = (dataFim) => {
  if (!dataFim) return null;
  const hoje = new Date();
  const fim = new Date(dataFim);
  const diff = fim - hoje;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getDataHoje = () => {
  return new Date().toISOString().split('T')[0];
};
```

---

**Versão:** 1.0 | **Data:** 17/02/2026 | **Projeto:** Radar Estratégico PRO

**Use estes templates como base e adapte conforme necessário!**
