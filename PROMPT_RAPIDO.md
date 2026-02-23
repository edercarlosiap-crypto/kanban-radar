# 🚀 PROMPT RÁPIDO - Projeto Compatível com Radar PRO

## Use este prompt para criar um projeto compatível:

```
Crie um projeto full-stack EXATAMENTE compatível com estas especificações:

**BACKEND (Node.js/Express):**
- Express 4.18.2, bcryptjs 2.4.3, cors 2.8.5, dotenv 16.0.3
- express-fileupload 1.4.0, jsonwebtoken 9.0.0, sqlite3 5.1.7
- uuid 8.3.2, xlsx 0.18.5, nodemon 2.0.20

Estrutura:
backend/
├── src/
│   ├── app.js (config Express)
│   ├── server.js (porta 5000)
│   ├── config/database.js (SQLite com db_run, db_get, db_all)
│   ├── controllers/ (listar, buscar, criar, atualizar, deletar)
│   ├── middleware/auth.js (JWT + perfis: leitura, editor, gestor, admin)
│   ├── models/ (classes com métodos async/await)
│   ├── routes/ (padrão /api/recurso)
│   └── utils/
├── uploads/
├── .env (PORT=5000, JWT_SECRET)
└── package.json

**FRONTEND (React):**
- React 18.2.0, react-dom 18.2.0, react-router-dom 6.8.0
- axios 1.3.2, @hello-pangea/dnd 16.3.0, recharts 2.12.5
- html-to-image 1.11.11, jspdf 2.5.1, xlsx 0.18.5
- react-scripts 5.0.1

Estrutura:
frontend/
├── src/
│   ├── App.js (React Router)
│   ├── App.css (iOS Modern Design System - veja abaixo)
│   ├── components/PrivateRoute.js
│   ├── services/api.js (axios com JWT interceptor)
│   ├── pages/ (estrutura: sidebar + content)
│   └── utils/
└── package.json

**DESIGN SYSTEM (iOS Modern Style):**
Cores: --primary: #007AFF, --success: #34C759, --warning: #FF9500, --danger: #FF3B30
Tipografia: -apple-system, SF Pro Display, peso 600 para títulos
Bordas: --radius-sm: 10px, --radius-md: 14px, --radius-lg: 18px, --radius-xl: 22px
Sombras: sutis, estilo iOS (var(--shadow-sm) a var(--shadow-xl))
Layout: sidebar 280px fixa + main-content responsivo
Glass morphism: rgba(255,255,255,0.98) + backdrop-filter blur(30px)

**AUTENTICAÇÃO:**
- JWT no backend (expiração 7 dias)
- Header: Authorization: Bearer {token}
- LocalStorage no frontend: token, usuario
- Perfis: leitura < editor < gestor < admin
- Middleware: autenticar, apenasGestorOuSuperior, apenasAdmin

**BANCO SQLite:**
```javascript
const db_run = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});
```

**PADRÃO DE CONTROLLERS:**
```javascript
exports.listar = async (req, res) => {
  try {
    const itens = await Model.listar(req.usuarioId);
    res.json({ itens });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar' });
  }
};
```

**PADRÃO DE PÁGINAS:**
- useState/useEffect para dados
- Sidebar com LogoImage, nav, perfil usuário, botão sair
- Main content com título + glass-card
- Loading state com spinner
- Permissões: canEditar, canDeletar, isAdmin

**ROTAS:**
Backend: /api/auth, /api/recurso
Frontend: /login (público), /dashboard, /recurso (privadas)

**COMPONENTES BASE:**
.glass-card, .btn (primary, secondary, danger), .form-control, .form-select
.sidebar (280px fixa), .main-content (padding 40px 48px)

**EXCEL IMPORT/EXPORT:**
Backend: XLSX.read(), sheet_to_json()
Frontend: XLSX.utils.json_to_sheet(), writeFile()
Padrão: prepararImportacao (análise) + importarExcel (mapeamento)

**CORS:**
origin: ['http://localhost:3000', 'http://localhost:3001']

Agora implemente [DESCRIÇÃO DO PROJETO AQUI] seguindo 100% essas specs.
```

---

## Exemplo de uso:

Copie o prompt acima e substitua `[DESCRIÇÃO DO PROJETO AQUI]` pela sua necessidade:

**Exemplo 1:**
```
"um sistema de gestão de leads comerciais com campos: 
nome, email, telefone, produto_interesse, status_lead, 
data_contato, observacoes"
```

**Exemplo 2:**
```
"um dashboard de acompanhamento de vendas com métricas 
de vendedores, produtos, períodos e metas"
```

**Exemplo 3:**
```
"um sistema de controle de estoque com produtos, 
categorias, entradas, saídas e alertas de estoque mínimo"
```

---

## Arquivos de referência completa:

Para especificações detalhadas, consulte:
- `PROMPT_ARQUITETURA.md` - Documento completo (40+ páginas)
- `backend/package.json` - Versões exatas backend
- `frontend/package.json` - Versões exatas frontend
- `frontend/src/App.css` - Design System completo
- `backend/src/app.js` - Configuração Express
- `backend/src/middleware/auth.js` - Sistema de autenticação
- `frontend/src/services/api.js` - Configuração API

---

**Versão:** 1.0 | **Data:** 17/02/2026 | **Projeto:** Radar Estratégico PRO
