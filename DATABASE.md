# DATABASE.md — Modelo de dados

Fonte executável: `prisma/schema.prisma`. Este documento é a referência legível do mesmo modelo, organizada por domínio. Convenções gerais:

- Chaves primárias: `cuid()`.
- Valores monetários: `Int` em **centavos** (nunca float). Moeda única: BRL.
- Datas: `DateTime` em UTC; exibidas na aplicação em `America/Fortaleza`.
- Soft delete (`deletedAt DateTime?`) em: `Customer`, `Product`, `GiftList`, `Baby`. Pedidos e pagamentos **nunca** são apagados — só mudam de `status`.
- Toda tabela relevante tem `createdAt`/`updatedAt`.

## 1. Identidade / RBAC

### `User` (funcionários — admin, gerente, vendedor)
| Campo | Tipo | Notas |
|---|---|---|
| id, name, email (unique), passwordHash | | login por e-mail+senha |
| role | enum `StaffRole` (`ADMIN`,`MANAGER`,`SELLER`) | |
| storeId | FK `Store?` | null para admin multi-unidade |
| phone, active | | |
| deletedAt | | soft delete de funcionário desligado |

### `Permission`
Catálogo de chaves finas (`orders.cancel`, `lists.cancel`, `reports.view_all_stores`, ...) com `description`.

### `UserPermission`
Override por usuário sobre o padrão do `role` (`userId`, `permissionId`, `granted: boolean`). Permite "permissões configuráveis" (seções 11/12) sem um motor de papéis dinâmico completo — YAGNI para o MVP.

### `Parent` (conta do portal dos pais)
1:1 com `Customer`. Guarda `passwordHash?`, `magicLinkToken?`/`magicLinkExpiresAt?` (login sem senha), `termsAcceptedAt?`.

> Sessão usa JWT próprio (`jose`) em cookie httpOnly — não há tabelas `Session`/`Account` de adapter, pois não há login social/OAuth no MVP e a autenticação (`src/lib/auth`) é implementação própria, não Auth.js/NextAuth (ver `ARCHITECTURE.md`).

## 2. Lojas

### `Store` (unidade — PDC1, PDC2, PDC3...)
`name`, `code` (unique), `address`, `phone`, `active`.

## 3. Pessoas

### `Customer`
Pessoa física conhecida pela loja (hoje, sempre um pai/responsável; futuramente qualquer contato de CRM). `name`, `phone`, `whatsapp?`, `email?`, `cpf?`, `cep?`, `street?`, `city?`, `state?`, `notes?`, `deletedAt?`.

### `Baby`
`name?` + `nameUndefined: boolean` (seção 18 — "nome ainda não definido"), `sex` (`FEMALE|MALE|NOT_INFORMED`), `expectedBirthDate?`, `showerDate?` (data do chá), `photoUrl?`, `message?`, `theme?`, `deletedAt?`.

### `Buyer`
Identidade capturada no momento da compra (convidado, sem conta obrigatória — seção 14/92). `name`, `phone?`, `email?`, `cpf?`. Criado por pedido; não exige unicidade (mesma pessoa pode gerar vários registros — aceitável para o MVP, deduplicação fica para uma fase futura).

## 4. Listas

### `GiftList`
| Campo | Notas |
|---|---|
| publicId | código curto (ex.: `HEL-4F2A`), usado em buscas presenciais |
| slug | único, usado em `/lista/{slug}` |
| title | ex. "Enxoval da Helena" |
| babyId, storeId, consultantId (`User`) | |
| status | `DRAFT\|ACTIVE\|PAUSED\|CLOSED\|CANCELLED` |
| visibility | `PUBLIC_LINK\|PIN_PROTECTED\|PRIVATE` (padrão `PUBLIC_LINK`) |
| accessPin? | usado quando `PIN_PROTECTED` |
| listType | enum genérico, hoje sempre `BABY_REGISTRY` (seção 136) |
| eventDate? | data do evento (chá), genérico por tipo de lista |
| showPublicProgress | boolean, **padrão `false`** (seção 8) |
| showGiftValuesToParents | boolean, **padrão `false`** (seção 64) |
| createdBy (`User`), closedAt?, deletedAt? | auditoria/ciclo de vida |

`noindex` é aplicado sempre na página pública, independente de `visibility` (seção 17/122) — não é um campo de banco, é uma regra de renderização fixa.

### `GiftListParent`
Liga `GiftList` ↔ `Parent`, com `relationship` (`MOTHER|FATHER|GUARDIAN`) e `isPrimary`. Permite múltiplos responsáveis (seção 20).

## 5. Catálogo & Estoque

