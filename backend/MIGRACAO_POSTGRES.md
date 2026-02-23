# Migracao SQLite -> PostgreSQL (Radar)

## 1) Pre-requisitos
- Projeto backend com dependencias instaladas (`npm install`)
- URL de conexao PostgreSQL (ex.: Supabase/Neon) em `DATABASE_URL`

## 2) Backup (obrigatorio)
No backend:

```powershell
Copy-Item database.sqlite ("database_backup_{0}.sqlite" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
```

## 3) Configurar `.env`

```env
DB_CLIENT=sqlite
DB_PATH=database.sqlite
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
PGSSL=require
```

## 4) Executar migracao
Modo append (padrao, nao apaga destino):

```bash
npm run migrate:sqlite-to-postgres
```

Modo replace (limpa tabelas de destino antes):

```bash
MIGRATION_MODE=replace npm run migrate:sqlite-to-postgres
```

## 5) Ativar PostgreSQL na aplicacao
No `.env`:

```env
DB_CLIENT=postgres
```

Reinicie o backend.

## 6) Rollback rapido
Se precisar voltar:
- `DB_CLIENT=sqlite`
- reiniciar backend

## Tabelas migradas
- `usuarios`
- `configuracoes`
- `radar`
- `logs`
- `attendants`
- `retention_attempts`
