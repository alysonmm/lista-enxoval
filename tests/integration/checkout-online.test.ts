/**
 * Checkout online (carrinho com múltiplos itens): cobre o caminho feliz de
 * um pedido com um item, um pedido com vários itens diferentes no mesmo
 * carrinho, e a mesma proteção de concorrência da venda presencial (seções
 * 54/56) — duas disputas simultâneas pela última unidade nunca podem ambas
 * ser aprovadas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
    getClientIp: async () => null,
  };
});

const { checkoutOnlineAction } = await import("@/modules/checkout/actions");
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

describe("checkout online (carrinho com múltiplos itens)", () => {
  let storeId: string;
  let categoryId: string;
  let staffId: string;
  let parentId: string;
  let giftListId: string;
  let slug: string;

  const productIds: string[] = [];

  let happyItemId: string;
  let multiItemAId: string;
  let multiItemBId: string;
  let raceItemId: string;
  let raceVariantId: string;

  beforeAll(async () => {
    const store = await helpers.createTestStore();
    storeId = store.id;
    const category = await helpers.createTestCategory();
    categoryId = category.id;

    const staff = await helpers.createTestStaff("ADMIN", storeId);
    staffId = staff.id;
    const { parent } = await helpers.createTestParent();
    parentId = parent.id;
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId });
    giftListId = giftList.id;
    slug = giftList.slug;

    const happy = await helpers.createTestProductWithVariant(categoryId, 30);
    productIds.push(happy.product.id);
    happyItemId = (
      await helpers.createTestGiftListItem({ giftListId, productId: happy.product.id, desiredQuantity: 3 })
    ).id;

    const multiA = await helpers.createTestProductWithVariant(categoryId, 20);
    productIds.push(multiA.product.id);
    multiItemAId = (
      await helpers.createTestGiftListItem({ giftListId, productId: multiA.product.id, desiredQuantity: 3 })
    ).id;

    const multiB = await helpers.createTestProductWithVariant(categoryId, 45);
    productIds.push(multiB.product.id);
    multiItemBId = (
      await helpers.createTestGiftListItem({ giftListId, productId: multiB.product.id, desiredQuantity: 3 })
    ).id;

    const race = await helpers.createTestProductWithVariant(categoryId, 89.9);
    productIds.push(race.product.id);
    raceVariantId = race.variant.id;
    raceItemId = (
      await helpers.createTestGiftListItem({
        giftListId,
        productId: race.product.id,
        variantId: race.variant.id,
        desiredQuantity: 1,
      })
    ).id;
    await helpers.setInventory(storeId, raceVariantId, 1);
  });

  afterAll(async () => {
    await helpers.cleanupGiftList(giftListId);
    for (const productId of productIds) await helpers.cleanupProduct(productId);
    await helpers.cleanupParent(parentId);
    await helpers.cleanupStaff(staffId);
    await helpers.cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  function buildForm(lines: { itemId: string; quantity: number }[], overrides: Record<string, string> = {}) {
    const formData = new FormData();
    for (const line of lines) {
      formData.append("itemId", line.itemId);
      formData.append("quantity", String(line.quantity));
    }
    formData.set("buyerName", overrides.buyerName ?? "Madrinha Coruja");
    if (overrides.message !== undefined) formData.set("message", overrides.message);
    if (overrides.hideBuyerFromParents) formData.set("hideBuyerFromParents", "on");
    return formData;
  }

  it("cria um pedido ONLINE pendente para um item e incrementa purchasedQuantity", async () => {
    const redirectUrl = await helpers.expectRedirect(
      checkoutOnlineAction(slug, buildForm([{ itemId: happyItemId, quantity: 1 }], { message: "Com muito carinho!" })),
    );
    expect(redirectUrl).toMatch(new RegExp(`^/lista/${slug}/checkout/confirmado\\?order=`));

    const updatedItem = await prisma.giftListItem.findUniqueOrThrow({ where: { id: happyItemId } });
    expect(updatedItem.purchasedQuantity).toBe(1);

    const orderId = redirectUrl.split("order=")[1]!;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { giftMessage: true, items: true },
    });
    expect(order.channel).toBe("ONLINE");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.total).toBe(3000);
    expect(order.items).toHaveLength(1);
    expect(order.giftMessage?.message).toBe("Com muito carinho!");
  });

  it("aceita vários itens diferentes do carrinho em um único pedido", async () => {
    const redirectUrl = await helpers.expectRedirect(
      checkoutOnlineAction(
        slug,
        buildForm([
          { itemId: multiItemAId, quantity: 1 },
          { itemId: multiItemBId, quantity: 2 },
        ]),
      ),
    );

    const orderId = redirectUrl.split("order=")[1]!;
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

    expect(order.items).toHaveLength(2);
    // 1x R$20 + 2x R$45 = R$110,00
    expect(order.total).toBe(11000);

    const itemA = await prisma.giftListItem.findUniqueOrThrow({ where: { id: multiItemAId } });
    const itemB = await prisma.giftListItem.findUniqueOrThrow({ where: { id: multiItemBId } });
    expect(itemA.purchasedQuantity).toBe(1);
    expect(itemB.purchasedQuantity).toBe(2);
  });

  it("aprova exatamente um dos dois checkouts simultâneos pela última unidade", async () => {
    const results = await Promise.allSettled([
      checkoutOnlineAction(slug, buildForm([{ itemId: raceItemId, quantity: 1 }])),
      checkoutOnlineAction(slug, buildForm([{ itemId: raceItemId, quantity: 1 }])),
    ]);

    const messages = results.map((r) => (r.status === "rejected" ? (r.reason as Error).message : "NO_REDIRECT_THROWN"));
    const successes = messages.filter((m) => m.startsWith("REDIRECT:/lista/") && m.includes("/checkout/confirmado"));
    const failures = messages.filter((m) => m.includes("error=item_unavailable"));

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const updatedItem = await prisma.giftListItem.findUniqueOrThrow({ where: { id: raceItemId } });
    expect(updatedItem.purchasedQuantity).toBe(1);

    const inventory = await prisma.inventory.findFirstOrThrow({
      where: { productVariantId: raceVariantId, storeId },
    });
    expect(inventory.physicalQuantity).toBe(0);
  });
});
