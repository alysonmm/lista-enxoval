/**
 * Concorrência (seções 54/56): duas vendas simultâneas disputando a última
 * unidade de um item nunca podem ambas ser aprovadas. Sem o SELECT ... FOR
 * UPDATE em registerInStoreSaleAction, as duas transações leriam a mesma
 * quantidade disponível e ambas confirmariam, vendendo além do desejado e
 * além do estoque físico.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sessionHolder = vi.hoisted(() => ({
  current: null as null | { kind: "staff"; userId: string; role: "ADMIN"; storeId: string | null; name: string; email: string },
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));
vi.mock("@/lib/auth/current-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/current-user")>();
  return {
    ...actual,
    getStaffSession: async () => sessionHolder.current,
    getClientIp: async () => null,
  };
});

const { registerInStoreSaleAction } = await import("@/modules/sales/actions");
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

describe("controle de concorrência na venda presencial", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let staffId: string;
  let parentId: string;
  let giftListId: string;
  let itemId: string;

  beforeAll(async () => {
    const store = await helpers.createTestStore();
    storeId = store.id;
    const category = await helpers.createTestCategory();
    categoryId = category.id;
    const { product, variant } = await helpers.createTestProductWithVariant(categoryId, 89.9);
    productId = product.id;
    variantId = variant.id;
    const staff = await helpers.createTestStaff("ADMIN", storeId);
    staffId = staff.id;
    const { parent } = await helpers.createTestParent();
    parentId = parent.id;
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId });
    giftListId = giftList.id;
    const item = await helpers.createTestGiftListItem({
      giftListId,
      productId,
      variantId,
      desiredQuantity: 1,
    });
    itemId = item.id;
    await helpers.setInventory(storeId, variantId, 1);

    sessionHolder.current = { kind: "staff", userId: staffId, role: "ADMIN", storeId, name: "Teste", email: "t@t.com" };
  });

  afterAll(async () => {
    await helpers.cleanupGiftList(giftListId);
    await helpers.cleanupProduct(productId);
    await helpers.cleanupParent(parentId);
    await helpers.cleanupStaff(staffId);
    await helpers.cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  function buildSaleForm() {
    const formData = new FormData();
    formData.set("giftListItemId", itemId);
    formData.set("quantity", "1");
    formData.set("unitPrice", "89.90");
    formData.set("paymentMethod", "PIX");
    formData.set("buyerName", "Comprador Concorrente");
    return formData;
  }

  it("aprova exatamente uma das duas vendas simultâneas pela última unidade", async () => {
    const results = await Promise.allSettled([
      registerInStoreSaleAction(giftListId, buildSaleForm()),
      registerInStoreSaleAction(giftListId, buildSaleForm()),
    ]);

    const messages = results.map((r) => (r.status === "rejected" ? (r.reason as Error).message : "NO_REDIRECT_THROWN"));
    const successes = messages.filter((m) => m.startsWith("REDIRECT:/admin/vendas/"));
    const failures = messages.filter((m) => m.includes("error=exceeds_list_quantity") || m.includes("error=out_of_stock"));

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const updatedItem = await prisma.giftListItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(updatedItem.purchasedQuantity).toBe(1);

    const inventory = await prisma.inventory.findFirstOrThrow({
      where: { productVariantId: variantId, storeId },
    });
    expect(inventory.physicalQuantity).toBe(0);

    const orderCount = await prisma.order.count({ where: { giftListId } });
    expect(orderCount).toBe(1);
  });
});