### `Category`
`name`, `slug`, `parentCategoryId?` (subcategoria via auto-relacionamento), `active`.

### `Product`
`sku` (unique), `barcode?`, `name`, `description?`, `categoryId`, `brand?`, `price` (centavos), `promoPrice?`, `images: String[]`, `status` (`ACTIVE|INACTIVE|DISCONTINUED`), `externalProductId?` (ERP futuro), `deletedAt?`.

### `ProductVariant`
`productId`, `sku` (unique), `barcode?`, `attributes: Json` (ex. `{ "tamanho": "P", "cor": "Rosa" }`), `priceOverride?`, `active`.

### `Inventory`
Estoque **por unidade e variação** (seção 83). `storeId`, `productVariantId`, `physicalQuantity`, `reservedQuantity`, único em `(storeId, productVariantId)`. `availableQuantity` **não é uma coluna** — é sempre calculado como `physicalQuantity - reservedQuantity` no momento da consulta, para eliminar qualquer risco de os dois números divergirem.

## 6. Item da lista — o coração da regra de privacidade

### `GiftListItem`
| Campo | Visível para |
|---|---|
| id, giftListId, productId, variantId? | loja, pais, público (via DTO) |
| **desiredQuantity** | loja, pais — **nunca público** |
| **purchasedQuantity** | loja, pais — **nunca público** |
| **reservedQuantity** | loja — **nunca pais nem público** |
| priority (`NORMAL\|DESIRED\|ESSENTIAL`) | loja, pais; público só como rótulo (seção 25), nunca número |
| notes?, active | loja |

`available = desiredQuantity - purchasedQuantity - reservedQuantity`. O público nunca recebe esse cálculo — recebe só `canPurchase = available > 0 AND inventory.availableQuantity > 0` (ver `API.md`).

## 7. Vendas

### `Order`
`orderNumber` (gerado a partir de `sequentialNumber Int @autoincrement()`), `giftListId`, `buyerId`, `channel` (`ONLINE|IN_STORE|ADMIN_MANUAL|FUTURE_INTEGRATION`), `storeId?`, `listConsultantId?` (cópia de `gift_list.consultant_id` no momento da venda, para histórico/comissão), `saleSellerId?` (quem vendeu — pode ser de outra unidade que a da lista, seção 72), `subtotal/discount/shipping/total` (centavos), `paymentStatus` (`PENDING|PROCESSING|APPROVED|REJECTED|CANCELLED|REFUNDED|EXPIRED`), `fulfillmentStatus` (seção 60), `channelSource` (string livre: `web`,`pdv`,...), `hideBuyerFromParents: boolean` (presente anônimo — seção 36/48), `buyerMessage?`, `externalOrderId?`, `cancelledAt?/cancelReason?/cancelledBy?`.

### `OrderItem`
`orderId`, `giftListItemId`, `productId`, `variantId?`, `quantity`, `unitPrice`, `discount`, `total`.

### `Payment`
`orderId`, `method` (`CASH|PIX|DEBIT_CARD|CREDIT_CARD|STORE_FINANCING|GIFT_CARD|OTHER`), `status` (mesmo enum de `paymentStatus`), `amount`, `paidAt?`, `storeId?` (unidade onde foi pago fisicamente), `pdvSaleNumber?`, `couponNumber?`, `notes?`.

### `PaymentTransaction`
Trilha técnica do gateway (Fase 2): `paymentId`, `provider`, `providerTransactionId`, `type` (`CHARGE|REFUND|WEBHOOK_EVENT`), `status`, `rawPayload: Json`. Nunca guarda dado de cartão — apenas token/IDs do provedor (seção 52).

### `Reservation`
Reserva temporária durante checkout online (seção 54-56): `giftListItemId`, `orderId?`, `quantity`, `expiresAt`, `status` (`ACTIVE|CONVERTED|EXPIRED|CANCELLED`).

## 8. Endereço & Logística

### `Address`
`customerId?`, `cep`, `street`, `number?`, `complement?`, `neighborhood?`, `city`, `state`, `isDefault`.

### `Shipment`
`orderId`, `deliveryMethod` (`STORE_HOLD|DELIVER_TO_PARENTS|STORE_PICKUP` — seção 59), `addressId?`, `status` (`PENDING|SEPARATING|READY|OUT_FOR_DELIVERY|DELIVERED|PICKED_UP|CANCELLED`), `readyAt?`, `deliveredAt?`.

## 9. Benefícios, créditos e vale-presente (schema-first, seções 76-80)

### `BenefitTier`
`minValue`, `maxValue?`, `rewardType` (`CREDIT|DISCOUNT|GIFT`), `rewardValue`, `description`, `active` — nunca hardcoded em código.

