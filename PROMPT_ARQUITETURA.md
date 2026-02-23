# 🎯 PROMPT DE ARQUITETURA - RADAR ESTRATÉGICO PRO
## Guia Completo de Desenvolvimento para Projetos Compatíveis

---

## 📋 INSTRUÇÕES PARA IA

Ao desenvolver um novo projeto que precisa ser compatível com o **Radar Estratégico PRO**, siga RIGOROSAMENTE todas as especificações abaixo. Este documento define a arquitetura, tecnologias, versões, padrões de código e design que devem ser mantidos para garantir total compatibilidade entre os sistemas.

---

## 🏗️ ARQUITETURA DO SISTEMA

### Estrutura Geral
```
projeto/
├── backend/              # Servidor Node.js/Express
│   ├── src/
│   │   ├── app.js       # Configuração do Express
│   │   ├── server.js    # Inicialização do servidor
│   │   ├── config/      # Configurações (database, env)
│   │   ├── controllers/ # Lógica de negócio
│   │   ├── middleware/  # Autenticação, validações
│   │   ├── models/      # Modelos de dados (SQLite)
│   │   ├── routes/      # Definição de rotas da API
│   │   └── utils/       # Funções auxiliares
│   ├── uploads/         # Arquivos enviados
│   ├── package.json
│   └── .env
│
└── frontend/            # Aplicação React
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js       # Rotas principais
    │   ├── App.css      # Design System completo
    │   ├── index.js     # Entry point
    │   ├── components/  # Componentes reutilizáveis
    │   ├── pages/       # Páginas da aplicação
    │   ├── services/    # API calls (axios)
    │   └── utils/       # Funções auxiliares
    └── package.json
```

---

## 🔧 STACK TECNOLÓGICO

### Backend (Node.js)

**VERSÕES EXATAS QUE DEVEM SER USADAS:**

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "express-fileupload": "^1.4.0",
    "jsonwebtoken": "^9.0.0",
    "sqlite3": "^5.1.7",
    "uuid": "^8.3.2",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

**Scripts necessários:**
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

### Frontend (React)

**VERSÕES EXATAS QUE DEVEM SER USADAS:**

```json
{
  "dependencies": {
    "@hello-pangea/dnd": "^16.3.0",
    "axios": "^1.3.2",
    "html-to-image": "^1.11.11",
    "jspdf": "^2.5.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "recharts": "^2.12.5",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "react-scripts": "5.0.1"
  }
}
```

---

## 🎨 DESIGN SYSTEM (iOS Modern Style)

### Paleta de Cores

**DEVE USAR EXATAMENTE ESTAS VARIÁVEIS CSS:**

```css
:root {
  /* Primary Colors */
  --primary: #007AFF;
  --primary-dark: #0051D5;
  --primary-light: #4DA6FF;
  
  /* Semantic Colors */
  --success: #34C759;
  --warning: #FF9500;
  --danger: #FF3B30;
  --info: #5AC8FA;
  
  /* Neutral Colors */
  --light: #F5F5F7;
  --dark: #1D1D1F;
  --border: rgba(0, 0, 0, 0.08);
  --divider: rgba(0, 0, 0, 0.05);
  
  /* Status Colors */
  --verde: #34C759;
  --amarelo: #FF9500;
  --vermelho: #FF3B30;
  --neutro: #8E8E93;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
  --gradient-success: linear-gradient(135deg, #34C759 0%, #30D158 100%);
  --gradient-warning: linear-gradient(135deg, #FF9500 0%, #FFCC00 100%);
  --gradient-danger: linear-gradient(135deg, #FF3B30 0%, #FF6961 100%);
  
  /* Shadows (iOS style - sutis) */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 12px 36px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.08);
  
  /* Border Radius (iOS style) */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 22px;
  --radius-2xl: 28px;
  
  /* Spacing */
  --spacing-xs: 6px;
  --spacing-sm: 10px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --text-primary: #1D1D1F;
  --text-secondary: #8E8E93;
  --text-tertiary: #C7C7CC;
  
  /* Backgrounds */
  --background-primary: #FFFFFF;
  --background-secondary: #F5F5F7;
  --background-tertiary: #E5E5EA;
}
```

### Tipografia

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Roboto", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: -0.01em;
}

h1, h2, h3 {
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.02em;
}
```

### Layout Principal

**Estrutura de 2 colunas (Sidebar + Content):**

```css
.app-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
}

.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  padding: 32px 24px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  padding: 40px 48px;
  max-width: 1600px;
}
```

### Componentes Base

**Cartões (Glass Morphism):**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(30px);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  padding: 28px;
}
```

