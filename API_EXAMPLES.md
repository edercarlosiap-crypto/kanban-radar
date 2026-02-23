# 📡 Exemplos de Uso da API

**Base URL:** `http://localhost:5000/api`

Todos os exemplos usando `curl`. Substitua `localhost` se estiver em outro servidor.

---

## 🔑 Credenciais de Administrador

**Login padrão do sistema:**
```
📧 Email: admin@uni.com
🔑 Senha: admin123
```

⚠️ **IMPORTANTE:** Altere a senha após primeiro acesso!

---

## 🔐 Autenticação

### 1. Fazer Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@uni.com",
    "senha": "admin123"
  }'
```

**Resposta:**
```json
{
  "mensagem": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@uni.com",
    "perfil": "admin"
  }
}
```

**Salve o token para usar nas próximas requisições!**

---

### 2. Obter Dados do Usuário Logado

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 3. Registrar Novo Usuário (Somente Admin)

⚠️ **Apenas usuários com perfil "admin" podem registrar novos usuários!**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -d '{
    "nome": "João Silva",
    "email": "joao@example.com",
    "senha": "senha123456",
    "senhaConfirm": "senha123456",
    "perfil": "editor"
  }'
```

**Perfis válidos:** `leitura`, `editor`, `gestor`, `admin`

**Resposta Sucesso:**
```json
{
  "mensagem": "Usuário registrado com sucesso",
  "usuarioId": 2
}
```

---

## 📊 Radar - CRUD Completo

### ⚠️ IMPORTANTE

**Todas as rotas de radar requerem token JWT!**

Use: `-H "Authorization: Bearer SEU_TOKEN_AQUI"`

**Permissões:**
- **Leitura:** Visualizar itens
- **Editor:** Criar, editar, deletar seus próprios itens
- **Gestor:** Criar, editar, deletar qualquer item
- **Admin:** Acesso total + administração de usuários

---

### 1. Listar Todos os Itens

```bash
curl -X GET http://localhost:5000/api/radar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta:**
```json
{
  "itens": [
    {
      "id": 1,
      "dataCriacao": "2024-02-07",
      "camada": "🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO",
      "prioridade": "🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO",
      "tipo": "Projeto",
      "acao": "Implementar novo sistema",
      "equipe": "TI",
      "responsavel": "João Silva",
      "concluirAte": "2024-03-15",
      "kanban": "Em Execução",
      "observacao": "Já iniciado",
      "linkBitrix": "https://bitrix.com",
      "usuarioId": 1,
      "diasRestantes": 36,
      "indicador": "verde",
      "statusRadar": "Em andamento"
    }
  ],
  "total": 1
}
```

---

### 2. Criar Novo Item (Editor, Gestor ou Admin)

```bash
curl -X POST http://localhost:5000/api/radar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCriacao": "2024-02-07",
    "camada": "🅱️ 1B — ACESSO/OCULTO - NÃO IMPEDE",
    "prioridade": "🅱️ 1B — ACESSO/OCULTO - NÃO IMPEDE",
    "tipo": "Iniciativa",
    "acao": "Treinar equipe de desenvolvimento",
    "equipe": "RH",
    "responsavel": "Maria Santos",
    "concluirAte": "2024-02-28",
    "kanban": "Backlog",
    "observacao": "Aguardando aprovação",
    "linkBitrix": "https://bitrix24.com/task/123"
  }'
```

---

### 3. Buscar Item Específico

```bash
curl -X GET http://localhost:5000/api/radar/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 4. Atualizar Item (Editor/proprietário, Gestor ou Admin)

```bash
curl -X PUT http://localhost:5000/api/radar/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "kanban": "Em Execução"
  }'
```

**Para atualizar qualquer campo:**
```bash
curl -X PUT http://localhost:5000/api/radar/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "prioridade": "🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO",
    "observacao": "Urgente! Prazo reduzido",
    "kanban": "Em Execução"
  }'
```

---

### 5. Deletar Item (Editor/proprietário, Gestor ou Admin)

```bash
curl -X DELETE http://localhost:5000/api/radar/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 6. Obter Estatísticas do Dashboard

```bash
curl -X GET http://localhost:5000/api/radar/estatisticas/dashboard \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta:**
```json
{
  "total": 5,
  "concluidos": 2,
  "criticos": 1,
  "atrasados": 0
}
```

---

## 📥 Importação de Excel

### Upload de Arquivo (Editor, Gestor ou Admin)

```bash
curl -X POST http://localhost:5000/api/radar/importar-excel \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "arquivo=@/caminho/para/planilha.xlsx"
```

**Resposta:**
```json
{
  "mensagem": "Importação concluída",
  "itensImportados": 10,
  "erros": []
}
```

**Formato da planilha:**
- Deve ter colunas: Data Criação, Camada, Prioridade, Tipo, Ação, Equipe, Responsável, Concluir Até, Kanban, Observação, Link Bitrix
- Valores devem corresponder EXATAMENTE aos valores válidos (veja seção abaixo)

---

## 👥 Administração (Somente Admin)

### 1. Listar Todos os Usuários

