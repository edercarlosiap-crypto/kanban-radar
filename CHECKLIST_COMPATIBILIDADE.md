# ✅ CHECKLIST DE COMPATIBILIDADE - Radar PRO

Use este checklist para verificar se seu novo projeto está 100% compatível.

---

## 📦 DEPENDÊNCIAS

### Backend
```json
- [ ] express: ^4.18.2
- [ ] bcryptjs: ^2.4.3
- [ ] cors: ^2.8.5
- [ ] dotenv: ^16.0.3
- [ ] express-fileupload: ^1.4.0
- [ ] jsonwebtoken: ^9.0.0
- [ ] sqlite3: ^5.1.7
- [ ] uuid: ^8.3.2
- [ ] xlsx: ^0.18.5
- [ ] nodemon: ^2.0.20 (dev)
```

### Frontend
```json
- [ ] react: ^18.2.0
- [ ] react-dom: ^18.2.0
- [ ] react-router-dom: ^6.8.0
- [ ] axios: ^1.3.2
- [ ] @hello-pangea/dnd: ^16.3.0
- [ ] html-to-image: ^1.11.11
- [ ] jspdf: ^2.5.1
- [ ] recharts: ^2.12.5
- [ ] xlsx: ^0.18.5
- [ ] react-scripts: 5.0.1 (dev)
```

---

## 📁 ESTRUTURA DE PASTAS

### Backend
```
- [ ] backend/src/app.js existe
- [ ] backend/src/server.js existe
- [ ] backend/src/config/database.js existe
- [ ] backend/src/controllers/ existe
- [ ] backend/src/middleware/auth.js existe
- [ ] backend/src/models/ existe
- [ ] backend/src/routes/ existe
- [ ] backend/src/utils/ existe
- [ ] backend/uploads/ existe
- [ ] backend/.env existe
- [ ] backend/package.json existe
```

### Frontend
```
- [ ] frontend/src/App.js existe
- [ ] frontend/src/App.css existe
- [ ] frontend/src/index.js existe
- [ ] frontend/src/components/PrivateRoute.js existe
- [ ] frontend/src/components/LogoImage.js existe
- [ ] frontend/src/services/api.js existe
- [ ] frontend/src/pages/ existe
- [ ] frontend/src/utils/ existe
- [ ] frontend/public/index.html existe
- [ ] frontend/package.json existe
```

---

## 🎨 DESIGN SYSTEM

### Variáveis CSS (App.css)
```
- [ ] --primary: #007AFF definido
- [ ] --success: #34C759 definido
- [ ] --warning: #FF9500 definido
- [ ] --danger: #FF3B30 definido
- [ ] --radius-sm a --radius-2xl definidos
- [ ] --shadow-sm a --shadow-xl definidos
- [ ] Font: -apple-system configurada
- [ ] h1, h2, h3: font-weight 600
```

### Componentes Obrigatórios
```
- [ ] .app-layout (flex, min-height 100vh)
- [ ] .sidebar (280px, fixa, border-right)
- [ ] .main-content (margin-left 280px, padding 40px 48px)
- [ ] .glass-card (rgba(255,255,255,0.98), backdrop-filter)
- [ ] .btn, .btn-primary, .btn-secondary, .btn-danger
- [ ] .form-control, .form-select, .form-label
- [ ] .loading, .spinner
- [ ] .alert, .alert-success, .alert-danger
```

---

## 🔐 AUTENTICAÇÃO

### Backend
```
- [ ] JWT_SECRET no .env
- [ ] middleware/auth.js implementado
- [ ] autenticar() middleware existe
- [ ] apenasAdmin() middleware existe
- [ ] apenasGestorOuSuperior() middleware existe
- [ ] Token expira em 7 dias
- [ ] Verifica Authorization: Bearer {token}
```

### Frontend
```
- [ ] components/PrivateRoute.js implementado
- [ ] services/api.js com axios configurado
- [ ] Interceptor adiciona JWT em todas requisições
- [ ] LocalStorage: token e usuario
- [ ] Redirect para /login se não autenticado
```

### Perfis
```
- [ ] leitura: apenas visualiza
- [ ] editor: pode editar
- [ ] gestor: pode importar/exportar
- [ ] admin: acesso total
```