### `CustomerCredit`
`parentId`, `giftListId?`, `amount`, `status` (`PENDING|AVAILABLE|PARTIALLY_USED|USED|EXPIRED|CANCELLED`), `sourceBenefitTierId?`, `expiresAt?`.

### `GiftCard` (extensão além da lista sugerida na seção 95, necessária para a seção 80)
`code` (unique), `initialValue`, `remainingValue`, `giftListId?` (vinculado à lista), `status` (`ACTIVE|REDEEMED|EXPIRED|CANCELLED`), `purchasedByBuyerId?`, `expiresAt?`.

## 10. Comunicação & Auditoria

### `GiftMessage`
`orderId` (unique — uma mensagem por pedido), `giftListId`, `message`, `isAnonymous`.

### `Notification`
`event` (`NEW_LIST|NEW_GIFT|PAYMENT_APPROVED|PAYMENT_CANCELLED|PRODUCT_READY|LIST_CLOSING_SOON|CREDIT_RELEASED`), `channel` (`EMAIL|WHATSAPP|INTERNAL`), `recipientType`, `recipientId`, `payload: Json`, `status` (`PENDING|SENT|FAILED`), `sentAt?`.

### `AuditLog`
`actorUserId?`, `actorType` (`USER|SYSTEM`), `action`, `entityType`, `entityId`, `changes: Json`, `ipAddress?`. Gravado para: criação/edição/cancelamento de lista, adição/remoção de item, mudança de quantidade, registro/cancelamento de venda, alteração de pagamento (seção 75).

## 11. Configuração & Integrações

### `SystemSetting`
`key` (unique), `value: Json`, `description`. Usado para: TTL de reserva (padrão 15 min), `public_progress_default`, `leftover_discount_percent`/`leftover_discount_days` (seção 79), etc. — nada disso é hardcoded.

### `Integration`
`provider`, `type` (`PAYMENT|ERP|MESSAGING`), `config: Json` (referências, nunca segredos em texto puro — segredos ficam em variáveis de ambiente), `active`.

## 12. Enums — resumo

```
StaffRole            ADMIN, MANAGER, SELLER
GiftListStatus       DRAFT, ACTIVE, PAUSED, CLOSED, CANCELLED
GiftListVisibility   PUBLIC_LINK, PIN_PROTECTED, PRIVATE
ListType             BABY_REGISTRY, BABY_SHOWER, BIRTHDAY, FIRST_BIRTHDAY, BAPTISM, CHRISTMAS, OTHER
BabySex              FEMALE, MALE, NOT_INFORMED
ParentRelationship   MOTHER, FATHER, GUARDIAN
ItemPriority         NORMAL, DESIRED, ESSENTIAL
ProductStatus        ACTIVE, INACTIVE, DISCONTINUED
OrderChannel         ONLINE, IN_STORE, ADMIN_MANUAL, FUTURE_INTEGRATION
PaymentStatus        PENDING, PROCESSING, APPROVED, REJECTED, CANCELLED, REFUNDED, EXPIRED
PaymentMethod        CASH, PIX, DEBIT_CARD, CREDIT_CARD, STORE_FINANCING, GIFT_CARD, OTHER
FulfillmentStatus    PENDING, SEPARATING, READY, OUT_FOR_DELIVERY, DELIVERED, PICKED_UP, CANCELLED
ReservationStatus    ACTIVE, CONVERTED, EXPIRED, CANCELLED
DeliveryMethod       STORE_HOLD, DELIVER_TO_PARENTS, STORE_PICKUP
CreditStatus         PENDING, AVAILABLE, PARTIALLY_USED, USED, EXPIRED, CANCELLED
GiftCardStatus       ACTIVE, REDEEMED, EXPIRED, CANCELLED
RewardType           CREDIT, DISCOUNT, GIFT
NotificationEvent    NEW_LIST, NEW_GIFT, PAYMENT_APPROVED, PAYMENT_CANCELLED, PRODUCT_READY, LIST_CLOSING_SOON, CREDIT_RELEASED
NotificationChannel  EMAIL, WHATSAPP, INTERNAL
IntegrationType      PAYMENT, ERP, MESSAGING
```

## 13. Campos que a API pública NUNCA pode retornar

`desiredQuantity`, `purchasedQuantity`, `reservedQuantity`, qualquer `remaining`/`available` numérico, nomes de outros compradores, `phone`/`email`/`cpf`/`address` dos pais, `saleSellerId`/`storeId` da venda, valores arrecadados/histórico. Ver `API.md § Contrato público` e o teste obrigatório em `tests/integration/public-list-privacy.test.ts`.
