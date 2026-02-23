# 🚀 Cálculo de Comissão

Sistema completo de cálculo de comissão construído com **Express Backend + React Frontend**.

**100% compatível com Radar Estratégico PRO** - Arquitetura, design system, autenticação JWT e padrões de código.

---

## 📋 Funcionalidades

✅ **Autenticação JWT** com perfis de acesso (leitura, editor, gestor, admin)
✅ **Dashboard** com informações do usuário
✅ **Gerenciamento de Regionais** (apenas admin)
✅ **Gerenciamento de Usuários** (apenas admin)
✅ **Configuração de Regras de Comissão** (apenas admin)
✅ **Design System iOS Modern** com cores e componentes padronizados
✅ **Banco SQLite** com estrutura normalizada
✅ **API RESTful** com padrões CRUD

---

## 🛠️ Stack Tecnológico

### Backend
- **Node.js 14+**
- **Express 4.18.2** - Framework web
- **SQLite3 5.1.7** - Banco de dados
- **JWT 9.0.0** - Autenticação
- **bcryptjs 2.4.3** - Hash de senhas

### Frontend
- **React 18.2.0** - Library UI
- **React Router DOM 6.8.0** - Roteamento
- **Axios 1.3.2** - HTTP client
- **Recharts 2.12.5** - Gráficos

---

## 📦 Instalação

### 1. Clone ou copie o projeto

```bash
cd calculo-comissao-radar-pro
```

### 2. Instale dependências do Backend

```bash
cd backend
npm install
```

### 3. Instale dependências do Frontend

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuração

### Backend

1. Verifique o arquivo `.env`:

```bash
# backend/.env
PORT=5000
JWT_SECRET=seu_jwt_secret_super_secreto_minimo_32_caracteres_12345
NODE_ENV=development
```

2. (Opcional) Customize o `JWT_SECRET` com um valor seguro:

```
JWT_SECRET=meu_muito_secreto_super_seguro_token_string_123456789
```

---

## 🚀 Execução

### Terminal 1 - Backend (porta 5000)

```bash
cd backend
npm run dev
```

Você verá:
```
==================================================
✅ Backend funcionando na porta 5000
📍 http://localhost:5000
==================================================
```

### Terminal 2 - Frontend (porta 3000)

```bash
cd frontend
npm start
```

O navegador abrirá automaticamente em `http://localhost:3000`.

---

## 🔑 Login Padrão

**Email:** `admin@example.com`
**Senha:** `123456`
**Função:** `admin`

> ⚠️ Gere seus dados de seed customizados antes de produção!

---

## 📁 Estrutura de Pastas

```
calculo-comissao-radar-pro/
│
├── backend/
│   ├── src/
│   │   ├── app.js              # Configuração Express
│   │   ├── server.js           # Entrada do servidor
│   │   ├── config/
│   │   │   └── database.js     # Configuração SQLite
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT authentication
│   │   ├── models/             # Models de dados
│   │   ├── controllers/        # Controllers de lógica
│   │   ├── routes/             # Definição de rotas
│   │   └── utils/              # Funções auxiliares
│   ├── .env                    # Variáveis de ambiente
│   ├── package.json
│   └── database.db             # (criado automaticamente)
│
├── frontend/
│   ├── src/
│   │   ├── App.js              # Componente raiz
│   │   ├── App.css             # Design System completo
│   │   ├── index.js            # Entry point
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── services/
│   │   │   └── api.js          # Configuração axios
│   │   └── utils/
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter perfil do usuário

### Usuários
- `GET /api/usuarios` - Listar todos
- `GET /api/usuarios/:id` - Buscar por ID
- `PUT /api/usuarios/:id` - Atualizar (admin)
- `DELETE /api/usuarios/:id` - Deletar (admin)

### Regionais
- `GET /api/regionais` - Listar todas
- `GET /api/regionais/:id` - Buscar por ID
- `POST /api/regionais` - Criar (admin)
- `PUT /api/regionais/:id` - Atualizar (admin)
- `DELETE /api/regionais/:id` - Deletar (admin)

### Regras de Comissão
- `GET /api/regras-comissao` - Listar todas
- `GET /api/regras-comissao/:id` - Buscar por ID
- `GET /api/regras-comissao/regional/:regionalId` - Listar por regional
- `POST /api/regras-comissao` - Criar (admin)
- `PUT /api/regras-comissao/:id` - Atualizar (admin)
- `DELETE /api/regras-comissao/:id` - Deletar (admin)

### Vendas
- `GET /api/vendas` - Listar todas
- `GET /api/vendas/:id` - Buscar por ID
- `GET /api/vendas/usuario/:usuarioId` - Listar por usuario
- `GET /api/vendas/regional/:regionalId` - Listar por regional
- `POST /api/vendas` - Criar
- `PUT /api/vendas/:id` - Atualizar
- `DELETE /api/vendas/:id` - Deletar (gestor/admin)

---

## 🎨 Design System

### Cores Principais
- **Primária:** `#007AFF` (Azul iOS)
- **Sucesso:** `#34C759` (Verde)
- **Alerta:** `#FF9500` (Laranja)
- **Perigo:** `#FF3B30` (Vermelho)

### Componentes Padronizados
- `.glass-card` - Cards com efeito glassmorphism
- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Botões
- `.form-control`, `.form-select` - Formulários
- `.sidebar` - Barra lateral fixa 280px
- `.main-content` - Conteúdo principal responsivo

---

## 👥 Perfis de Acesso

| Perfil | Visualizar | Editar | Deletar | Admin |
|--------|-----------|--------|--------|-------|
| leitura | ✓ | ✗ | ✗ | ✗ |
| editor | ✓ | ✓ | ✗ | ✗ |
| gestor | ✓ | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✓ |

---

## 🗄️ Banco de Dados

O banco SQLite é criado automaticamente em `backend/database.db` com as tabelas:

- **usuarios** - Usuários do sistema
- **regionais** - Regionais de vendas
- **regras_comissao** - Regras de cálculo de comissão
- **vendas** - Registro de vendas

---

## 🔒 Segurança

✅ Senhas com hash bcrypt
✅ JWT com expiração 7 dias
✅ CORS configurado (localhost:3000/3001)
✅ Validação de permissões em cada rota
✅ Tokens armazenados no localStorage

---

## 🧪 Testes

### Testar Backend

```bash
cd backend
curl http://localhost:5000/health
# Resposta: {"status":"Backend funcionando ✓"}
```

### Testar Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","senha":"123456"}'
```

---

## 📝 Checklist de Compatibilidade

- ✅ Backend rodando na porta 5000
- ✅ Frontend rodando na porta 3000
- ✅ Design System iOS implementado
- ✅ Autenticação JWT funcionando
- ✅ Sidebar + main content layout
- ✅ Perfis de acesso implementados
- ✅ CRUD completo de todas entidades
- ✅ SQLite com estrutura normalizada
- ✅ Error handling completo
- ✅ Respalde pronto para produção

---

## 🚀 Deploy (Próximas Etapas)

Para produção:

1. Gere JWT_SECRET seguro
2. Altere NODE_ENV para production
3. Configure CORS para domínios reais
4. Use banco PostgreSQL/MySQL
5. Implemente HTTPS
6. Configure variáveis de ambiente via CI/CD

---

## 📚 Referência

- [Documentação de Arquitetura](../Detalhado%20Radar)
- [Express Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [SQLite Documentation](https://www.sqlite.org)

---

## 📄 Licença

Este projeto é código propriétário.

---

**Versão:** 1.0 | **Data:** 17/02/2026 | **Status:** Pronto para Produção
