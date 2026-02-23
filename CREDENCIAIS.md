# 🔐 Credenciais e Acessos - Radar Estratégico PRO

## 👤 Usuário Administrador Padrão

O sistema é criado com um usuário administrador padrão:

```
📧 Email: admin@uni.com
🔑 Senha: admin123
```

**⚠️ IMPORTANTE:**
- Altere a senha após o primeiro acesso!
- Este usuário tem permissões totais no sistema

---

## 🔒 Sistema de Autenticação

### Login Obrigatório
- ✅ Todas as rotas são protegidas
- ✅ Usuários não autenticados são redirecionados para `/login`
- ✅ Tokens JWT armazenados em `localStorage`
- ✅ Tokens expiram após 24 horas

### Fluxo de Registro
1. Novo usuário acessa `/login`
2. Clica em "Registrar"
3. Preenche: Nome, Email, Senha, Confirmar Senha
4. Usuário criado com status **PENDENTE**
5. Admin deve aprovar em **Usuários** > **Aprovar**

---

## 👥 Perfis e Permissões

| Perfil | Nível | Permissões |
|--------|-------|------------|
| **Leitura** | 1 | Visualizar Dashboard, Radar, Kanban e Relatórios |
| **Editor** | 2 | + Criar e editar itens no Radar |
| **Gestor** | 3 | + Importar Excel, deletar itens |
| **Admin** | 4 | + Gerenciar usuários, aprovar cadastros, upload de logo |

---

## 🔑 Gerenciamento de Usuários (Admin)

### Aprovar Novo Usuário
1. Acesse **Usuários** no menu
2. Localize usuário com status "Pendente"
3. Clique em **Aprovar**
4. Usuário pode fazer login

### Desativar Usuário
1. Acesse **Usuários**
2. Clique em **Desativar** no usuário desejado
3. Usuário não poderá mais fazer login

### Alterar Perfil
1. Acesse **Usuários**
2. Localize o usuário
3. Clique em **Editar**
4. Selecione novo perfil (Leitura, Editor, Gestor ou Admin)
5. Clique em **Salvar**

---

## 🔐 Segurança

### Senhas
- ✅ Hash bcrypt (10 rounds)
- ✅ Validação de força no frontend
- ✅ Confirmação obrigatória no registro

### Tokens JWT
- ✅ Assinados com `JWT_SECRET` do `.env`
- ✅ Expiração configurável (padrão: 24h)
- ✅ Verificados em todas as rotas protegidas

### CORS
- ✅ Configurado para `http://localhost:3000` e `http://localhost:3001`
- ✅ Credenciais permitidas

---

## 📝 Primeiros Passos de Segurança

### 1. Alterar Senha do Admin
```
1. Faça login como admin@uni.com
2. Vá em Usuários > Editar Admin
3. Altere a senha
4. Salve
```

### 2. Configurar JWT_SECRET
```bash
# backend/.env
JWT_SECRET=sua_chave_super_secreta_aleatoria_123456789
```

### 3. Criar Novos Admins
```
1. Registre novo usuário
2. Aprove como admin@uni.com
3. Altere perfil para "Admin"
```

---

## 🚨 Troubleshooting

### "Token inválido ou expirado"
- Faça logout e login novamente
- Verifique se `JWT_SECRET` está correto no `.env`

### "Permissão insuficiente"
- Verifique seu perfil em **Dashboard**
- Admin deve elevar seu perfil se necessário

### "Aguardando aprovação do administrador"
- Seu usuário foi criado mas ainda não foi aprovado
- Contate um administrador para aprovação

---

## 📞 Suporte

Para problemas de acesso:
1. Verifique credenciais
2. Verifique status do usuário (pendente/aprovado/desativado)
3. Verifique logs do backend: `npm run dev`
4. Verifique console do navegador (F12)
