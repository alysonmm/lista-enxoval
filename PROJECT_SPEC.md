# PROJECT_SPEC.md — Lista de Enxoval · Ponto das Crianças

> Este documento resume e organiza a especificação funcional recebida para o sistema de Lista de Enxoval da Ponto das Crianças. É a fonte de verdade sobre **o que** o sistema deve fazer. Decisões técnicas de **como** implementar estão em `ARCHITECTURE.md`, o modelo de dados detalhado está em `DATABASE.md`, e o mapa de rotas/contratos de API está em `API.md`.

## 1. Visão geral

Plataforma web para criação, gerenciamento, compartilhamento, acompanhamento e compra de **listas de enxoval** — o mesmo conceito de uma lista de casamento, adaptado para o universo infantil.

Fluxo de negócio:

```
PAIS → LISTA DE ENXOVAL → FAMILIARES E AMIGOS → PONTO DAS CRIANÇAS
```

- Os **pais** escolhem os produtos que desejam para o bebê.
- A **Ponto das Crianças** cria e administra a lista.
- **Familiares e amigos** recebem um link e compram presentes — online ou presencialmente em qualquer unidade.
- Cada lista pode gerar diversas compras independentes, por múltiplos canais, todas alimentando o mesmo estado interno.

## 2. Objetivo do sistema

Criar um novo canal de vendas para a Ponto das Crianças, permitindo que uma família compartilhe seus produtos desejados com dezenas de pessoas, através de:

- compra online;
- compra presencial em qualquer unidade (PDC1, PDC2, PDC3, ...);
- futuramente WhatsApp e integrações externas.

## 3. Regra fundamental da experiência (não negociável)

**Produtos comprados nunca desaparecem da página pública.** Mesmo depois de presenteados, continuam visíveis.

O comprador **nunca** pode ver:

- quantidade solicitada pelos pais (`desired_quantity`);
- quantidade já comprada (`purchased_quantity`);
- quantidade reservada (`reserved_quantity`);
- quantidade restante;
- percentual individual do produto;
- quem comprou anteriormente aquele produto.

O comprador só enxerga um booleano: **posso presentear este item ou não** (`can_purchase`). Essa regra vale em todas as camadas — API pública, HTML renderizado, SSR, cache, analytics — nunca só escondida no frontend. Ver `ARCHITECTURE.md § Arquitetura de privacidade` e o teste obrigatório descrito em `140/141` (seção de testes).

Estados visuais do produto na página pública:

| Estado interno | O que o comprador vê |
|---|---|
| `can_purchase = true` | Preço + botão `[ PRESENTEAR ]` |
| `can_purchase = false` (meta atingida OU sem estoque) | `✓ Presente já garantido`, botão oculto/desabilitado |

Nenhum dos dois estados informa quantidade, percentual ou histórico.

## 4. Visões diferentes sobre a mesma lista

| Visão | Enxerga |
|---|---|
| **Loja** (admin/gerente/vendedor autorizado) | Tudo: quantidades desejada/comprada/restante, valores, compradores, histórico, unidade, vendedor, forma de pagamento |
| **Pais** | Progresso do próprio enxoval: quantidade desejada/presenteada/restante, presentes recebidos (com autor, exceto anônimos), itens faltantes |
| **Compradores/convidados** | Apenas o necessário para escolher um presente: foto, nome, descrição, preço, disponibilidade (`can_purchase`) |

## 5. Perfis de usuário

1. **Administrador** — acesso completo (unidades, funcionários, produtos, categorias, estoque, listas, pedidos, relatórios, configurações, permissões, logs).
2. **Gerente** — cria/edita listas, cadastra clientes, registra vendas presenciais, consulta listas e relatórios da própria unidade, cancela mediante permissão, acompanha vendedores.
3. **Vendedor / Consultor de Enxoval** — cadastra pais e bebês, cria listas (`consultant_id`), adiciona produtos, registra vendas presenciais, gera link/QR Code, consulta suas listas.
4. **Pais/responsáveis** — acesso privado ao próprio enxoval (múltiplos responsáveis por lista via `gift_list_parents`).
5. **Comprador/convidado** — acessa via link, sem conta obrigatória; escolhe, compra, deixa mensagem, pode presentear anonimamente.

