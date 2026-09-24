# ARCHITECTURE.md — Lista de Enxoval

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | Next.js 15.5.x (App Router) + React 19.1 + TypeScript strict | SSR/SSG para SEO controlado e mobile-first na página pública. Fixado em 15.5.x (não 16.x): evita o rename `middleware→proxy`, Turbopack como padrão e o modelo "Cache Components", ainda muito recentes no momento desta implementação |
| Estilo | Tailwind CSS + kit próprio `src/components/ui` sobre Radix primitives | Mesma convenção do shadcn/ui (cva, Radix, `cn()`); componentes autorados localmente pois o registro `ui.shadcn.com` está fora da política de rede deste ambiente — Radix e Tailwind em si vêm do npm normalmente |
| Backend | Next.js Route Handlers + Server Actions | Evita microserviços (seção 105/135); um único deploy |
| Banco | PostgreSQL 16 | Transações fortes, essencial para concorrência de estoque/reserva |
| ORM | Prisma 6.x (`prisma-client-js`, engine clássica) | Migrations tipadas, schema único como fonte de verdade. Fixado em 6.19.x — Prisma 7 exige driver adapter (`@prisma/adapter-pg`) e muda entrypoints do client; 6.x é estável e reduz risco para um schema deste tamanho |
| Autenticação | Camada própria (`src/lib/auth`): `jose` (JWT em cookie httpOnly) + `bcryptjs` (hash de senha) | Dois modelos de usuário bem distintos (`User` funcionário e `Parent`) mapeiam mal para o modelo de "providers" do Auth.js; controle total sobre RBAC e sessão com poucas dependências. Ver `next-auth` descartado por exigir mapear duas tabelas de usuário heterogêneas em providers de credenciais separados sem ganho real sobre uma sessão JWT própria |
| Validação | Zod | Validação de input em toda fronteira (server actions, route handlers) |
| Storage | Interface compatível com S3 (stub local em dev) | Cloudflare R2/S3/Supabase Storage plugáveis (seção 107) |
| Cache/Filas | Preparado para Redis (não obrigatório no MVP) | Reservas, rate limiting, filas (seção 108) |
| Testes | Vitest + Testing Library; Playwright (futuro) para E2E | Testes rápidos unitários/integração sobre regras de negócio críticas |
| Pacote | npm workspaces único (sem microserviços) | Seção 105/135 |

Moeda: todos os valores monetários são **inteiros em centavos** (`Int`/`BigInt`), nunca `Float`. Datas são persistidas em UTC e exibidas em `America/Fortaleza`.

## 2. Estrutura de pastas

```
src/
  app/                          # App Router (rotas ver API.md)
    (public)/lista/[slug]/      # página pública mobile-first
    (portal)/pais/...           # portal privado dos pais
    (admin)/admin/...           # painel administrativo (desktop-first)
    api/...                     # route handlers (webhooks, integrações externas)
  modules/                      # lógica de domínio, isolada por bounded context
    catalog/                    # produtos, variações, categorias, estoque
    people/                     # customers/parents, babies
    gift-lists/                 # listas, itens, regra de privacidade/DTOs
    sales/                      # orders, order_items, payments, reservations
    identity/                   # auth, RBAC, sessão
    benefits/                   # benefit_rules, customer_credits (schema-first)
    reporting/                  # agregações para dashboard/relatórios
    integrations/               # PaymentProvider, ERPProvider, MessagingProvider
  components/                   # componentes de UI compartilhados (kit próprio sobre Radix)
  lib/                          # infra transversal: prisma client, money, dates, qrcode, permissions
  types/                        # tipos e DTOs compartilhados
prisma/
  schema.prisma
  seed.ts
tests/
  unit/
  integration/
```

Cada módulo em `modules/*` expõe **services** (funções puras de domínio + acesso a dados via Prisma) consumidos pelas rotas/Server Actions. UI nunca fala direto com Prisma — sempre via módulo, para que a regra de privacidade e o RBAC fiquem centralizados e testáveis.

## 3. Arquitetura de privacidade (regra crítica do sistema)

A quantidade vendida é informação **operacional interna**, nunca pública (seção 132). Isso é garantido por design, não por convenção de UI:

1. **DTOs distintos por audiência**, montados no módulo `gift-lists`:
   - `GiftListItemAdminDTO` — todos os campos (`desired_quantity`, `purchased_quantity`, `reserved_quantity`, valores, compradores...). Só acessível a `ADMIN/MANAGER/SELLER` autenticados com permissão sobre a lista.
   - `GiftListItemParentDTO` — quantidades agregadas do próprio enxoval (`desired`, `presenteado`, `restante`), sem identificar comprador quando anônimo.
   - `GiftListItemPublicDTO` — **apenas** `{ id, productName, description, image, variantLabel, price, priorityLabel?, canPurchase }`. Nenhum campo numérico de quantidade existe nesse tipo — a ausência é estrutural (o tipo TypeScript não declara o campo), não um filtro aplicado depois.
