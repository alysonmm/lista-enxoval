# Changelog

Todas as mudanças relevantes do projeto são documentadas neste arquivo, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Added

**Documentação**
- `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `DEPLOYMENT.md` cobrindo a especificação completa, decisões técnicas e o modelo de dados.

**Base do projeto**
- Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + kit de UI próprio sobre Radix primitives (o registro `ui.shadcn.com` está fora da política de rede deste ambiente).
- Prisma 6 (engine clássica) com as 30 tabelas do modelo de dados completo (identidade/RBAC, lojas, pessoas, catálogo/estoque, listas, vendas, logística, benefícios/créditos, auditoria, configurações).
- Autenticação própria (`jose` + `bcryptjs`, sessão em cookie httpOnly) para funcionários e pais, com bloqueio de conta após tentativas inválidas.

**Catálogo e cadastros**
- CRUD de unidades, categorias (com subcategoria), produtos, variações (tamanho/cor) e estoque físico por unidade — restrito a ADMIN.
- CRUD de clientes/pais com criação de acesso ao portal (Customer + Parent) — disponível para ADMIN, MANAGER e SELLER.

**Listas de enxoval**
- Criação de lista (bebê + responsável + lista, incluindo cadastro do responsável na hora, em uma única transação), ciclo de vida DRAFT→ACTIVE→PAUSED→CLOSED/CANCELLED, múltiplos responsáveis por lista, itens com quantidade desejada e prioridade (nunca removidos fisicamente, apenas desativados).

**Página pública (`/lista/[slug]`)**
- Mobile-first, `noindex` sempre, filtro Todos/Disponíveis/Garantidos via link (sem JavaScript).
- DTO (`PublicGiftListItem`) que estruturalmente nunca declara quantidade desejada/comprada/reservada — `can_purchase` calculado no servidor cruzando quota da lista com estoque real.
- Produtos esgotados continuam visíveis ("✓ Presente já garantido"), nunca desaparecem.
- Listas PIN_PROTECTED pedem PIN antes de mostrar qualquer produto; PRIVATE/DRAFT/CANCELLED retornam 404.

**Compra presencial**
- Venda presencial gera `Order` + `OrderItem` + `Payment` reais (nunca um "marcar como comprado"), com controle de concorrência via `SELECT ... FOR UPDATE` para impedir venda além do desejado/estoque em vendas simultâneas.
- Cancelamento nunca apaga a venda: estorna pagamento, devolve quantidade e estoque, registra motivo e responsável.
- Busca de listas por bebê, mãe/pai, telefone, CPF, título ou código.

**Portal dos pais**
- Visão geral com progresso, minha lista (quantidades reais), presentes recebidos (com opção anônima), itens faltantes, compartilhar (link + WhatsApp + QR Code para download), benefícios (schema pronto) e configurações (dados pessoais, dados do bebê, troca de senha).

**Painel administrativo**
- Dashboard com listas ativas, vendas hoje/mês, online × presencial, ticket médio, compradores únicos e valor potencial das listas — com escopo por papel (ADMIN vê tudo, MANAGER só a unidade, SELLER só as próprias vendas).
- Relatórios com filtro por período/unidade/canal: vendas por unidade/consultor/vendedor e produtos mais presenteados.

**Dados de demonstração**
- `prisma/seed.ts` recria 3 unidades, 1 administrador, 2 gerentes, 5 vendedores, 10 clientes, 3 listas, 50 produtos, compras online e presenciais, um pedido cancelado, produtos completos e disponíveis — reproduzindo os cenários da própria especificação (seções 128–131).

### Validado manualmente
Fluxos ponta a ponta testados com Playwright contra um Postgres local: criação de lista, compra presencial, teste de concorrência com dois compradores disputando a última unidade (exatamente uma venda aprovada), cancelamento com estorno, portal dos pais, dashboard/relatórios com números conferidos, e ausência de qualquer campo de quantidade no HTML (incluindo o payload RSC serializado) da página pública em todos os estados da lista.
