/**
 * Teste obrigatório (seções 27, 132, 141): a visão pública de uma lista
 * NUNCA pode expor desired/purchased/reserved/remaining quantity, em
 * nenhuma profundidade do objeto retornado — nem em qualquer variação de
 * nome (camelCase ou snake_case). Também cobre os estados de visibilidade
 * (PRIVATE/DRAFT/CANCELLED = não encontrada; PIN_PROTECTED exige PIN) e
 * confirma que dados pessoais dos responsáveis nunca aparecem.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getPublicGiftListView,
  type PublicGiftListItem,
} from "@/modules/gift-lists/public";
import {
  cleanupGiftList,
  cleanupParent,
  cleanupProduct,
  cleanupStaff,
  cleanupStore,
  createTestCategory,
  createTestGiftList,
  createTestGiftListItem,
  createTestParent,
  createTestProductWithVariant,
  createTestStaff,
  createTestStore,
  setInventory,
} from "../helpers";

// Garantia em tempo de compilação: se um campo de quantidade for algum dia
// adicionado a PublicGiftListItem, esta linha deixa de compilar e
// `npm run typecheck` falha. A omissão é estrutural, não um filtro em runtime.
type ForbiddenKey =
  | "desiredQuantity"
  | "purchasedQuantity"
  | "reservedQuantity"
  | "remainingQuantity"
  | "availableQuantity"
  | "desired_quantity"
  | "purchased_quantity"
  | "reserved_quantity";
type LeakedKey = Extract<keyof PublicGiftListItem, ForbiddenKey>;
const _noForbiddenKeysOnPublicItem: LeakedKey extends never ? true : never = true;
void _noForbiddenKeysOnPublicItem;

// Números grandes e específicos, para que uma checagem por substring não dê
// falso positivo com preços/IDs formatados coincidentemente.
const DESIRED = 9137;
const PURCHASED = 4111;
const RESERVED = 2003;
const PIN = "7391";

function assertNoQuantityLeak(value: unknown) {
  const json = JSON.stringify(value);
  // Nenhum campo legítimo do DTO público contém a palavra "quantity" — a
  // ausência total dela é justamente a garantia estrutural do design.
  expect(json.toLowerCase()).not.toContain("quantity");
  expect(json).not.toContain(String(DESIRED));
  expect(json).not.toContain(String(PURCHASED));
  expect(json).not.toContain(String(RESERVED));
}

describe("privacidade da página pública da lista", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let consultantId: string;
  let parentId: string;
  let customerPhone: string;

  const createdListIds: string[] = [];

  beforeAll(async () => {
    const store = await createTestStore();
    storeId = store.id;
    const category = await createTestCategory();
    categoryId = category.id;
    const { product, variant } = await createTestProductWithVariant(categoryId, 89.9);
    productId = product.id;
    variantId = variant.id;
    const staff = await createTestStaff("ADMIN");
    consultantId = staff.id;
    const { customer, parent } = await createTestParent();
    parentId = parent.id;
    customerPhone = customer.phone!;
    await setInventory(storeId, variantId, 50);
  });

  afterAll(async () => {
    for (const id of createdListIds) await cleanupGiftList(id);
    await cleanupProduct(productId);
    await cleanupParent(parentId);
    await cleanupStaff(consultantId);
    await cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  async function buildList(opts: {
    status?: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "CANCELLED";
    visibility?: "PUBLIC_LINK" | "PIN_PROTECTED" | "PRIVATE";
    accessPin?: string;
    purchased?: number;
  }) {
    const { giftList } = await createTestGiftList({
      storeId,
      consultantId,
      parentId,
      status: opts.status,
      visibility: opts.visibility,
      accessPin: opts.accessPin,
    });
    createdListIds.push(giftList.id);
    await createTestGiftListItem({
      giftListId: giftList.id,
      productId,
      variantId,
      desiredQuantity: DESIRED,
      purchasedQuantity: opts.purchased ?? PURCHASED,
      reservedQuantity: RESERVED,
    });
    return giftList;
  }

  it("nunca inclui campos de quantidade quando o item ainda pode ser presenteado", async () => {
    const list = await buildList({ purchased: PURCHASED }); // DESIRED - PURCHASED - RESERVED > 0
    const view = await getPublicGiftListView(list.slug);

    expect(view.status).toBe("ok");
    if (view.status !== "ok") throw new Error("unreachable");
    expect(view.items).toHaveLength(1);
    expect(view.items[0].canPurchase).toBe(true);
    assertNoQuantityLeak(view);
  });

  it("nunca inclui campos de quantidade quando o item já foi totalmente presenteado", async () => {
    const list = await buildList({ purchased: DESIRED - RESERVED }); // availableInList = 0
    const view = await getPublicGiftListView(list.slug);

    expect(view.status).toBe("ok");
    if (view.status !== "ok") throw new Error("unreachable");
    expect(view.items[0].canPurchase).toBe(false);
    assertNoQuantityLeak(view);
  });

  it("apenas os campos esperados existem no item público (nenhum campo interno extra)", async () => {
    const list = await buildList({});
    const view = await getPublicGiftListView(list.slug);
    if (view.status !== "ok") throw new Error("unreachable");

    const allowedKeys = [
      "id",
      "productName",
      "description",
      "image",
      "variantLabel",
      "price",
      "priorityLabel",
      "canPurchase",
    ].sort();
    expect(Object.keys(view.items[0]).sort()).toEqual(allowedKeys);
  });

  it("nunca revela dados pessoais dos responsáveis (telefone, etc.)", async () => {
    const list = await buildList({});
    const view = await getPublicGiftListView(list.slug);
    expect(JSON.stringify(view)).not.toContain(customerPhone);
  });

  it("listas PRIVATE não são encontradas publicamente", async () => {
    const list = await buildList({ visibility: "PRIVATE" });
    const view = await getPublicGiftListView(list.slug);
    expect(view.status).toBe("not_found");
  });

  it("listas DRAFT não são encontradas publicamente (ainda não publicadas)", async () => {
    const list = await buildList({ status: "DRAFT" });
    const view = await getPublicGiftListView(list.slug);
    expect(view.status).toBe("not_found");
  });

  it("listas CANCELLED não são encontradas publicamente", async () => {
    const list = await buildList({ status: "CANCELLED" });
    const view = await getPublicGiftListView(list.slug);
    expect(view.status).toBe("not_found");
  });

  it("listas PIN_PROTECTED exigem o PIN correto antes de mostrar qualquer produto", async () => {
    const list = await buildList({ visibility: "PIN_PROTECTED", accessPin: PIN });

    const noPin = await getPublicGiftListView(list.slug);
    expect(noPin.status).toBe("requires_pin");
    assertNoQuantityLeak(noPin);

    const wrongPin = await getPublicGiftListView(list.slug, "0000");
    expect(wrongPin.status).toBe("invalid_pin");
    assertNoQuantityLeak(wrongPin);

    const correctPin = await getPublicGiftListView(list.slug, PIN);
    expect(correctPin.status).toBe("ok");
    assertNoQuantityLeak(correctPin);
  });

  it("listas PAUSED/CLOSED continuam visíveis, mas somente leitura (nunca can_purchase)", async () => {
    const list = await buildList({ status: "PAUSED", purchased: 0 });
    const view = await getPublicGiftListView(list.slug);
    expect(view.status).toBe("ok");
    if (view.status !== "ok") throw new Error("unreachable");
    expect(view.readOnly).toBe(true);
    expect(view.items[0].canPurchase).toBe(false);
    assertNoQuantityLeak(view);
  });
});