Permissões reais de Gerente/Vendedor são configuráveis pela loja e **sempre verificadas no backend** (RBAC — ver `ARCHITECTURE.md`).

## 6. Ciclo de vida da lista

- **Status**: `DRAFT → ACTIVE → PAUSED/CLOSED/CANCELLED`.
- **Visibilidade**: `PUBLIC_LINK` (padrão — qualquer pessoa com o link acessa, mas nunca indexada em buscadores/`noindex`), `PIN_PROTECTED`, `PRIVATE`.
- Cada lista tem `public_id`, `slug` (usado em `/lista/{slug}`), título, unidade responsável, consultor responsável, data de criação/fechamento.

## 7. Catálogo

Produtos possuem SKU, código de barras, nome, descrição, categoria/subcategoria, marca, preço, preço promocional, imagens, status, e podem ter **variações** (tamanho, cor, ...), cada uma com SKU e estoque próprios. Categorias são administráveis (Roupas, Saída de maternidade, Banho, Quarto, Passeio, Alimentação, Higiene, Bolsas, Ninhos, Mantas, Acessórios, Móveis, Decoração, Outros).

Cada item de uma lista tem produto, variação, `desired_quantity`, `priority` (`NORMAL`/`DESIRED`/`ESSENTIAL` — pode aparecer publicamente como "Escolha dos pais" / "Item essencial", nunca com quantidade), observação.

## 8. Controle interno de quantidade e estoque

Internamente: `desired_quantity`, `purchased_quantity`, `reserved_quantity` → `available = desired - purchased - reserved`.

Estoque é separado em físico/reservado/disponível, **por unidade** (`inventory`). Para permitir uma compra, é preciso que **ambos** sejam verdadeiros:

- ainda há quantidade permitida pela lista; **e**
- há estoque disponível.

Se qualquer um chegar a zero, `can_purchase = false`. Essa checagem é sempre feita no backend, dentro de transação, nunca confiando no frontend (ver `57/58/132`).

## 9. Canais de venda

Campo `channel` em `orders`: `ONLINE | IN_STORE | ADMIN_MANUAL | FUTURE_INTEGRATION`. Toda venda — de qualquer canal — cria registros reais em `orders` / `order_items` / `payments`. **Nunca** um "marcar como comprado" superficial.

### Compra presencial
Funcionário localiza a lista (nome do bebê/mãe/pai, telefone, CPF, código, QR Code), vê quantidades reais, registra produto/variação/quantidade/preço/desconto/forma de pagamento/comprador (opcionalmente anônimo)/número de venda no PDV/cupom. Isso atualiza pedido, pagamento, quantidade comprada, dashboard, portal dos pais e disponibilidade pública — nessa ordem de efeito, dentro de uma transação.

### Compra online (Fase 2)
Link → lista → escolhe presente → carrinho (não mistura listas diferentes) → identificação → pagamento (Pix/cartão via `PaymentProvider` abstrato) → confirmação → lista atualizada. Reserva temporária (15 min configurável) durante o checkout evita concorrência (ver `54-58`).

### Cancelamento
Nunca apaga venda — usa status. Ao cancelar: estorna pagamento, decrementa quantidade comprada, libera disponibilidade, registra motivo e funcionário responsável (auditoria).

## 10. Atribuição de vendas (para comissão futura)

- `gift_lists.consultant_id` — quem criou/atende a lista.
- `orders.sale_seller_id` — quem efetivamente vendeu (pode ser outra unidade/pessoa).

Comissões não são MVP, mas o schema já comporta (`benefit_rules`, campos de atribuição).

## 11. Privacidade e LGPD

Nunca expor publicamente: CPF, telefone, e-mail, endereço, dados financeiros, histórico, quantidades desejadas/presenteadas, nome do vendedor, unidade responsável. Registrar aceite de termos/política/consentimentos. Preparar (não implementar agora) exportação, anonimização e exclusão de dados.

## 12. Benefícios, créditos, vale-presente, presente coletivo

Mecanismos configuráveis (não hardcoded): faixas de valor vendido → recompensa (`benefit_tiers`), créditos dos pais com ciclo de vida de status, vale-presente com valores pré-definidos vinculado à lista, presente coletivo (contribuição de várias pessoas para um item de alto valor). Todos fazem parte do schema desde já; a lógica completa é Fase 3 (exceto vale-presente/estrutura de créditos, que devem existir como schema desde o MVP).