2. A rota/handler pública (`/api/public/lists/[slug]`, consumida por `/lista/[slug]`) só importa e retorna `GiftListItemPublicDTO`. Não há caminho de código em que o objeto Prisma bruto (que contém as quantidades) chegue à resposta pública ou às props de SSR/JSON embutido no HTML.
3. `can_purchase` é calculado **no servidor**, dentro do módulo `gift-lists`, cruzando `gift_list_items` (quota da lista) com `inventory` (estoque da unidade) — nunca calculado no cliente.
4. Teste automatizado obrigatório (`tests/integration/public-list-privacy.test.ts`, seção 141) chama a rota pública e falha caso qualquer chave sensível (`desired_quantity`, `purchased_quantity`, `reserved_quantity`, `remaining_quantity`, ou qualquer variação de nome) apareça em qualquer nível do JSON de resposta. Esse teste roda no CI/lint pipeline do projeto.
5. Analytics e cache também passam pelo DTO público — nunca logam/cacheiam o objeto interno em uma chave acessível pelo cliente.

## 4. RBAC (seção 94)

Papéis: `ADMIN`, `MANAGER`, `SELLER`, `PARENT`. Convidados/compradores não autenticam.

- Permissões são checadas **sempre no backend** (`lib/permissions.ts` + verificação por módulo), nunca apenas escondendo botões no frontend.
- `ADMIN` tem todas as permissões implicitamente.
- `MANAGER`/`SELLER` têm permissões configuráveis por registro (tabela `permissions` + relação com `roles`/usuário), com um conjunto padrão sensato (ex.: `SELLER` não cancela pedidos sem permissão explícita — seção 11/12).
- `PARENT` só acessa listas onde consta em `gift_list_parents`.
- Toda mutação relevante passa por `lib/audit.ts`, que grava em `audit_logs` (quem, o quê, quando, IP quando aplicável) — seção 75.

## 5. Controle de concorrência (estoque e reserva)

Fluxo de compra (online e presencial) dentro de **transação Prisma** (`prisma.$transaction`):

1. Trava otimista/leitura consistente de `gift_list_items` (quantidade restante) e `inventory` (disponível na unidade) — `SELECT ... FOR UPDATE` via Prisma raw quando necessário para evitar corrida.
2. Verifica `available_for_list = desired_quantity - purchased_quantity - reserved_quantity > 0` **e** `inventory.available_quantity > 0`.
3. Cria `reservation` (checkout online) ou já cria `order`+`order_item` diretamente (venda presencial, sem etapa de reserva separada) e incrementa `reserved_quantity`/`purchased_quantity` dentro da mesma transação.
4. Reservas expiram (`expires_at`, padrão 15 min, configurável em `system_settings`) via job/checagem lazy: ao tentar nova reserva, reservas vencidas do mesmo item são liberadas antes de calcular disponibilidade.
5. Cancelamento reverte em transação simétrica: pagamento → `CANCELLED/REFUNDED`, `purchased_quantity -= qty`, log de auditoria com motivo e autor.

Isso garante que dois compradores concorrentes nunca "vendam" a mesma última unidade (cenário Ana/Paula, seção 54).

## 6. Abstrações de integração externa

- **`PaymentProvider`** (`modules/integrations/payment/provider.ts`): interface `createPixCharge`, `createCardCharge`, `handleWebhook`, `refund`. Implementação inicial: `ManualPaymentProvider` (usado por vendas presenciais, sempre aprovado) + stub `MercadoPagoProvider` (Fase 2, não implementado nesta entrega, apenas a interface e um adaptador vazio para não travar o schema).
- **`ERPProvider`**: interface para sincronizar produto/pedido/cliente/estoque externos, usando os campos `external_*_id` já presentes no schema. Não implementado no MVP.
- **`MessagingProvider`**: interface `sendWhatsAppMessage`/`sendEmail`. Implementação inicial: `EmailProvider` simples (log/console em dev) + stub de WhatsApp oficial (não implementado).

Nenhuma dessas integrações é acoplada diretamente nos módulos de domínio — os módulos dependem apenas da interface, injetada via `lib/providers.ts`.

## 7. Multiambiente

`development`, `staging`, `production`, cada um com seu próprio banco (nunca compartilhado — seção 109). Configuração via variáveis de ambiente (`DEPLOYMENT.md`).

## 8. Qualidade

- TypeScript `strict: true`, sem `any` implícito.
- Validação de entrada com Zod em toda Server Action/Route Handler.
- ESLint + Prettier.
- Testes cobrindo: criação de lista, adição de produto, cálculo de quantidade/`can_purchase`, compra presencial, reserva/concorrência, cancelamento/estorno, permissões, e o teste de privacidade pública (obrigatório).
- Cada etapa de implementação roda lint → typecheck → testes → build antes de ser considerada concluída (seção 143).

## 9. Extensibilidade genérica de "lista de presentes"

Embora o produto atual seja enxoval, o modelo usa nomenclatura genérica (`gift_lists`, `list_type`) para permitir, no futuro, chá de bebê, aniversário, batizado, etc., sem migração estrutural — apenas um novo valor de enum e telas específicas por tipo.