```bash
curl -X GET http://localhost:5000/api/admin/usuarios \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

**Resposta:**
```json
{
  "usuarios": [
    {
      "id": 1,
      "nome": "Administrador",
      "email": "admin@uni.com",
      "perfil": "admin",
      "status": "aprovado",
      "criadoEm": "2024-02-07"
    },
    {
      "id": 2,
      "nome": "João Silva",
      "email": "joao@example.com",
      "perfil": "editor",
      "status": "aprovado",
      "criadoEm": "2024-02-08"
    }
  ]
}
```

---

### 2. Atualizar Perfil de Usuário

```bash
curl -X PUT http://localhost:5000/api/admin/usuarios/2 \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "perfil": "gestor"
  }'
```

**Perfis disponíveis:**
- `leitura` - Visualizar itens
- `editor` - Criar, editar, deletar próprios itens
- `gestor` - CRUD total em itens
- `admin` - Tudo + gerenciar usuários

---

### 3. Atualizar Status de Usuário

```bash
curl -X PUT http://localhost:5000/api/admin/usuarios/2 \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "bloqueado"
  }'
```

**Status disponíveis:** `aprovado`, `pendente`, `bloqueado`

---

### 4. Deletar Usuário

```bash
curl -X DELETE http://localhost:5000/api/admin/usuarios/2 \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

---

### 5. Upload de Logo (PNG ou JPEG)

```bash
curl -X POST http://localhost:5000/api/admin/logo \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -F "logo=@/caminho/para/logo.png"
```

**Resposta:**
```json
{
  "mensagem": "Logo atualizada com sucesso",
  "logoBase64": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

### 6. Obter Logo Atual

```bash
curl -X GET http://localhost:5000/api/admin/logo \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

---

### 7. Listar Logs do Sistema

```bash
curl -X GET http://localhost:5000/api/admin/logs \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

**Resposta:**
```json
{
  "logs": [
    {
      "id": 1,
      "tipo": "login",
      "usuarioId": 1,
      "dados": "{\"email\":\"admin@uni.com\"}",
      "criadoEm": "2024-02-07 10:30:00"
    },
    {
      "id": 2,
      "tipo": "criar_item",
      "usuarioId": 1,
      "dados": "{\"radarId\":1}",
      "criadoEm": "2024-02-07 10:35:00"
    }
  ]
}
```

---

## 📋 Valores Válidos para Campos

### Camada (CAMADA 1)
- `🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO`
- `🅱️ 1B — ACESSO/OCULTO - NÃO IMPEDE`
- `🅲 1C — MELHORIA OPERACIONAL EFICI`
- `🅳 1D — VAI PARAR ALGUM DIA (BAIXA)`
- `🅴️ 1E — FUTURO (BOM TER/ SUGESTÃO)`

### Prioridade (CAMADA 1)
- `🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO`
- `🅱️ 1B — ACESSO/OCULTO - NÃO IMPEDE`
- `🅲 1C — MELHORIA OPERACIONAL EFICI`
- `🅳 1D — VAI PARAR ALGUM DIA (BAIXA)`
- `🅴️ 1E — FUTURO (BOM TER/ SUGESTÃO)`

### Tipo
- `Projeto`
- `Iniciativa`
- `Tarefa`
- `Bug`
- `Melhoria`

### Kanban
- `Backlog`
- `Planejado`
- `Em Execução`
- `Concluído`

---

## 📈 Relatórios

### 1. Relatório de Concluídos

```bash
curl -X GET http://localhost:5000/api/relatorios/concluidos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 2. Relatório de Atrasados

```bash
curl -X GET http://localhost:5000/api/relatorios/atrasados \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 3. Relatório de Críticos

```bash
curl -X GET http://localhost:5000/api/relatorios/criticos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 4. Relatório por Equipe

```bash
curl -X GET http://localhost:5000/api/relatorios/equipe \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 5. Relatório por Responsável

```bash
curl -X GET http://localhost:5000/api/relatorios/responsavel \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🧪 Teste Rápido (Bash Script)

Crie um arquivo `teste_api.sh`:

```bash
#!/bin/bash

# 1. Login com admin
echo "🔐 Fazendo login como admin..."
LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@uni.com",
    "senha": "admin123"
  }')
echo $LOGIN

# Extrair token (ajuste conforme parser disponível)
TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

# 2. Registrar novo usuário
echo -e "\n📝 Registrando usuário..."
REGISTRO=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste User",
    "email": "teste@example.com",
    "senha": "teste123456",
    "senhaConfirm": "teste123456",
    "perfil": "editor"
  }')
echo $REGISTRO

# 3. Criar item
echo -e "\n➕ Criando item..."
curl -s -X POST http://localhost:5000/api/radar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataCriacao": "2024-02-07",
    "camada": "🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO",
    "prioridade": "🅰️ 1A — TRAVA OU DESTRAVA A OPERAÇÃO",
    "tipo": "Projeto",
    "acao": "Teste da API",
    "equipe": "TI",
    "responsavel": "Teste",
    "concluirAte": "2024-03-15",
    "kanban": "Backlog"
  }' | jq .

# 4. Listar
echo -e "\n📊 Listando itens..."
curl -s -X GET http://localhost:5000/api/radar \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. Listar usuários
echo -e "\n👥 Listando usuários..."
curl -s -X GET http://localhost:5000/api/admin/usuarios \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ Testes concluídos!"
```

