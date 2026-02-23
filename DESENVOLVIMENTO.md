# 🛠️ DESENVOLVIMENTO - Dicas e Extensões

## 🔧 Ambiente de Desenvolvimento

### VS Code Extensions Recomendadas

```json
Essenciais:
- REST Client (humao.rest-client)
- SQLite (alexcvzz.vscode-sqlite)
- Prettier (esbenp.prettier-vscode)
- ESLint (dbaeumer.vscode-eslint)

Frontend:
- ES7+ React/Redux/React-Native snippets
- JavaScript (ES6) code snippets
- Tailwind CSS IntelliSense

Backend:
- Thunder Client (para testar API)
- Database Client (para SQLite)
```

---

## 📝 Configurar ESLint e Prettier

### Backend

```bash
cd backend
npm install --save-dev eslint prettier eslint-config-prettier
```

Crie `.eslintrc.json`:
```json
{
  "extends": "prettier",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es2021": true
  }
}
```

---

## 🚀 Melhorias Recomendadas

### 1. Adicionar Helmet (Segurança)

```bash
# Backend
npm install helmet
```

```javascript
// app.js
const helmet = require('helmet');
app.use(helmet());
```

### 2. Adicionar Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
// app.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/auth', limiter);
```

### 3. Adicionar Morgan (Logs)

```bash
npm install morgan
```

```javascript
// app.js
const morgan = require('morgan');
app.use(morgan('combined'));
```

---

## 🧪 Testes

### Instalar Jest

```bash
cd backend
npm install --save-dev jest
```

Arquivo `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/']
};
```

Exemplo teste `src/models/__tests__/Usuario.test.js`:
```javascript
const Usuario = require('../Usuario');

describe('Usuario Model', () => {
  test('deve criar hash de senha', async () => {
    const hash = await Usuario.verificarSenha('senha123', hash);
    expect(hash).toBe(true);
  });
});
```

Execute: `npm test`

---

## 🐳 Docker (Opcional)

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

EXPOSE 5000

CMD ["npm", "start"]
```

### Compose

```docker
version: '3'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=sua_chave
      - PORT=5000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 📊 Monitoramento

### Adicionar Winston (Logs)

```bash
npm install winston
```

```javascript
// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

module.exports = logger;
```

---

## 💾 Backup Banco de Dados

### Script Backup

```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
cp backend/database.db backup/database_$DATE.db
echo "Backup realizado: backup/database_$DATE.db"
```

Execute com cron:
```bash
0 2 * * * /caminho/para/backup.sh
```

---

## 🔄 CI/CD (GitHub Actions)

### `.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: 18
    
    - name: Install Backend
      run: cd backend && npm install
    
    - name: Install Frontend
      run: cd frontend && npm install
    
    - name: Test
      run: cd backend && npm test
    
    - name: Lint
      run: cd frontend && npm run build
```

---

## 📈 Performance

### Adicionar Compressão

```bash
npm install compression
```

```javascript
// app.js
const compression = require('compression');
app.use(compression());
```

### Cache de Banco de Dados

```javascript
// Exemplo com Redis (opcional)
npm install redis
```

---

## 🔐 Variáveis Sensíveis

### .env.example

```
JWT_SECRET=mude_isso_em_producao
PORT=5000
NODE_ENV=development
DB_PATH=database.db
```

**Nunca commite .env!** Está no `.gitignore`

---

## 📱 Progressive Web App (PWA)

### Adicionar Service Worker

Crie `frontend/public/service-worker.js`:
```javascript
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
});
```

Registre em `frontend/src/index.js`:
```javascript
navigator.serviceWorker.register('/service-worker.js');
```

---

## 🎯 Escalabilidade

### Distribuir Backend em Múltiplas Instâncias

```bash
npm install pm2 -g
```

Crie `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'radar-backend',
    script: './src/server.js',
    instances: 4,
    exec_mode: 'cluster'
  }]
};
```

Execute: `pm2 start ecosystem.config.js`

---

## 📱 Mobile App (React Native)

### Estrutura Básica

```bash
npx react-native init RadarMobile
```

Reutilizar `frontend/src/services/api.js` em React Native

---

## 🧩 Estrutura de Pastas Expandida

Conforme crescimento:

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── logger.js
│   │   ├── email.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/        ← Lógica business
│   ├── validators/      ← Validações
│   ├── utils/           ← Funções auxiliares
│   ├── constants/       ← Constantes
│   └── app.js
├── tests/
├── migrations/
└── seeds/
```

---

## 🚀 Deploy Recomendado

### Backend - Heroku/Railway/Render

```bash
# Heroku
heroku login
heroku create seu-app-radar
heroku config:set JWT_SECRET=sua_chave
git push heroku main
```

### Frontend - Vercel/Netlify

```bash
# Vercel
npm install -g vercel
vercel

# Configurar variable
vercel env add REACT_APP_API_URL https://seu-app-radar.herokuapp.com
```

---

## 🔍 Debug

### Node Debugger

```bash
# Terminal 1
node --inspect src/server.js

# Terminal 2
chrome://inspect
# Clique em "inspect"
```

### React DevTools

```bash
# Extension Chrome/Firefox
# https://react.devtools.chrome.com/
```

---

## 📚 Recursos Úteis

### Documentação
- [Express](https://expressjs.com)
- [React](https://react.dev)
- [SQLite](https://www.sqlite.org)
- [JWT](https://jwt.io)

### Ferramentas
- [Insomnia](https://insomnia.rest) - Testar API
- [DBeaver](https://dbeaver.io) - Gerenciar BD
- [Figma](https://figma.com) - Design

---

## 💬 Boas Práticas

### Código
- ✅ Use nomes descritivos
- ✅ Comente partes complexas
- ✅ Siga DRY (Don't Repeat Yourself)
- ✅ Mantenha funções pequenas
- ✅ Use async/await

### Versionamento
- ✅ Commit pequenos e frequentes
- ✅ Mensagens claras
- ✅ Branch para features
- ✅ Code review antes de merge

### Documentação
- ✅ README completo
- ✅ Comentários no código
- ✅ Exemplos de uso
- ✅ Guias de setup

---

## ⚡ Otimizações Rápidas

### Frontend
```javascript
// Lazy loading de rotas
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Memoization de componentes
const MeuComponente = React.memo(({ prop }) => {
  return <div>{prop}</div>;
});
```

### Backend
```javascript
// Índices no banco
CREATE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_radar_usuarioId ON radar(usuarioId);
```

---

**Desenvolvido com profissionalismo e qualidade! 🎯**
