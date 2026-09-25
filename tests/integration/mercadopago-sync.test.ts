/**
 * syncOrderPaymentFromMercadoPago (chamada pelo webhook): sempre rebusca o
 * pagamento pela API (mockada aqui — nunca confia no corpo da notificação),
 * grava Payment + PaymentTransaction e só aprova o pedido quando o status
 * remoto é "approved". Precisa ser idempotente porque o Mercado Pago
 * reenvia a mesma notificação em caso de falha.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mercadopago")>();
  return { ...actual, fetchMercadoPagoPayment: vi.fn() };
});

const { syncOrderPaymentFromMercadoPago } = await import("@/modules/checkout/payments");
const { fetchMercadoPagoPayment } = await import("@/lib/mercadopago");
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

const fetchMock = vi.mocked(fetchMercadoPagoPayment);

describe("syncOrderPaymentFromMercadoPago", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let staffId: string;
  let parentId: string;
  let giftListId: string;
  let buyerId: string;
  let orderId: string;

  beforeAll(async () => {
    const store = await helpers.createTestStore();
    storeId = store.id;
    const category = await helpers.createTestCategory();
    categoryId = category.id;
    const { product } = await helpers.createTestProductWithVariant(categoryId, 50);
    productId = product.id;
    const staff = await helpers.createTestStaff("ADMIN", storeId);
    staffId = staff.id;
    const { parent } = await helpers.createTestParent();
    parentId = parent.id;
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId });
    giftListId = giftList.id;

    const buyer = await prisma.buyer.create({ data: { name: "Comprador MP Teste" } });
    buyerId = buyer.id;
    const order = await prisma.order.create({
      data: {
        giftListId,
        buyerId,
        channel: "ONLINE",
        storeId,
        subtotal: 5000,
        total: 5000,
        paymentStatus: "PENDING",
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await helpers.cleanupGiftList(giftListId);
    await prisma.buyer.delete({ where: { id: buyerId } }).catch(() => {});
    await helpers.cleanupProduct(productId);
    await helpers.cleanupParent(parentId);
    await helpers.cleanupStaff(staffId);
    await helpers.cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it("aprova o pedido e grava Payment + PaymentTransaction quando o pagamento remoto está approved", async () => {
    fetchMock.mockResolvedValueOnce({
      id: 123456789,
      status: "approved",
      status_detail: "accredited",
      external_reference: orderId,
      payment_type_id: "bank_transfer",
      payment_method_id: "pix",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await syncOrderPaymentFromMercadoPago("123456789");

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: { include: { transactions: true } } },
    });
    expect(order.paymentStatus).toBe("APPROVED");
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0]!.status).toBe("APPROVED");
    expect(order.payments[0]!.method).toBe("PIX");
    expect(order.payments[0]!.transactions).toHaveLength(1);
    expect(order.payments[0]!.transactions[0]!.provider).toBe("mercadopago");
    expect(order.payments[0]!.transactions[0]!.providerTransactionId).toBe("123456789");
    expect(order.payments[0]!.transactions[0]!.type).toBe("WEBHOOK_EVENT");
  });

  it("é idempotente: reprocessar a mesma notificação não duplica Payment nem re-aprova", async () => {
    fetchMock.mockResolvedValueOnce({
      id: 123456789,
      status: "approved",
      status_detail: "accredited",
      external_reference: orderId,
      payment_type_id: "bank_transfer",
      payment_method_id: "pix",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await syncOrderPaymentFromMercadoPago("123456789");

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: { include: { transactions: true } } },
    });
    expect(order.paymentStatus).toBe("APPROVED");
    expect(order.payments).toHaveLength(1);
    // Uma segunda notificação para o mesmo pagamento gera uma nova linha de
    // evento (auditoria), mas continua sendo o mesmo Payment.
    expect(order.payments[0]!.transactions).toHaveLength(2);
  });

  it("ignora quando o pedido referenciado (external_reference) não existe", async () => {
    fetchMock.mockResolvedValueOnce({
      id: 999999999,
      status: "approved",
      external_reference: "pedido-que-nao-existe",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(syncOrderPaymentFromMercadoPago("999999999")).resolves.toBeUndefined();
  });
});
