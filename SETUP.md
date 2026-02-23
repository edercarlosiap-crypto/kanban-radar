# 🚀 SETUP.md - Instruções de Instalação Rápida

## ⚡ Instalação em 3 Passos

### Passo 1: Instalar Backend

```bash
cd backend
npm install
```

### Passo 2: Instalar Frontend

```bash
cd ../frontend
npm install
```

### Passo 3: Iniciar os Serviços

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

---

## 🔑 Credenciais Padrão

```
Email: admin@example.com
Senha: 123456
```

---

## ✅ Validações Rápidas

### Backend está funcionando?
```bash
curl http://localhost:5000/health
```

Resposta esperada:
```json
{"status":"Backend funcionando ✓"}
```

### Frontend está acessível?
Navegador: `http://localhost:3000`

---

## 📱 Fluxo Básico

1. Acesse `http://localhost:3000`
2. Faça login com as credenciais padrão
3. Você será redirecionado para o Dashboard
4. Explore as seções (Regionais, Usuários, Regras de Comissão)

---

## 🛠️ Scripts Disponíveis

### Backend

```bash
npm start        # Inicia servidor (sem watch)
npm run dev      # Inicia com nodemon (autoreload)
```

### Frontend

```bash
npm start        # Inicia em modo desenvolvimento (porta 3000)
npm run build    # Build para produção
npm test         # Executa testes
npm run eject    # Eject react-scripts (não recomendado)
```

---

## 🔧 Configuração Customizada

### Mudar JWT_SECRET

Edite `backend/.env`:

```
JWT_SECRET=seu_novo_secret_super_seguro_aqui
```

### Mudar Porta do Backend

Edite `backend/.env`:

```
PORT=5001
```

---

## ❌ Troubleshooting

### Porta 5000 já está em uso

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Porta 3000 já está em uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Erro de dependências

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

---

## 💾 Dados de Seed

Para criar dados de teste primeira vez, acesse:

1. Dashboard > Regionais > Adicionar Nova Regional
2. Crie duas regionais: "São Paulo" e "Rio de Janeiro"
3. Configure regras de comissão para cada regional

---

## 📊 Estrutura do Banco

Tabelas criadas automaticamente:

- `usuarios` - Armazena usuários
- `regionais` - Armazena regionais
- `regras_comissao` - Armazena regras de comissão
- `vendas` - Armazena registros de vendas

Localização: `backend/database.db`

---

## 🔐 Segurança

⚠️ **Importante para Produção:**

1. Gere um JWT_SECRET forte
2. Mude as credenciais padrão
3. Configure CORS para domínios específicos
4. Use HTTPS
5. Implemente rate limiting
6. Use uma verdadeira banco de dados (PostgreSQL/MySQL)

---

## ✨ Próximos Passos

1. ✅ Sistema rodando? Continue
2. 📝 Customize conforme necessidade
3. 🧪 Teste todas as funcionalidades
4. 🚀 Deploy em servidor
5. 📚 Leia a documentação completa em `README.md`

---

**Versão:** 1.0 | **Data:** 17/02/2026

Dúvidas? Consulte `README.md` ou `../Detalhado Radar/`