---

## 💾 BANCO DE DADOS

### SQLite
```
- [ ] config/database.js configurado
- [ ] db_run() retorna Promise com { id, changes }
- [ ] db_get() retorna Promise com objeto
- [ ] db_all() retorna Promise com array
- [ ] database.db criado
```

### Models
```
- [ ] Todos models são classes
- [ ] criar(dados, usuarioId) implementado
- [ ] buscarPorId(id, usuarioId) implementado
- [ ] listar(usuarioId) implementado
- [ ] atualizar(id, dados, usuarioId) implementado
- [ ] deletar(id, usuarioId) implementado
- [ ] Todos métodos são async/await
```

---

## 🛣️ ROTAS E API

### Backend
```
- [ ] app.js: express() configurado
- [ ] app.js: cors() com localhost:3000
- [ ] app.js: express.json() middleware
- [ ] app.js: fileUpload() limite 50MB
- [ ] Todas rotas em /api/*
- [ ] GET /health retorna { status: 'Backend funcionando ✓' }
- [ ] 404 handler implementado
- [ ] Error handler global implementado
```

### Routes Pattern
```
- [ ] GET    /api/recurso → listar
- [ ] GET    /api/recurso/:id → buscar
- [ ] POST   /api/recurso → criar
- [ ] PUT    /api/recurso/:id → atualizar
- [ ] DELETE /api/recurso/:id → deletar
- [ ] Todas rotas autenticadas (exceto auth)
```

### Frontend
```
- [ ] React Router configurado
- [ ] Route /login (público)
- [ ] Route /dashboard (privado)
- [ ] Route / → Navigate to /dashboard
- [ ] api.js: baseURL = 'http://localhost:5000/api'
```

---

## 📊 CONTROLLERS

### Padrão Obrigatório
```
- [ ] exports.listar com try/catch
- [ ] exports.buscar com validação 404
- [ ] exports.criar com validações
- [ ] exports.atualizar com validação 404
- [ ] exports.deletar com validação 404
- [ ] Todos retornam JSON padronizado
- [ ] Erros retornam { erro: 'mensagem' }
- [ ] Status codes corretos (200, 201, 400, 401, 403, 404, 500)
```

---

## 📱 PÁGINAS (Frontend)

### Estrutura Obrigatória
```
- [ ] import { useNavigate } from 'react-router-dom'
- [ ] usuario = localStorage.getItem('usuario')
- [ ] perfil extraído do usuario
- [ ] canEditar, canDeletar, isAdmin definidos
- [ ] useState para dados, carregando, erro
- [ ] useEffect para carregar dados
- [ ] sairDoSistema() remove token e redireciona
- [ ] Loading state com spinner
- [ ] Sidebar com LogoImage, nav, perfil, botão sair
- [ ] Main content com título e descrição
```

### Sidebar Obrigatória
```
- [ ] LogoImage + Nome do sistema
- [ ] <nav> com links (onClick + navigate)
- [ ] Link ativo tem className="active"
- [ ] Card de perfil com nome, email, perfil
- [ ] Botão "🚪 Sair" com onClick
```

---

## 📦 EXCEL IMPORT/EXPORT

### Backend
```
- [ ] prepararImportacao(req, res) implementado
- [ ] importarExcel(req, res) implementado
- [ ] XLSX.read() para ler arquivo
- [ ] sheet_to_json() para extrair dados
- [ ] Retorna colunasDisponiveis
- [ ] Retorna camposEsperados
- [ ] Retorna preview (3 linhas)
- [ ] Aceita mapeamento de colunas
```

### Frontend
```
- [ ] import * as XLSX from 'xlsx'
- [ ] exportarDados() implementado
- [ ] json_to_sheet() converte dados
- [ ] Suporta .xlsx e .csv
- [ ] Nome arquivo: recurso-export-YYYY-MM-DD
- [ ] Página ImportarExcel com 2 etapas
- [ ] Etapa 1: upload arquivo
- [ ] Etapa 2: mapear colunas
```

---

## ⚙️ CONFIGURAÇÕES

