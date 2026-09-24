# Lista de Enxoval — Ponto das Crianças

Plataforma web para criação, gerenciamento, compartilhamento e compra de listas de enxoval — o conceito de lista de casamento adaptado para o universo infantil. Pais escolhem os produtos, a Ponto das Crianças administra a lista, e familiares/amigos presenteiam online ou em qualquer unidade física.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | Especificação funcional, regras de negócio, personas, MVP |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Stack, camadas, RBAC, arquitetura de privacidade |
| [`DATABASE.md`](./DATABASE.md) | Modelo de dados completo |
| [`API.md`](./API.md) | Mapa de rotas e contratos (DTOs públicos vs. internos) |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Ambientes, variáveis, migrations, setup local |
| [`CHANGELOG.md`](./CHANGELOG.md) | Histórico de mudanças |

## Regra fundamental

Produtos comprados **nunca desaparecem** da página pública. O comprador **nunca** vê quantidades (desejada, comprada, restante) — apenas se ainda pode presentear (`can_purchase`). Essa regra é garantida em toda a pilha (banco → DTO → API → HTML), não só escondida no frontend. Veja `ARCHITECTURE.md § Arquitetura de privacidade`.

## Quickstart

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Veja `DEPLOYMENT.md` para detalhes de configuração de banco local/Docker e variáveis de ambiente.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · PostgreSQL · Prisma · Auth.js · Zod · Vitest.