## 13. MVP — fases

**Fase 1** (foco desta primeira entrega): autenticação, funcionários, unidades, produtos, categorias, clientes, bebês, listas, itens da lista, página pública, QR Code, compras presenciais, portal dos pais, dashboard básico, relatórios básicos.

**Fase 2**: carrinho, checkout, Pix, cartão, gateway, reservas, webhook, logística.

**Fase 3**: benefícios, créditos, vale-presente, WhatsApp, ERP, comissões, analytics avançado, presente coletivo.

### Ordem de implementação (prioridade absoluta)
1. Produtos → 2. Clientes → 3. Bebês → 4. Listas → 5. Itens da lista → 6. Página pública → 7. Compra presencial → 8. Portal dos pais → 9. Carrinho → 10. Checkout → 11. Pagamento → 12. Benefícios → 13. Relatórios avançados.

### Critérios de aceite do MVP (seção 133)
O MVP só está aprovado quando for possível, de ponta a ponta: cadastrar funcionário, unidade, produto, pai/mãe, bebê; criar lista vinculando consultor; adicionar produtos com quantidade desejada; publicar lista; gerar link e QR Code; abrir lista pública; comprar presencialmente; atualizar quantidade internamente sem nunca esconder o produto nem expor quantidade publicamente; indicar produto completo; ver a compra no portal dos pais; cancelar compra e reabrir disponibilidade automaticamente; ver histórico.

## 14. Cenários de referência (usados como roteiro de teste manual/E2E)

- **Cenário principal** (128): Carla (consultora) cria "Enxoval da Helena" com 6 bodies, 4 macacões, 2 mantas, 1 saída, 1 bolsa, 1 kit berço. Gera link/QR. Ana acessa publicamente, vê os produtos sem quantidades, compra a manta — que continua visível.
- **Cenário presencial** (129): Pedro compra na PDC3 o Kit Berço (desejado 1). Funcionário busca "Helena", vê internamente 1 desejado / 0 comprado, registra a venda. Pais veem "Presenteado: 1 — Presente de Pedro". Página pública mostra "✓ Presente já garantido", sem números.
- **Cenário de cancelamento** (130): venda do Kit Berço é cancelada com motivo → quantidade comprada decrementada, lista atualizada, auditoria registrada, botão `[PRESENTEAR]` volta a aparecer publicamente.
- **Cenário de quantidade maior** (131): pais querem 6 bodies; três compradores compram 2+1+2=5; publicamente o produto continua apenas com `[PRESENTEAR]`, sem indicar "falta 1"; ao atingir 6, muda para "✓ Presente já garantido".

## 15. Não fazer agora (fora de escopo desta fase)

App iOS/Android nativos, marketplace multiempresa, IA/chat, microserviços, gamificação, programa complexo de pontos, arquitetura excessivamente sofisticada.

## 16. Extensibilidade prevista (não implementar, não impedir)

- `gift_lists.list_type` genérico (`BABY_REGISTRY`, `BABY_SHOWER`, `BIRTHDAY`, `FIRST_BIRTHDAY`, `BAPTISM`, `CHRISTMAS`, `OTHER`) — hoje só `BABY_REGISTRY` é usado.
- Bebê como futuro perfil de CRM (marcos de idade, campanhas).
- Campos `external_product_id`/`external_order_id`/`external_customer_id`/`external_inventory_id` e camada `ERPProvider` para integração futura sem acoplamento.
- `MessagingProvider` abstrato para WhatsApp oficial (nunca soluções não oficiais tipo WhatsApp Web).

## 17. Documentos relacionados

- `ARCHITECTURE.md` — stack, camadas, RBAC, arquitetura de privacidade, abstrações (`PaymentProvider`, `ERPProvider`, `MessagingProvider`).
- `DATABASE.md` — modelo de dados completo (entidades, campos, relacionamentos).
- `API.md` — mapa de rotas e contratos (DTOs públicos vs. internos).
- `DEPLOYMENT.md` — ambientes, variáveis de ambiente, migrations, seed.
- `CHANGELOG.md` — histórico de mudanças.
