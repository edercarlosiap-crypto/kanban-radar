# 📊 Radar Estratégico PRO

Sistema web profissional para controle de projetos, tarefas e iniciativas estratégicas.

## 🎯 Características

✨ **Autenticação JWT Obrigatória** - Sistema seguro de login com perfis  
📊 **Dashboard Intuitivo** - Visão geral de projetos e KPIs  
🎯 **Kanban Drag & Drop** - Gerenciamento visual de tarefas  
📥 **Importação Excel** - Integração com planilhas (mapeamento inteligente)  
📈 **Indicadores Automáticos** - Status atualizado em tempo real  
👥 **Multiusuário** - Controle de acesso por perfil (Leitura, Editor, Gestor, Admin)  
🛡 **Rotas Protegidas** - Todas as páginas exigem autenticação  
📑 **Relatórios Completos** - Visão Geral, Riscos, Pessoas, Diretorias, Timeline  
🖼️ **Branding** - Upload de logo personalizado (Admin)

## 🛠 Stack Tecnológico

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Router + Axios
- **Drag & Drop**: @hello-pangea/dnd
- **Excel**: SheetJS (xlsx)
- **Autenticação**: JWT + bcrypt
- **CSS**: Estilos corporativos customizados

## 📁 Estrutura do Projeto

```
radar-estrategico-pro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Configuração SQLite
│   │   ├── controllers/
│   │   │   ├── authController.js    # Autenticação
│   │   │   └── radarController.js   # Radar CRUD
│   │   ├── middleware/
│   │   │   └── auth.js              # Middleware JWT
│   │   ├── models/
│   │   │   ├── Usuario.js           # Model Usuário
│   │   │   └── Radar.js             # Model Radar
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # Rotas auth
│   │   │   └── radarRoutes.js       # Rotas radar
│   │   ├── app.js                   # Config Express
│   │   └── server.js                # Entry point
│   ├── package.json
│   ├── .env                         # Variáveis ambiente
│   └── database.db                  # Banco SQLite (gerado)
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js             # Tela de login
│   │   │   ├── Dashboard.js         # Dashboard principal
│   │   │   ├── Radar.js             # Lista de itens
│   │   │   ├── Kanban.js            # View Kanban
│   │   │   └── ImportarExcel.js     # Importação
│   │   ├── services/
│   │   │   └── api.js               # Cliente API
│   │   ├── App.js                   # Router principal
│   │   ├── index.js                 # Entry point
│   │   └── App.css                  # Estilos globais
│   ├── package.json
│   └── .gitignore
│
└── README.md                        # Este arquivo
```

## 🚀 Instalação e Configuração

### 1️⃣ Clonar/Preparar o projeto

```bash
cd radar-estrategico-pro
```

### 2️⃣ Instalar Backend

```bash
cd backend
npm install
```

Configure o arquivo `.env`:

```
JWT_SECRET=sua_chave_secreta_super_segura_123456
PORT=5000
NODE_ENV=development
```

### 3️⃣ Instalar Frontend

```bash
cd ../frontend
npm install
```

## � Primeiro Acesso

O sistema possui um usuário administrador padrão pré-criado:

```
📧 Email: admin@uni.com
🔑 Senha: admin123
```

**⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

## �📚 Iniciando a Aplicação

### Terminal 1 - Backend

```bash
cd backend
npm start
```

Resultado esperado:
```
╔════════════════════════════════════════╗
║   Radar Estratégico PRO - Backend     ║
║   Servidor iniciado com sucesso      ║
║   ✓ Banco de dados SQLite conectado  ║
║   Porta: 5000                        ║
╚════════════════════════════════════════╝
```

### Terminal 2 - Frontend

```bash
cd frontend
npm start
```

O frontend abrirá automaticamente em `http://localhost:3000`

## 🔐 Módulo de Autenticação

### Registrar Novo Usuário

```
GET /login (no navegador)
→ Clicar em "Registrar"
→ Preencher: Nome, Email, Senha
→ Será feito auto-login e redirecionado para Dashboard
```

### Fazer Login

```
POST /auth/login
{
  "email": "usuario@example.com",
  "senha": "senha123456"
}

Resposta:
{
  "token": "eyJhbGc...",
  "usuario": {
    "id": 1,
    "nome": "João",
    "email": "joao@example.com",
    "perfil": "usuario"
  }
}
```

## 📊 Módulo do Radar

### Criação de Item

**Campos obrigatórios:**
- Camada (ex: Estratégica, Tática)
- Tipo (ex: Projeto, Iniciativa)
- Ação (descrição)
- Equipe (responsável coletivamente)
- Responsável (pessoa)
- Concluir até (data limite)

**Campos opcionais:**
- Prioridade (Baixa, Média, Alta, Crítica)
- Kanban (coluna atual)
- Observação
- Link Bitrix

### Status Automático

Os itens são classificados automaticamente:

