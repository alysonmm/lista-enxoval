# DEPLOYMENT.md

## 1. Ambientes

`development`, `staging`, `production` — **nunca** compartilham banco de dados (seção 109). Cada um tem seu próprio `DATABASE_URL` e variáveis de provedor.

## 2. Requisitos

- Node.js 22+
- PostgreSQL 16+
- (Opcional, Fase 2+) Redis para reservas/rate limiting/filas

## 3. Variáveis de ambiente

Ver `.env.example` na raiz. Resumo:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (Prisma) |
| `AUTH_SECRET` | Segredo de assinatura de sessão (Auth.js) |
| `APP_URL` | URL pública base (usada em links/QR Code/webhooks) |
| `PAYMENT_PROVIDER` | `manual` (dev/MVP) \| `mercadopago` \| `pagarme` \| `asaas` \| `stripe` (Fase 2) |
| `PAYMENT_API_KEY` | Chave do gateway ativo |
| `STORAGE_PROVIDER` | `local` (dev) \| `s3` \| `r2` \| `supabase` |
| `STORAGE_URL` / `STORAGE_KEY` | Credenciais do storage compatível com S3 |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` | Envio de e-mail transacional |
| `RESERVATION_TTL_MINUTES` | Padrão `15` (também configurável via `system_settings`) |

## 4. Setup local

```bash
cp .env.example .env          # ajuste DATABASE_URL etc.
npm install
npx prisma migrate dev        # cria schema no Postgres local
npm run db:seed               # popula dados de demonstração (seção 111)
npm run dev                   # http://localhost:3000
```

Banco local via cluster do sistema (usado neste ambiente de desenvolvimento):

```bash
pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER lista_enxoval WITH PASSWORD 'lista_enxoval' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE lista_enxoval OWNER lista_enxoval;"
```

Alternativa via Docker:

```bash
docker run --name lista-enxoval-db -e POSTGRES_PASSWORD=lista_enxoval \
  -e POSTGRES_USER=lista_enxoval -e POSTGRES_DB=lista_enxoval \
  -p 5432:5432 -d postgres:16
```

## 5. Migrations

- Desenvolvimento: `npx prisma migrate dev --name <descricao>`.
- Produção/staging: `npx prisma migrate deploy` (nunca `migrate dev`, que pode gerar prompts destrutivos).
- Alterações de schema sempre acompanhadas de migration versionada — nunca `prisma db push` em produção.

## 6. Build & scripts

| Script | Ação |
|---|---|
| `npm run dev` | Next.js em modo desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit + integration) |
| `npm run db:seed` | Executa `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio |

## 7. Checklist de deploy

1. `npm run lint && npm run typecheck && npm test && npm run build` sem erros.
2. `npx prisma migrate deploy` no ambiente alvo.
3. Variáveis de ambiente do ambiente alvo revisadas (nunca reaproveitar segredo de outro ambiente).
4. Confirmar que a rota pública (`/lista/[slug]`) responde com `noindex` e sem campos de quantidade (checagem manual + suíte de testes).
5. Smoke test: criar lista → publicar → abrir link público → registrar venda presencial → conferir portal dos pais.

## 8. Storage de imagens

Interface `StorageProvider` (`src/lib/storage`) abstrai o provedor; em desenvolvimento sem credenciais configuradas, usa-se um provedor local (`public/uploads`) apenas para não bloquear o ambiente — produção deve sempre configurar S3/R2/Supabase Storage.
