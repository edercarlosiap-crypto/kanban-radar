# 📖 ÍNDICE - Radar Estratégico PRO

Documentação completa do sistema. Leia os arquivos na ordem recomendada abaixo:

---

## 📚 Documentos Principais

### 1. [00_LEIA_PRIMEIRO.txt](./00_LEIA_PRIMEIRO.txt)
- ✅ Visão geral do sistema
- ✅ Estrutura de arquivos
- ✅ Checklist de inicialização
- ✅ Credenciais padrão
- ✅ **LEIA PRIMEIRO!**

### 2. [CREDENCIAIS.md](./CREDENCIAIS.md)
- 🔐 Usuário administrador padrão
- 🔐 Sistema de autenticação
- 🔐 Perfis e permissões
- 🔐 Gerenciamento de usuários
- 🔐 Segurança e tokens JWT

### 3. [QUICKSTART.md](./QUICKSTART.md)
- ⚡ Guia rápido (3 passos)
- ⚡ Primeiro acesso
- ⚡ Criar primeiro item
- ⚡ Menu principal
- ⚡ Indicadores de status

### 4. [README.md](./README.md)
- 📄 Documentação técnica completa
- 📄 Stack tecnológico
- 📄 Estrutura do projeto
- 📄 Instalação detalhada
- 📄 Scripts disponíveis

### 5. [API_EXAMPLES.md](./API_EXAMPLES.md)
- 📡 Exemplos de requisições
- 📡 Rotas da API (com /api prefix)
- 📡 Autenticação JWT
- 📡 CRUD completo
- 📡 Importação Excel
- 📡 Administração
- 📡 Valores válidos

### 6. [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
- 🛠 Extensões futuras
- 🛠 Melhorias planejadas
- 🛠 Arquitetura técnica
- 🛠 Como contribuir

### 7. [ARQUITETURA.txt](./ARQUITETURA.txt)
- 🏗 Diagramas do sistema
- 🏗 Fluxo de dados
- 🏗 Estrutura de banco de dados
- 🏗 Padrões de código

### 8. [CHECKLIST.md](./CHECKLIST.md)
- ✅ Checklist de entrega
- ✅ Testes realizados
- ✅ Funcionalidades implementadas
- ✅ Próximos passos

---

## 🚀 Início Rápido

### Para Desenvolvedores
1. **Leia:** [00_LEIA_PRIMEIRO.txt](./00_LEIA_PRIMEIRO.txt)
2. **Configure:** [QUICKSTART.md](./QUICKSTART.md)
3. **Desenvolva:** [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)
4. **API:** [API_EXAMPLES.md](./API_EXAMPLES.md)

### Para Usuários
1. **Inicie:** [QUICKSTART.md](./QUICKSTART.md)
2. **Login:** [CREDENCIAIS.md](./CREDENCIAIS.md)
3. **Use:** Tutorial no próprio sistema

### Para Administradores
1. **Credenciais:** [CREDENCIAIS.md](./CREDENCIAIS.md)
2. **Usuários:** Gerenciar em `/admin/usuarios`
3. **Logo:** Upload em `/admin/usuarios`
4. **Logs:** Monitorar em `/admin/logs`

---

## 📂 Estrutura de Diretórios

```
radar-estrategico-pro/
├── 📄 00_LEIA_PRIMEIRO.txt      # Início aqui!
├── 📄 CREDENCIAIS.md            # Autenticação e permissões
├── 📄 QUICKSTART.md             # Guia rápido
├── 📄 README.md                 # Documentação técnica
├── 📄 API_EXAMPLES.md           # Exemplos de API
├── 📄 DESENVOLVIMENTO.md        # Para desenvolvedores
├── 📄 ARQUITETURA.txt           # Diagramas e fluxos
├── 📄 CHECKLIST.md              # Checklist de entrega
├── 📄 INDICE.txt                # Este arquivo
│
├── 🔧 backend/                  # API Node.js
│   ├── src/                     # Código fonte
│   ├── scripts/                 # Scripts utilitários
│   ├── database.sqlite          # Banco de dados
│   ├── package.json             # Dependências
│   └── .env                     # Configurações
│
└── ⚛️  frontend/                 # React App
    ├── src/                     # Código fonte
    ├── public/                  # Assets públicos
    └── package.json             # Dependências
```

---

## 🔑 Informações Importantes

### Credenciais Padrão
```
📧 Email: admin@uni.com
🔑 Senha: admin123
⚠️  Altere após primeiro acesso!
```

### Portas
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

### Comandos Rápidos

**Backend:**
```bash
cd backend
npm install    # Instalar
npm run dev    # Iniciar (development)
```

**Frontend:**
```bash
cd frontend
npm install    # Instalar
npm start      # Iniciar
```

---

## 📞 Suporte e Ajuda

### Problemas Comuns

**1. "Erro ao conectar com o backend"**
- Verifique se o backend está rodando (porta 5000)
- Veja [QUICKSTART.md](./QUICKSTART.md)

**2. "Token inválido ou expirado"**
- Faça logout e login novamente
- Veja [CREDENCIAIS.md](./CREDENCIAIS.md)

**3. "Permissão insuficiente"**
- Verifique seu perfil de usuário
- Admin pode elevar permissões
- Veja [CREDENCIAIS.md](./CREDENCIAIS.md)

**4. "Não consigo criar item"**
- Perfil necessário: Editor, Gestor ou Admin
- Valores de Camada/Prioridade devem ser exatos
- Veja [API_EXAMPLES.md](./API_EXAMPLES.md)

---

## ✨ Recursos do Sistema

### Funcionalidades Principais
- ✅ Login obrigatório com JWT
- ✅ 4 perfis de usuário (Leitura, Editor, Gestor, Admin)
- ✅ CRUD completo de itens
- ✅ Kanban com drag & drop
- ✅ Importação inteligente de Excel
- ✅ 5 relatórios diferentes
- ✅ Dashboard com estatísticas
- ✅ Upload de logo personalizado
- ✅ Logs de auditoria
- ✅ Indicadores automáticos de status

### Páginas Disponíveis
- /login - Autenticação
- /dashboard - Estatísticas
- /radar - Lista de itens (CRUD)
- /kanban - Visão Kanban
- /importar - Importação Excel
- /relatorios/* - 5 tipos de relatórios
- /admin/usuarios - Gerenciar usuários
- /admin/logs - Logs do sistema

---

## 🎓 Próximos Passos

1. ✅ Leia [00_LEIA_PRIMEIRO.txt](./00_LEIA_PRIMEIRO.txt)
2. ✅ Configure o sistema ([QUICKSTART.md](./QUICKSTART.md))
3. ✅ Faça login ([CREDENCIAIS.md](./CREDENCIAIS.md))
4. ✅ Explore o sistema
5. ✅ Leia documentação técnica conforme necessário

---

**Última atualização:** 12 de fevereiro de 2026

**Versão:** 2.0.0 (Sistema completo com autenticação obrigatória)
