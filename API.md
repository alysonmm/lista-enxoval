# API.md — Rotas e contratos

Next.js App Router: páginas em `src/app`, mutações via **Server Actions** (`"use server"`) sempre que a origem é um formulário da própria aplicação, e **Route Handlers** (`src/app/api/**`) apenas para: (a) a API pública somente-leitura consumida por SSR/fetch client-side da página pública, (b) webhooks de gateway de pagamento, (c) exportações/relatórios em CSV. Toda Server Action e Route Handler valida input com Zod e re-checa permissão no servidor — nunca confia em o que o cliente diz que pode fazer.

## 1. Mapa de páginas

### Público (mobile-first, sem login)
| Rota | Descrição |
|---|---|
| `/lista/[slug]` | Página pública da lista — produtos, filtro (Todos/Disponíveis/Garantidos) via `?filtro=` |
| `/lista/[slug]/presentear/[itemId]` | Como presentear este item hoje (visita à loja); vira o início do checkout na Fase 2 |
| `/checkout` | Carrinho → identificação → pagamento (Fase 2) |
| `/pedido/[orderNumber]` | Confirmação/status do pedido do comprador (Fase 2) |

### Portal dos pais (login: e-mail/telefone + senha ou magic link)
| Rota | Descrição |
|---|---|
| `/pais/login` | Login / magic link |
| `/pais` | Visão geral (progresso, valores se habilitado) |
| `/pais/lista` | Minha lista (itens, quantidades reais) |
| `/pais/presentes` | Presentes recebidos (autor ou "Presente anônimo") |
| `/pais/faltantes` | Itens ainda faltando |
| `/pais/compartilhar` | Link, WhatsApp, QR Code |
| `/pais/beneficios` | Créditos/benefícios acumulados |
| `/pais/configuracoes` | Dados pessoais, endereço, data do chá, previsão de nascimento |

### Painel administrativo (login: e-mail + senha; RBAC)
| Rota | Descrição | Papéis |
|---|---|---|
| `/admin` | Dashboard geral | ADMIN, MANAGER, SELLER |
| `/admin/listas` | Todas as listas / minhas listas | todos (escopo varia) |
| `/admin/listas/[id]` | Detalhe da lista — itens, quantidades reais, histórico, venda presencial | todos (escopo varia) |
| `/admin/listas/[id]/venda` | Tela de registrar venda presencial | todos |
| `/admin/vendas` | Todas as vendas/pedidos | ADMIN, MANAGER |
| `/admin/vendas/[id]` | Detalhe do pedido, cancelar | ADMIN, MANAGER (SELLER conforme permissão) |
| `/admin/produtos` | Catálogo | ADMIN, MANAGER |
| `/admin/produtos/[id]` | Editar produto/variações/estoque | ADMIN, MANAGER |
| `/admin/categorias` | Categorias | ADMIN |
| `/admin/clientes` | Clientes/pais | ADMIN, MANAGER, SELLER |
| `/admin/clientes/[id]` | Detalhe do cliente/bebê/listas | ADMIN, MANAGER, SELLER |
| `/admin/vendedores` | Funcionários | ADMIN |
| `/admin/unidades` | Unidades | ADMIN |
| `/admin/relatorios` | Relatórios com filtros | ADMIN, MANAGER |
| `/admin/beneficios` | Faixas de benefício | ADMIN |
| `/admin/configuracoes` | Configurações do sistema | ADMIN |
| `/admin/logs` | Logs de auditoria | ADMIN |

## 2. Dados públicos (somente leitura, sem sessão)

### `getPublicGiftListView(slug, pin?)` — `src/modules/gift-lists/public.ts`
A página `/lista/[slug]` (Server Component) chama esta função diretamente durante o SSR — não existe uma rota JSON separada `/api/public/lists/[slug]`, porque nada no app precisa reconsultar isso via `fetch` no cliente (o filtro Todos/Disponíveis/Garantidos é resolvido com links `?filtro=`, sem JavaScript). Se uma futura integração externa (app mobile, parceiro) precisar do mesmo contrato via HTTP, um route handler fino pode ser adicionado chamando a mesma função — o formato abaixo já reflete exatamente o que ela retorna.