**Botões:**
```css
.btn {
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 15px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-secondary {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.btn-danger {
  background: var(--gradient-danger);
  color: white;
}
```

**Formulários:**
```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-control, .form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-family: inherit;
  background: white;
  transition: all 0.2s ease;
}

.form-control:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}
```

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### Backend - JWT

**Estrutura obrigatória:**

1. **Middleware de autenticação** (`middleware/auth.js`):
```javascript
const jwt = require('jsonwebtoken');

const autenticar = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const usuario = await Usuario.buscarPorId(decoded.usuarioId);
    
    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    if (usuario.status !== 'aprovado') {
      return res.status(403).json({ erro: 'Usuário não aprovado' });
    }

    req.usuarioId = usuario.id;
    req.usuario = usuario;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};
```

2. **Níveis de permissão:**
```javascript
// Perfis disponíveis
const PERFIS = {
  LEITURA: 'leitura',    // Apenas visualiza
  EDITOR: 'editor',      // Pode editar
  GESTOR: 'gestor',      // Pode importar/exportar
  ADMIN: 'admin'         // Acesso total
};

// Middleware para gestor ou superior
const apenasGestorOuSuperior = (req, res, next) => {
  if (!['gestor', 'admin'].includes(req.usuario.perfil)) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
  next();
};

// Middleware apenas admin
const apenasAdmin = (req, res, next) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
  next();
};
```

### Frontend - Axios + LocalStorage

**Configuração da API** (`services/api.js`):

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (nome, email, senha, senhaConfirm) =>
    api.post('/auth/register', { nome, email, senha, senhaConfirm }),
  
  login: (email, senha) =>
    api.post('/auth/login', { email, senha }),
  
  getMe: () =>
    api.get('/auth/me')
};
```

**Rota Privada** (`components/PrivateRoute.js`):

```javascript
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
```

---

## 💾 BANCO DE DADOS

### SQLite - Estrutura

**Configuração** (`config/database.js`):

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

// Funções auxiliares para Promises
const db_run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const db_get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const db_all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = { db, db_run, db_get, db_all };
```

### Padrão de Models

**Todos os models DEVEM seguir esta estrutura:**

```javascript
const { db_run, db_get, db_all } = require('../config/database');

class NomeDoModel {
  // Criar
  static async criar(dados, usuarioId) {
    const result = await db_run(
      `INSERT INTO tabela (campo1, campo2, usuarioId) VALUES (?, ?, ?)`,
      [dados.campo1, dados.campo2, usuarioId]
    );
    return result.id;
  }

  // Buscar por ID
  static async buscarPorId(id, usuarioId) {
    const item = await db_get(
      `SELECT * FROM tabela WHERE id = ? AND usuarioId = ?`,
      [id, usuarioId]
    );
    return item;
  }

  // Listar todos
  static async listar(usuarioId) {
    const itens = await db_all(
      `SELECT * FROM tabela WHERE usuarioId = ? ORDER BY dataCriacao DESC`,
      [usuarioId]
    );
    return itens;
  }

  // Atualizar
  static async atualizar(id, dados, usuarioId) {
    const result = await db_run(
      `UPDATE tabela SET campo1 = ?, campo2 = ? 
       WHERE id = ? AND usuarioId = ?`,
      [dados.campo1, dados.campo2, id, usuarioId]
    );
    return result.changes;
  }

  // Deletar
  static async deletar(id, usuarioId) {
    const result = await db_run(
      `DELETE FROM tabela WHERE id = ? AND usuarioId = ?`,
      [id, usuarioId]
    );
    return result.changes;
  }
}

module.exports = NomeDoModel;
```

---

## 🛣️ PADRÃO DE ROTAS

### Backend - Express Routes

**Estrutura obrigatória:**

```javascript
const express = require('express');
const router = express.Router();
const { autenticar, apenasAdmin, apenasGestorOuSuperior } = require('../middleware/auth');
const controller = require('../controllers/nomeController');

// Rotas públicas
router.post('/public-endpoint', controller.metodoPublico);

// Rotas autenticadas
router.get('/', autenticar, controller.listar);
router.get('/:id', autenticar, controller.buscar);
router.post('/', autenticar, controller.criar);
router.put('/:id', autenticar, controller.atualizar);
router.delete('/:id', autenticar, controller.deletar);

// Rotas com permissões especiais
router.post('/admin-only', autenticar, apenasAdmin, controller.metodoAdmin);
router.post('/gestor-only', autenticar, apenasGestorOuSuperior, controller.metodoGestor);

module.exports = router;
```

