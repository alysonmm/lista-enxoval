/**
 * Cancelamento e estorno (seções 74/130): cancelar um pedido nunca apaga a
 * venda — muda o status, estorna o pagamento, devolve a quantidade comprada
 * e o estoque físico, e registra motivo + responsável.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sessionHolder = vi.hoisted(() => ({
  current: null as null | { kind: "staff"; userId: string; role: "ADMIN" | "MANAGER" | "SELLER"; storeId: string | null; name: string; email: string },
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

const { registerInStoreSaleAction, cancelOrderAction } = await import("@/modules/sales/actions");
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

describe("cancelamento de venda presencial", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let staffId: string;
  let parentId: string;
  let giftListId: string;
  let itemId: string;
  let orderId: string;

  beforeAll(async () => {
    const store = await helpers.createTestStore();
    storeId = store.id;
    const category = await helpers.createTestCategory();
    categoryId = category.id;
    const { product, variant } = await helpers.createTestProductWithVariant(categoryId, 100);
    productId = product.id;
    variantId = variant.id;
    const staff = await helpers.createTestStaff("ADMIN", storeId);
    staffId = staff.id;
    const { parent } = await helpers.createTestParent();
    parentId = parent.id;
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId });
    giftListId = giftList.id;
    const item = await helpers.createTestGiftListItem({ giftListId, productId, variantId, desiredQuantity: 5 });
    itemId = item.id;
    await helpers.setInventory(storeId, variantId, 10);

    sessionHolder.current = { kind: "staff", userId: staffId, role: "ADMIN", storeId, name: "Teste", email: "t@t.com" };

    const formData = new FormData();
    formData.set("giftListItemId", itemId);
    formData.set("quantity", "3");
    formData.set("unitPrice", "100");
    formData.set("paymentMethod", "PIX");
    formData.set("buyerName", "Comprador Teste");
    try {
      await registerInStoreSaleAction(giftListId, formData);
    } catch (e) {
      const message = (e as Error).message;
      const match = /REDIRECT:\/admin\/vendas\/([^?]+)/.exec(message);
      if (!match) throw new Error(`Venda inicial falhou inesperadamente: ${message}`);
      orderId = match[1];
    }
  });

  afterAll(async () => {
    await helpers.cleanupGiftList(giftListId);
    await helpers.cleanupProduct(productId);
    await helpers.cleanupParent(parentId);
    await helpers.cleanupStaff(staffId);
    await helpers.cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it("a venda inicial reduziu a quantidade disponível e o estoque", async () => {
    const item = await prisma.giftListItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.purchasedQuantity).toBe(3);
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productVariantId: variantId, storeId } });
    expect(inventory.physicalQuantity).toBe(7);
  });

  it("cancelar a venda estorna quantidade, estoque e pagamento, sem apagar o pedido", async () => {
    const formData = new FormData();
    formData.set("reason", "Teste automatizado de cancelamento");

    await expect(cancelOrderAction(orderId, formData)).rejects.toThrow(`REDIRECT:/admin/vendas/${orderId}?saved=1`);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).not.toBeNull(); // o pedido continua existindo — nunca é apagado
    expect(order.paymentStatus).toBe("CANCELLED");
    expect(order.cancelReason).toBe("Teste automatizado de cancelamento");
    expect(order.cancelledById).toBe(staffId);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments.every((p) => p.status === "CANCELLED")).toBe(true);

    const item = await prisma.giftListItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.purchasedQuantity).toBe(0);

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productVariantId: variantId, storeId } });
    expect(inventory.physicalQuantity).toBe(10);
  });

  it("não permite cancelar a mesma venda duas vezes (redireciona com erro, não quebra)", async () => {
    const formData = new FormData();
    formData.set("reason", "Segunda tentativa");
    await expect(cancelOrderAction(orderId, formData)).rejects.toThrow(
      `REDIRECT:/admin/vendas/${orderId}?error=already_cancelled`,
    );

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments.every((p) => p.status === "CANCELLED")).toBe(true);
  });
});