### Backend (.env)
```
- [ ] PORT=5000
- [ ] JWT_SECRET definido (mínimo 32 caracteres)
- [ ] NODE_ENV=development
```

### CORS
```
- [ ] origin: ['http://localhost:3000', 'http://localhost:3001']
- [ ] credentials: true
```

### File Upload
```
- [ ] limits: { fileSize: 50 * 1024 * 1024 }
- [ ] Middleware para erro LIMIT_FILE_SIZE
```

---

## 🚀 INICIALIZAÇÃO

### Backend
```
- [ ] npm install funciona sem erros
- [ ] npm start inicia na porta 5000
- [ ] npm run dev funciona com nodemon
- [ ] Console exibe mensagem de sucesso
- [ ] GET http://localhost:5000/health responde
```

### Frontend
```
- [ ] npm install funciona sem erros
- [ ] npm start inicia na porta 3000
- [ ] Abre automaticamente no navegador
- [ ] Não há erros no console
- [ ] Hot reload funciona
```

---

## 🧪 TESTES BÁSICOS

### Autenticação
```
- [ ] /login exibe formulário
- [ ] Login com credenciais corretas funciona
- [ ] Token salvo no localStorage
- [ ] Redirect para /dashboard após login
- [ ] Rotas privadas exigem autenticação
- [ ] Logout remove token e redireciona
```

### CRUD Básico
```
- [ ] Criar novo item funciona
- [ ] Listar itens funciona
- [ ] Editar item funciona
- [ ] Deletar item funciona
- [ ] Filtros/busca funcionam
```

### Permissões
```
- [ ] Perfil 'leitura' não vê botões de editar/deletar
- [ ] Perfil 'editor' pode editar
- [ ] Perfil 'gestor' pode importar/exportar
- [ ] Perfil 'admin' vê todas funcionalidades
```

---

## 📄 DOCUMENTAÇÃO

### Arquivos Obrigatórios
```
- [ ] README.md com instruções de instalação
- [ ] .gitignore (node_modules, .env, database.db)
- [ ] package.json com nome, versão, descrição
```

### Comentários no Código
```
- [ ] Controllers têm comentários nos métodos
- [ ] Models têm comentários nas funções
- [ ] Rotas têm comentários dos endpoints
- [ ] Componentes complexos têm comentários
```

---

## 🔍 VALIDAÇÕES

### Backend
```
- [ ] Valida campos obrigatórios
- [ ] Retorna 400 para dados inválidos
- [ ] Verifica permissões antes de executar
- [ ] Valida formato de email
- [ ] Hash de senhas com bcrypt
```

### Frontend
```
- [ ] Valida campos antes de enviar
- [ ] Exibe mensagens de erro amigáveis
- [ ] Desabilita botões durante loading
- [ ] Confirma antes de deletar
- [ ] Limpa formulário após sucesso
```

---

## 🎯 COMPATIBILIDADE FINAL

### Verificação Final
```
- [ ] Backend roda na porta 5000
- [ ] Frontend roda na porta 3000
- [ ] Design System usa cores iOS
- [ ] Layout tem sidebar + content
- [ ] Autenticação JWT funcionando
- [ ] Perfis implementados
- [ ] CRUD completo funciona
- [ ] Import/Export Excel funciona
- [ ] Todas dependências nas versões corretas
- [ ] Estrutura de pastas idêntica
- [ ] Padrões de código seguidos
```

---

## 📊 SCORE DE COMPATIBILIDADE

**Total de itens:** 200+

- **100%** (200+ ✅): Totalmente compatível
- **90-99%** (180-199 ✅): Compatível com pequenos ajustes
- **80-89%** (160-179 ✅): Parcialmente compatível, precisa revisão
- **< 80%** (< 160 ✅): Incompatível, refazer seguindo specs

---

## 🔄 PRÓXIMOS PASSOS

Após completar este checklist:

1. ✅ Teste todas as funcionalidades
2. ✅ Verifique console para erros
3. ✅ Teste em diferentes perfis
4. ✅ Documente funcionalidades específicas
5. ✅ Faça backup do banco de dados
6. ✅ Commit inicial no Git

---

**Versão:** 1.0 | **Data:** 17/02/2026 | **Projeto:** Radar Estratégico PRO