**Configuração no app.js:**

```javascript
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();

// Middlewares globais
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}));

// Rotas (PADRÃO: /api/recurso)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/recurso', require('./routes/recursoRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend funcionando ✓' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Erro global
app.use((err, req, res, next) => {
  console.error('Erro global:', err);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor'
  });
});

module.exports = app;
```

### Frontend - React Router

**Estrutura obrigatória:**

```javascript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/recurso" element={<PrivateRoute><Recurso /></PrivateRoute>} />

        {/* Redirect padrão */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
```

---

## 📊 PADRÃO DE CONTROLLERS

**Todos os controllers devem seguir esta estrutura:**

```javascript
const Model = require('../models/Model');

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
    if (!dados.campoObrigatorio) {
      return res.status(400).json({ erro: 'Campo obrigatório não fornecido' });
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
```

---

## 📱 PADRÃO DE PÁGINAS (Frontend)

**Estrutura obrigatória para todas as páginas:**

```javascript
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
  const isAdmin = perfil === 'admin';
  
  // Estados
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Carrega dados
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const response = await recursoAPI.listar();
      setDados(response.data.itens || []);
    } catch (erro) {
      setErro('Erro ao carregar dados');
      console.error(erro);
    } finally {
      setCarregando(false);
    }
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
          <h1 style={{ margin: 0, fontSize: '22px' }}>Nome do Sistema</h1>
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
              <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Título da Página</h1>
              <p style={{ color: '#8E8E93', margin: 0 }}>Descrição da página</p>
            </div>
          </div>
        </div>

        {/* Conteúdo da página */}
        <div className="glass-card">
          {/* Seu conteúdo aqui */}
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 IMPORTAÇÃO/EXPORTAÇÃO DE EXCEL

### Padrão obrigatório

**Backend - Controller:**

```javascript
const XLSX = require('xlsx');

// Preparar importação (analisa arquivo)
exports.prepararImportacao = async (req, res) => {
  try {
    if (!req.files || !req.files.arquivo) {
      return res.status(400).json({ erro: 'Arquivo não enviado' });
    }

    const arquivo = req.files.arquivo;
    const workbook = XLSX.read(arquivo.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dadosRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (dadosRaw.length < 2) {
      return res.status(400).json({ erro: 'Arquivo vazio ou sem dados' });
    }

    // Extrai cabeçalhos
    const headersRaw = dadosRaw[0];
    const colunasDisponiveis = headersRaw.map(h => String(h).trim());

    // Define campos esperados
    const camposEsperados = [
      { campo: 'campo1', obrigatorio: true, descricao: 'Campo 1' },
      { campo: 'campo2', obrigatorio: false, descricao: 'Campo 2' }
    ];

    // Preview das primeiras linhas
    const preview = dadosRaw.slice(1, 4);

    res.json({
      mensagem: 'Arquivo analisado com sucesso',
      colunasDisponiveis,
      camposEsperados,
      preview,
      totalLinhas: dadosRaw.length - 1
    });
  } catch (erro) {
    console.error('Erro ao preparar importação:', erro);
    res.status(500).json({ erro: 'Erro ao processar arquivo' });
  }
};

// Importar Excel (com mapeamento)
exports.importarExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.arquivo) {
      return res.status(400).json({ erro: 'Arquivo não enviado' });
    }

    const mapeamento = JSON.parse(req.body.mapeamento || '{}');
    
    const arquivo = req.files.arquivo;
    const workbook = XLSX.read(arquivo.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dadosRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headersRaw = dadosRaw[0];
    const linhasDados = dadosRaw.slice(1);

    let itensImportados = 0;
    const erros = [];

    for (let i = 0; i < linhasDados.length; i++) {
      const linha = linhasDados[i];
      const dados = {};

      // Mapeia colunas
      Object.keys(mapeamento).forEach(campo => {
        const coluna = mapeamento[campo];
        const indice = headersRaw.indexOf(coluna);
        if (indice !== -1) {
          dados[campo] = linha[indice];
        }
      });

      // Valida e importa
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
      erros: erros.length > 0 ? erros : null
    });
  } catch (erro) {
    console.error('Erro ao importar:', erro);
    res.status(500).json({ erro: 'Erro ao importar arquivo' });
  }
};
```

**Frontend - Exportação:**

```javascript
import * as XLSX from 'xlsx';

