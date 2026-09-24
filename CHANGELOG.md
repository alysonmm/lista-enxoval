# Changelog

Todas as mudanças relevantes do projeto são documentadas neste arquivo, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Added
- Documentação inicial do projeto: `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `DEPLOYMENT.md`.
- Scaffold do projeto Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui + Prisma.
- Schema Prisma completo (identidade/RBAC, lojas, pessoas, catálogo/estoque, listas, vendas, logística, benefícios/créditos, auditoria, configurações).
- Autenticação (Auth.js) para funcionários e pais; RBAC no backend.
- Cadastro de unidades, produtos (com variações/estoque) e categorias.
- Cadastro de clientes/pais e bebês, com múltiplos responsáveis por lista.
- Criação/edição/publicação de listas de enxoval e itens da lista com quantidade desejada e prioridade.
- Página pública mobile-first da lista, com DTO que nunca expõe quantidades (`can_purchase` apenas) e filtro Todos/Disponíveis/Garantidos.
- Geração de QR Code e link de compartilhamento por lista.
- Fluxo completo de compra presencial (busca de lista, registro de venda real em `orders`/`order_items`/`payments`, cancelamento com estorno e auditoria).
- Portal dos pais com progresso, presentes recebidos e itens faltantes.
- Dashboard administrativo básico e relatórios básicos.
- Seed de demonstração (unidades, funcionários, clientes, listas, produtos, vendas).
- Teste automatizado obrigatório garantindo que a API pública nunca retorna campos de quantidade.
