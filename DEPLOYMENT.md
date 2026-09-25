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
| `AUTH_SECRET` | Segredo de assinatura do JWT de sessão (`src/lib/auth`, via `jose`) |
| `APP_URL` | URL pública base (usada em links/QR Code/webhooks) |
| `PAYMENT_PROVIDER` | `manual` (dev/MVP) \| `mercadopago` \| `pagarme` \| `asaas` \| `stripe` (Fase 2) |
| `PAYMENT_API_KEY` | Chave do gateway ativo |
| `BLOB_READ_WRITE_TOKEN` | Upload de imagem de produto (`src/lib/storage.ts`). Injetada automaticamente pela Vercel ao conectar um Blob store ao projeto — não é definida manualmente. Sem ela (dev local), grava em `public/uploads`. |
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
| `npm run build` | `prisma migrate deploy` seguido de `next build` — aplica migrations pendentes antes de gerar o build, em qualquer ambiente |
| `npm run start` | Servir build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit + integration) |
| `npm run db:seed` | Executa `prisma/seed.ts` — dados de demonstração fictícios, **nunca rodar em produção** |
| `npm run db:create-admin` | `npx tsx prisma/create-admin.ts <email> <senha> [nome]` — cria o primeiro Administrador real num banco de produção vazio |
| `npm run db:studio` | Prisma Studio |

`postinstall` roda `prisma generate` automaticamente após `npm install` (necessário para o build gerar o Prisma Client com a versão correta do schema).

## 7. Checklist de deploy

1. `npm run lint && npm run typecheck && npm test && npm run build` sem erros.
2. Variáveis de ambiente do ambiente alvo revisadas (nunca reaproveitar segredo de outro ambiente — especialmente `AUTH_SECRET`).
3. Confirmar que a rota pública (`/lista/[slug]`) responde com `noindex` e sem campos de quantidade (checagem manual + suíte de testes).
4. Smoke test: criar lista → publicar → abrir link público → registrar venda presencial → conferir portal dos pais.

`npx prisma migrate deploy` avulso não é mais necessário como passo manual — já roda dentro de `npm run build` (item 6).

## 8. Deploy na Vercel (produção atual)

Stack de produção: **Vercel** (hosting) + **Neon** (Postgres, via integração de Storage da própria Vercel) + **Vercel Blob** (imagens de produto). Todos com plano gratuito suficiente para este projeto.

1. **Banco de dados**: no dashboard da Vercel → aba **Storage** → **Create Database** → **Neon (Postgres)**. Conectar ao projeto — isso já injeta `DATABASE_URL` automaticamente nas variáveis de ambiente do projeto.
2. **Storage de imagens**: mesma aba **Storage** → **Create Database** → **Blob**. Conectar ao projeto — injeta `BLOB_READ_WRITE_TOKEN` automaticamente.
3. **Importar o repositório**: **Add New** → **Project** → selecionar `alysonmm/lista-enxoval` → branch a publicar. A Vercel detecta Next.js automaticamente; não é preciso mexer em build command/output.
4. **Variáveis de ambiente** (Project Settings → Environment Variables), além das injetadas nos passos 1-2:
   - `AUTH_SECRET`: gerar uma string aleatória forte só para produção (nunca reaproveitar a de dev) — ex.: `openssl rand -base64 32`.
   - `PAYMENT_PROVIDER=manual`, `STORAGE_PROVIDER=local` (placeholder, não usado pelo upload — ver seção 3), `EMAIL_PROVIDER=console`, `RESERVATION_TTL_MINUTES=15`.
   - `APP_URL`: opcional no primeiro deploy — sem ela, `src/lib/qrcode.ts` usa a URL que a própria Vercel injeta (`VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL`), então links e QR Code já saem certos. Defina explicitamente só ao configurar um domínio próprio.
5. **Deploy**: a Vercel builda e publica sozinha a cada push no branch conectado (`npm run build`, que já roda as migrations — passo 6 abaixo precisa da tabela criada primeiro, então o primeiro deploy é quem cria o schema).
6. **Primeiro administrador**: com o deploy no ar, rodar uma única vez a partir de uma máquina com Node, apontando para o banco de produção:
   ```bash
   DATABASE_URL="<a mesma DATABASE_URL da Vercel>" npx tsx prisma/create-admin.ts admin@suaempresa.com "senha-forte-aqui" "Seu Nome"
   ```
   Pegue a `DATABASE_URL` em Project Settings → Environment Variables. **Nunca rode `npm run db:seed` em produção** — ele cria dados fictícios (clientes, listas, senha `demo1234`).
7. **Domínio próprio (quando tiver um)**: Project Settings → Domains → adicionar o domínio e seguir as instruções de DNS mostradas ali; depois, definir `APP_URL` com esse domínio.

### Problemas comuns

- **Importar pela barra de busca/template do topo da tela inicial da Vercel** ("Let's build something new", com um campo de busca + botão Deploy) cria uma **cópia congelada** do repositório num nome novo (ex.: `pdc-lista`), desconectada do repositório original — nenhum commit futuro chega nela. Use sempre **Add New → Project → Import Git Repository → GitHub**, escolhendo o repositório da lista dos seus repositórios reais.
- **Se o projeto foi criado do jeito errado (acima) e você reconectou o Git depois** (Project Settings → Git → Disconnect/Connect): o botão **Redeploy** de um deployment antigo reexecuta o mesmo commit/fonte daquele deployment específico — ele **não** repuxa a conexão de Git atual. Depois de reconectar o repositório certo, é preciso gerar um **novo** deployment (um push novo na branch conectada, ou "Create Deployment" escolhendo a branch), não um Redeploy de um deployment que já existia antes da reconexão.