const exportarDados = (dados, formato = 'xlsx') => {
  if (dados.length === 0) {
    alert('Sem dados para exportar.');
    return;
  }

  const linhas = dados.map(item => ({
    'Coluna 1': item.campo1 || '',
    'Coluna 2': item.campo2 || '',
    // ... outros campos
  }));

  const worksheet = XLSX.utils.json_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  const hoje = new Date();
  const dataRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const nomeBase = `export-${dataRef}`;

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
```

---

## 🔒 VARIÁVEIS DE AMBIENTE

**Backend .env (OBRIGATÓRIO):**

```env
# Porta do servidor
PORT=5000

# Chave secreta JWT (GERAR UMA ÚNICA E SEGURA)
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# Ambiente
NODE_ENV=development
```

---

## 🚀 INICIALIZAÇÃO DO PROJETO

### Backend

```bash
cd backend
npm install
npm start          # Produção
npm run dev        # Desenvolvimento (nodemon)
```

**Porta padrão:** 5000

### Frontend

```bash
cd frontend
npm install
npm start
```

**Porta padrão:** 3000

---

## ✅ CHECKLIST DE COMPATIBILIDADE

Ao criar um novo projeto compatível, verifique:

### Backend
- [ ] Versões exatas das dependências instaladas
- [ ] Estrutura de pastas seguindo o padrão (config, controllers, middleware, models, routes, utils)
- [ ] Banco SQLite com funções db_run, db_get, db_all
- [ ] Autenticação JWT implementada
- [ ] Middleware de permissões (autenticar, apenasAdmin, apenasGestorOuSuperior)
- [ ] Controllers seguindo padrão (listar, buscar, criar, atualizar, deletar)
- [ ] Rotas no padrão /api/recurso
- [ ] CORS configurado para localhost:3000
- [ ] Upload de arquivos configurado (50MB)
- [ ] Health check em /health

### Frontend
- [ ] Versões exatas das dependências instaladas
- [ ] React Router configurado
- [ ] PrivateRoute implementado
- [ ] Axios configurado com interceptor JWT
- [ ] Design System completo (App.css)
- [ ] Variáveis CSS do iOS Modern Style
- [ ] Layout de 2 colunas (sidebar + content)
- [ ] Componentes seguindo padrão glass-card
- [ ] LocalStorage para token e usuário
- [ ] Páginas seguindo estrutura padrão
- [ ] LogoImage component
- [ ] Sistema de permissões no frontend

### Geral
- [ ] .env configurado no backend
- [ ] .gitignore incluindo node_modules, .env, database.db
- [ ] Backend rodando na porta 5000
- [ ] Frontend rodando na porta 3000
- [ ] Documentação README.md

---

## 📝 NOTAS IMPORTANTES

1. **NÃO altere as versões das dependências** sem testar compatibilidade
2. **SEMPRE use as mesmas variáveis CSS** do Design System
3. **MANTENHA o padrão de nomenclatura** (camelCase no JS, kebab-case no CSS)
4. **SIGA a estrutura de pastas** rigorosamente
5. **USE JWT para autenticação**, nunca sessions
6. **IMPLEMENTE permissões** em backend E frontend
7. **VALIDE dados** no backend, mesmo que valide no frontend
8. **USE try/catch** em todos os métodos assíncronos
9. **RETORNE erros padronizados** { erro: 'mensagem' }
10. **DOCUMENTE** cada controller e model com comentários

---

## 🎯 EXEMPLO DE USO DESTE PROMPT

**Para criar um novo projeto compatível, use este prompt:**

```
Crie um novo projeto seguindo RIGOROSAMENTE as especificações 
do arquivo PROMPT_ARQUITETURA.md. O projeto deve gerenciar 
[DESCRIÇÃO_DO_SEU_PROJETO] e precisa ser 100% compatível com 
o Radar Estratégico PRO em termos de:

- Stack tecnológico (versões exatas)
- Arquitetura (estrutura de pastas)
- Design System (iOS Modern Style)
- Autenticação (JWT com perfis)
- Padrões de código (controllers, models, rotas)

Implemente primeiro o backend completo, depois o frontend.
```

---

## 📞 SUPORTE

Para dúvidas sobre arquitetura ou compatibilidade, consulte:
- Arquivo: `ARQUITETURA.txt`
- Arquivo: `DESENVOLVIMENTO.md`
- Pasta: `backend/src/` (exemplos de implementação)
- Pasta: `frontend/src/` (exemplos de componentes)

---

**Versão do Documento:** 1.0  
**Data:** 17 de Fevereiro de 2026  
**Projeto Base:** Radar Estratégico PRO

---

## 🔄 ATUALIZAÇÕES

Caso este documento seja atualizado, todos os projetos compatíveis 
devem ser revisados e atualizados conforme as novas especificações.

---

**FIM DO DOCUMENTO**