Execute com:
```bash
chmod +x teste_api.sh
./teste_api.sh
```

---

## 🔍 Postman Collection

Importe em Postman para facilitar os testes:

### Setup

1. Crie uma variável: `base_url` = `http://localhost:5000/api`
2. Crie uma variável: `token` (será preenchida automaticamente)

### Endpoints

**POST** `/auth/login`
- Body: email (admin@uni.com), senha (admin123)
- Tests:
```javascript
pm.environment.set("token", pm.response.json().token);
```

**POST** `/auth/register` (Admin only)
- Header: `Authorization: Bearer {{token}}`
- Body: nome, email, senha, senhaConfirm, perfil

**GET** `/auth/me`
- Header: `Authorization: Bearer {{token}}`

**GET** `/radar`
- Header: `Authorization: Bearer {{token}}`

**POST** `/radar`
- Header: `Authorization: Bearer {{token}}`
- Body: todos os campos do radar (use valores válidos da seção acima)

**GET** `/admin/usuarios` (Admin only)
- Header: `Authorization: Bearer {{token}}`

**POST** `/admin/logo` (Admin only)
- Header: `Authorization: Bearer {{token}}`
- Body: form-data com campo `logo` (arquivo PNG/JPEG)

**GET** `/relatorios/concluidos`
- Header: `Authorization: Bearer {{token}}`

---

## 📋 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Sucesso |
| 201 | Created - Criado com sucesso |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido/expirado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Item não encontrado |
| 500 | Server Error - Erro no servidor |

---

## ⚠️ Erros Comuns

### "Token não fornecido"
```json
{
  "erro": "Token não fornecido"
}
```
**Solução:** Adicione header `Authorization: Bearer TOKEN`

---

### "Token inválido ou expirado"
```json
{
  "erro": "Token inválido ou expirado"
}
```
**Solução:** Faça login novamente para obter novo token

---

### "Permissão insuficiente"
```json
{
  "erro": "Permissão insuficiente"
}
```
**Solução:** Peça ao admin para elevar seu perfil

---

### "Email já registrado"
```json
{
  "erro": "Email já registrado"
}
```
**Solução:** Use outro email ou faça login

---

### "Senhas não conferem"
```json
{
  "erro": "Senhas não conferem"
}
```
**Solução:** senha e senhaConfirm devem ser iguais

---

### "Valor inválido para campo 'prioridade'"
```json
{
  "erro": "Valor inválido para campo 'prioridade'"
}
```
**Solução:** Use EXATAMENTE um dos valores da seção "Valores Válidos"

---

## 🎯 Fluxo Completo Recomendado

### Para Novos Usuários
1. **Login** com admin@uni.com / admin123
2. **(Admin)** Criar novos usuários via `/auth/register`
3. **Alterar senha** do admin (segurança!)

### Para Usar o Sistema
1. **Login** para obter token
2. **Criar** novos itens no radar (valores válidos!)
3. **Listar** itens no dashboard
4. **Atualizar** kanban conforme progresso
5. **Importar** planilha Excel se necessário
6. **Gerar** relatórios

### Para Administradores
1. **Gerenciar usuários** via `/admin/usuarios`
2. **Upload logo** via `/admin/logo`
3. **Monitorar logs** via `/admin/logs`
4. **Aprovar/Bloquear** usuários conforme necessário

---

## 💡 Dicas

- **Token expira em 24 horas** - Guarde bem ou faça login novamente
- **Use valores EXATOS** para camada/prioridade (inclusive emojis!)
- **Perfil "leitura"** não pode criar itens, apenas visualizar
- **Admin** pode tudo, mas use com responsabilidade
- **Excel import** segue mesma validação que criação manual
- **Configure Postman** para auto-preencher headers
- **Use `jq`** para formatar JSON nas respostas do curl
- **Teste localmente** antes de usar em produção

---

## 🔒 Perfis e Permissões

| Ação | Leitura | Editor | Gestor | Admin |
|------|---------|--------|--------|-------|
| Visualizar itens | ✅ | ✅ | ✅ | ✅ |
| Criar itens | ❌ | ✅ | ✅ | ✅ |
| Editar próprios itens | ❌ | ✅ | ✅ | ✅ |
| Editar qualquer item | ❌ | ❌ | ✅ | ✅ |
| Deletar próprios itens | ❌ | ✅ | ✅ | ✅ |
| Deletar qualquer item | ❌ | ❌ | ✅ | ✅ |
| Importar Excel | ❌ | ✅ | ✅ | ✅ |
| Ver relatórios | ✅ | ✅ | ✅ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ❌ | ✅ |
| Upload logo | ❌ | ❌ | ❌ | ✅ |
| Ver logs | ❌ | ❌ | ❌ | ✅ |

---

**Boa diversão testando a API! 🚀**

---

**Última atualização:** 12 de fevereiro de 2026  
**Versão:** 2.0.0 (Sistema com autenticação obrigatória)