```
🟢 Verde (No prazo)        → > 7 dias até data limite
🟡 Amarelo (Atenção)       → 4-7 dias até data limite
🔴 Vermelho (Crítico)      → 0-3 dias até data limite
🔴 Atrasado               → < 0 dias (passou do prazo)
```

## 🎯 Sistema Kanban

**Colunas disponíveis:**
1. Backlog
2. Planejado
3. Em Estruturação
4. Em Execução
5. Travado
6. Validação
7. Concluído

**Funcionalidade:**
- Arraste cartões entre colunas
- Atualização automática no banco de dados
- Indicadores visuais de prioridade e prazo

## 📥 Importação de Excel

### Formato da Planilha

A planilha debe conter estas colunas:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| Data criação | Data de criação (YYYY-MM-DD) | 2024-02-07 |
| Camada | Camada estratégica | Estratégica |
| Prioridade | Nível de prioridade | Alta |
| Tipo | Tipo de ação | Projeto |
| Ação | Descrição da ação | Implementar sistema |
| Equipe | Equipe responsável | TI |
| Responsável | Pessoa responsável | João Silva |
| Concluir até | Data limite (YYYY-MM-DD) | 2024-03-15 |
| Kanban | Status atual | Em Execução |
| Observação | Notas adicionais | Já iniciado |
| Link bitrix | Link do Bitrix24 | https://bitrix.com |

### Como Usar

1. Clique em "📥 Importar Excel" no menu
2. Clique em "Download Modelo" para obter o template
3. Preencha a planilha com seus dados
4. Selecione o arquivo e clique em "Importar"
5. Os itens serão criados em seu radar

## 📊 Dashboard

Mostra estatísticas em tempo real:

- **Total de Itens**: Quantidade total
- **Concluídos**: Itens finalizados
- **Críticos**: Itens em vermelho (0-3 dias ou atrasados)
- **Atrasados**: Itens com prazo vencido
- **Barra de Progresso**: % concluído

## 🔌 API REST

### Autenticação

```bash
POST /auth/register
POST /auth/login
GET /auth/me (protegida)
```

### Radar

```bash
GET /radar                    # Lista todos
POST /radar                   # Criar novo
GET /radar/:id               # Buscar um
PUT /radar/:id               # Atualizar
DELETE /radar/:id            # Deletar
POST /radar/importar-excel    # Importar Excel
GET /radar/estatisticas/dashboard  # Stats
```

## 🎨 Personalização

### Alterar Cores Corporativas

Edite `frontend/src/App.css`:

```css
:root {
  --primary: #2563eb;      /* Azul principal */
  --secondary: #64748b;    /* Cinza */
  --success: #10b981;      /* Verde */
  --warning: #f59e0b;      /* Amarelo */
  --danger: #ef4444;       /* Vermelho */
}
```

### Alterar Logo/Título

Edite `frontend/src/pages/Login.js`:

```jsx
<h1 style={styles.titulo}>📊 Seu Logo</h1>
```

## 🐛 Troubleshooting

### "Porta 5000 já em uso"
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### "CORS error"
Verifique se backend está rodando em `http://localhost:5000`

### "Banco de dados não inicializa"
Delete `backend/database.db` e reinicie o backend

## 📝 Exemplo de Uso

### 1. Criar Conta

- Abra http://localhost:3000/login
- Clique em "Registrar"
- Preencha: Nome, Email, Senha
- Clique em "Registrar"

### 2. Adicionar Item

- Vá para "📈 Radar"
- Clique em "+ Novo Item"
- Preencha os campos obrigatórios
- Clique em "✓ Criar"

### 3. Gerenciar no Kanban

- Vá para "🎯 Kanban"
- Arraste os cartões entre colunas
- As mudanças são salvas automaticamente

### 4. Importar Excel

- Vá para "📥 Importar Excel"
- Clique em "Download Modelo"
- Preencha a planilha
- Envie a planilha

## 🔒 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Tokens JWT com expiração (7 dias)
- ✅ Isolamento de dados por usuário
- ✅ Validação em cliente e servidor
- ✅ CORS configurado

## 📱 Responsividade

Sistema otimizado para:
- 🖥️ Desktop (1920px+)
- 💻 Tablet (768px - 1024px)
- 📱 Mobile (320px - 767px)

## 🚢 Deploy

### Deploy Backend (Heroku, Render, Railway)

```bash
# Prepare
heroku login
heroku create seu-app-radar

# Enviar
git push heroku main

# Configurar .env
heroku config:set JWT_SECRET=sua_chave
```

### Deploy Frontend (Vercel, Netlify)

```bash
# Vercel
npm install -g vercel
vercel

# Configure API_BASE baseado em produção
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o console (F12) para erros
2. Verifique os logs do backend
3. Confirme se banco e APIs estão rodando

## 📄 Licença

Projeto interno - Radar Estratégico PRO © 2024

---

**Made with ❤️ para gestão estratégica eficiente**
#   k a n b a n - r a d a r  
 #   k a n b a n - r a d a r  
 