# 🚀 GUIA RÁPIDO - Radar Estratégico PRO

## ⚡ Inicialização Rápida (3 passos)

### ✅ Passo 1: Instalar Dependências

**Terminal 1 - Backend**
```bash
cd backend
npm install
```

**Terminal 2 - Frontend**
```bash
cd frontend
npm install
```

---

### ✅ Passo 2: Iniciar Backend

**Terminal 1**
```bash
cd backend
npm run dev
```

Você deve ver:
```
╔════════════════════════════════════════╗
║   Radar Estratégico PRO - Backend     ║
║   Servidor iniciado com sucesso      ║
║   ✓ Banco de dados SQLite conectado  ║
║   Porta: 5000                        ║
╚════════════════════════════════════════╝
```

---

### ✅ Passo 3: Iniciar Frontend

**Terminal 2**
```bash
cd frontend
npm start
```

O navegador abrirá automaticamente em `http://localhost:3000`

---

## 🔐 Primeiro Acesso

**⚠️ IMPORTANTE: O sistema agora exige login obrigatório!**

### Credenciais Padrão (Admin)
```
📧 Email: admin@uni.com
🔑 Senha: admin123
```

**Passos:**
1. Acesse `http://localhost:3000`
2. Será redirecionado automaticamente para `/login`
3. Entre com as credenciais acima
4. Será redirecionado ao Dashboard

**⚠️ Altere a senha do admin após primeiro acesso!**

### Criar Novos Usuários
1. Vá em **Usuários** (menu admin)
2. Novos usuários podem se registrar pela tela de login
3. Admin deve **aprovar** novos usuários
4. Perfis disponíveis:
   - **Leitura**: Apenas visualização
   - **Editor**: Criar e editar itens
   - **Gestor**: Importar Excel, deletar itens
   - **Admin**: Acesso total + gerenciar usuários

---

## 📋 Menu Principal

Após autenticado, você terá acesso a:

| Menu | Descrição | Perfil Mínimo |
|------|-----------|---------------|
| 📊 Dashboard | Estatísticas em tempo real | Leitura |
| 📈 Radar | Lista completa de itens | Leitura |
| 🎯 Kanban | View de arrastar e soltar | Leitura |
| 📑 Relatórios | Visão Geral, Riscos, Pessoas, Diretorias, Timeline | Leitura |
| 📥 Importar Excel | Importação em lote | Gestor |
| 🛡 Usuários | Gerenciar usuários e logo | Admin |

---

**Perfil necessário:** Editor, Gestor ou Admin

1. Vá para "📈 Radar"
2. Clique em "+ Novo Item"
3. Preencha os campos obrigatórios:
   - **Camada**: `🟢 CAMADA 1 — PROJETOS QUE DEFINEM O 2026 DA UNI`
   - **Prioridade** (só para CAMADA 1): `🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO`
   - **Tipo**: Tarefa, Projeto ou OKR
   - **Ação**: Descrição do item
   - **Equipe**: Comercial, Marketing, Gov, Retenção ou Diretoria Comercial
   - **Responsável**: Osmilton, Sergio, Eder, Ezequias, João Paulo ou Mailon
   - **Concluir até**: Data limite (formato: YYYY-MM-DD)
   - **Status Kanban**: Backlog, Em Execução, Concluído, etc.
   - **Observação**: Campo opcional
   - **Link Bitrix**: URL opcional
4. Clique em "Salvar"

**Resultado:** Item criado e exibido na lista com indicador de status automático!
   - Concluir até (data)
4. Clique em "✓ Criar"

---

## 📊 Indicadores de Status

Aparecem automaticamente baseado em dias até a data limite:

- 🟢 **Verde** = No prazo (>7 dias)
- 🟡 **Amarelo** = Atenção (4-7 dias)
- 🔴 **Vermelho** = Crítico (0-3 dias)
- 🔴 **Atrasado** = Passou a data

---

## 📥 Importar Planilha Excel

1. Vá para "📥 Importar Excel"
2. Clique em "⬇️ Download Modelo"
3. Preencha a planilha
4. Selecione e clique em "✓ Importar"

---

## 🎯 Usar Kanban

1. Vá para "🎯 Kanban"
2. Arraste cartões entre colunas
3. O banco de dados atualiza automaticamente

---

## 🛠 Variáveis de Ambiente

**Backend (.env)**
```
JWT_SECRET=sua_chave_secreta_super_segura
PORT=5000
NODE_ENV=development
```

---

## 🔑 Credenciais Padrão

Nenhuma. O sistema obriga registrar ao primeiro acesso.

Exemplo:
```
Email: admin@example.com
Senha: admin12345
```

---

## 📁 Banco de Dados

Arquivo: `backend/database.db`

**Tabelas criadas automaticamente:**
- usuarios (id, nome, email, senha, perfil, dataCriacao)
- radar (id, dataCriacao, camada, prioridade, tipo, acao, equipe, responsavel, concluirAte, kanban, observacao, linkBitrix, usuarioId)

---

## 🐛 Problemas Comuns

### ❌ "Porta 5000 já em uso"
```bash
# Mudar porta no .env
PORT=3001

# Ou matar o processo
# Windows: netstat -ano | findstr :5000
# Linux: lsof -i :5000
```

### ❌ "Cannot GET /login"
O backend não está rodando. Verifique se está em `http://localhost:5000`

### ❌ "CORS error"
Backend e Frontend devem estar em portas diferentes (5000 e 3000)

---

## 📱 URLs Principais

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Health Check: `http://localhost:5000/health`

---

## 🚀 Pronto para Usar!

Agora você tem:
- ✅ Autenticação JWT completa
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de radar
- ✅ Kanban visual
- ✅ Importação Excel
- ✅ Design corporativo
- ✅ Multiusuário
- ✅ Banco de dados SQLite

**Divirta-se! 🎉**