```jsonc
{
  "list": {
    "slug": "helena",
    "title": "Enxoval da Helena",
    "babyName": "Helena",
    "message": "Estamos preparando tudo para a chegada da Helena!",
    "photoUrl": "...",
    "theme": "...",
    "showProgress": false,          // só true se showPublicProgress = true
    "progressPercent": null          // presente somente quando showProgress = true
  },
  "items": [
    {
      "id": "clx...",
      "productName": "Kit Berço Nuvem",
      "description": "...",
      "image": "...",
      "variantLabel": "Único",
      "price": 34990,
      "priorityLabel": "Escolha dos pais",   // opcional, nunca número
      "canPurchase": true
    }
  ]
}
```

**Contrato de privacidade (obrigatório, seção 27/132):** o tipo `PublicGiftListItem` (em `src/modules/gift-lists/public.ts`) **não declara** `desiredQuantity`, `purchasedQuantity`, `reservedQuantity` ou qualquer campo de quantidade/percentual — a omissão é estrutural no tipo, não um filtro em runtime. Nenhum outro campo sensível (seção 42: quantidade total, vendida, restante, valor arrecadado, nomes de outros compradores, telefone/endereço/CPF/e-mail dos pais, vendedor, unidade) é incluído. `tests/integration/public-list-privacy.test.ts` renderiza a página com dados que têm quantidades internas propositalmente reveladoras e falha se qualquer uma delas aparecer no HTML gerado, em qualquer profundidade (incluindo o payload RSC serializado, não só o texto visível).

A página `/lista/[slug]` define `robots: { index: false, follow: false }` nos metadados do Next.js (seção 122), renderizado como `<meta name="robots">` — confirmado manualmente e coberto pelo teste de privacidade.

### `POST /api/public/lists/[slug]/items/[itemId]/reserve` (Fase 2)
Cria reserva temporária (15 min) para checkout. Resposta: `{ reservationId, expiresAt }` ou `409` com `{ error: "temporarily_unavailable" }` — nunca detalha motivo/quantidade (seção 54).

### `POST /api/webhooks/payments/[provider]` (Fase 2)
Recebe confirmação assíncrona do gateway (Pix/cartão). Valida assinatura do provedor, atualiza `Payment`/`Order` via `PaymentProvider.handleWebhook`.

## 3. Server Actions por módulo (autenticado)

Convenção: `modules/<domínio>/actions.ts`, nomeadas como verbo+entidade (`createGiftList`, `addGiftListItem`, `registerInStoreSale`, `cancelOrder`...). Todas retornam `{ ok: true, data }` ou `{ ok: false, error }` tipado — nunca lançam exceção não tratada para a UI.

- **catalog**: `createProduct`, `updateProduct`, `archiveProduct`, `createVariant`, `adjustInventory`, `createCategory`.
- **people**: `createParentWithCustomer`, `createBaby`, `updateCustomer`.
- **gift-lists**: `createGiftList`, `updateGiftList`, `publishGiftList`, `pauseGiftList`, `cancelGiftList`, `closeGiftList`, `addGiftListItem`, `updateGiftListItemQuantity`, `setItemPriority`, `addGiftListParent`.
- **sales**: `searchGiftListForSale` (por nome do bebê/mãe/pai/telefone/CPF/código/QR), `registerInStoreSale` (cria `Order+OrderItem+Payment` em transação), `cancelOrder` (estorna em transação), `createReservation`/`releaseReservation` (Fase 2).
- **identity**: `loginStaff`, `loginParent`, `requestMagicLink`, `logout`.
- **reporting**: `getDashboardSummary`, `getListReport`, `getSalesReport` (todos aceitam filtros de período/unidade/vendedor/consultor/lista/canal/pagamento/status — seção 118).

## 4. DTOs por audiência (ver `ARCHITECTURE.md § Arquitetura de privacidade`)

| DTO | Consumidor | Quantidades? |
|---|---|---|
| `GiftListItemAdminDTO` | `/admin/listas/[id]`, venda presencial | Sim — todas |
| `GiftListItemParentDTO` | `/pais/lista` | Sim — agregadas ao próprio enxoval |
| `GiftListItemPublicDTO` | `/lista/[slug]`, API pública | **Não** — apenas `canPurchase` |

## 5. Erros

Formato padrão de erro de Server Action/Route Handler:

```json
{ "ok": false, "error": { "code": "OUT_OF_STOCK", "message": "Produto temporariamente indisponível." } }
```

Códigos nunca vazam detalhe interno (quantidade, motivo de concorrência) na mensagem voltada ao comprador público; detalhes completos só em `AuditLog`/logs de servidor.
