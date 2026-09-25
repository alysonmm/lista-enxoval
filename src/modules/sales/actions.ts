"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reaisToCents } from "@/lib/money";
import { getClientIp, getStaffSession, type StaffSessionPayload } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cancelOrderSchema, inStoreSaleSchema, markOrderPaidSchema } from "./schemas";

type Tx = Prisma.TransactionClient;

class SaleError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function requireStaff(): Promise<StaffSessionPayload> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Trava a linha do item da lista para a duração da transação (Postgres
 * `SELECT ... FOR UPDATE`), serializando vendas concorrentes contra o mesmo
 * item. Sem isso, duas vendas simultâneas poderiam ler a mesma quantidade
 * disponível e ambas confirmarem, vendendo além do desejado (seção 54/56).
 */
async function lockGiftListItem(tx: Tx, itemId: string) {
  await tx.$executeRaw`SELECT id FROM gift_list_items WHERE id = ${itemId} FOR UPDATE`;
}

async function lockInventory(tx: Tx, storeId: string, productVariantId: string) {
  await tx.$executeRaw`SELECT id FROM inventory WHERE store_id = ${storeId} AND product_variant_id = ${productVariantId} FOR UPDATE`;
}

export async function registerInStoreSaleAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = inStoreSaleSchema.safeParse({
    giftListItemId: formData.get("giftListItemId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    discount: formData.get("discount") || 0,
    paymentMethod: formData.get("paymentMethod"),
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone") || undefined,
    hideBuyerFromParents: formData.get("hideBuyerFromParents") === "on",
    buyerMessage: formData.get("buyerMessage") || undefined,
    pdvSaleNumber: formData.get("pdvSaleNumber") || undefined,
    couponNumber: formData.get("couponNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect(`/admin/listas/${listId}/venda?error=invalid_input`);
  const data = parsed.data;

  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      await lockGiftListItem(tx, data.giftListItemId);

      const item = await tx.giftListItem.findUnique({
        where: { id: data.giftListItemId },
        include: { giftList: true },
      });
      if (!item || item.giftListId !== listId) throw new SaleError("item_not_found");
      if (item.giftList.status !== "ACTIVE") throw new SaleError("list_not_active");

      const availableInList = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
      if (data.quantity > availableInList) throw new SaleError("exceeds_list_quantity");

      const saleStoreId = session.storeId ?? item.giftList.storeId;

      if (item.variantId) {
        await lockInventory(tx, saleStoreId, item.variantId);
        const inventory = await tx.inventory.findUnique({
          where: { storeId_productVariantId: { storeId: saleStoreId, productVariantId: item.variantId } },
        });
        const availableStock = inventory ? inventory.physicalQuantity - inventory.reservedQuantity : 0;
        if (data.quantity > availableStock) throw new SaleError("out_of_stock");
        await tx.inventory.update({
          where: { id: inventory!.id },
          data: { physicalQuantity: { decrement: data.quantity } },
        });
      }

      await tx.giftListItem.update({
        where: { id: item.id },
        data: { purchasedQuantity: { increment: data.quantity } },
      });

      const buyer = await tx.buyer.create({
        data: { name: data.buyerName, phone: data.buyerPhone || null },
      });

      const unitPriceCents = reaisToCents(data.unitPrice);
      const discountCents = reaisToCents(data.discount);
      const subtotal = unitPriceCents * data.quantity;
      const total = Math.max(subtotal - discountCents, 0);

      const order = await tx.order.create({
        data: {
          giftListId: listId,
          buyerId: buyer.id,
          channel: "IN_STORE",
          storeId: saleStoreId,
          listConsultantId: item.giftList.consultantId,
          saleSellerId: session.userId,
          subtotal,
          discount: discountCents,
          total,
          paymentStatus: "APPROVED",
          fulfillmentStatus: "PENDING",
          channelSource: "pdv",
          hideBuyerFromParents: data.hideBuyerFromParents,
          buyerMessage: data.buyerMessage || null,
          items: {
            create: {
              giftListItemId: item.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: data.quantity,
              unitPrice: unitPriceCents,
              discount: discountCents,
              total,
            },
          },
          payments: {
            create: {
              method: data.paymentMethod,
              status: "APPROVED",
              amount: total,
              paidAt: new Date(),
              storeId: saleStoreId,
              pdvSaleNumber: data.pdvSaleNumber || null,
              couponNumber: data.couponNumber || null,
              notes: data.notes || null,
            },
          },
          ...(data.buyerMessage
            ? {
                giftMessage: {
                  create: {
                    giftListId: listId,
                    message: data.buyerMessage,
                    isAnonymous: data.hideBuyerFromParents,
                  },
                },
              }
            : {}),
        },
      });

      return order.id;
    });
  } catch (e) {
    if (e instanceof SaleError) redirect(`/admin/listas/${listId}/venda?error=${e.code}`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "order.create_in_store",
    entityType: "Order",
    entityId: orderId,
    changes: { giftListItemId: data.giftListItemId, quantity: data.quantity },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  revalidatePath("/admin/vendas");
  redirect(`/admin/vendas/${orderId}?saved=1`);
}

export async function cancelOrderAction(orderId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();
  if (session.role !== "ADMIN") {
    const allowed = await hasPermission(session, PERMISSIONS.SALES_CANCEL);
    if (!allowed) redirect(`/admin/vendas/${orderId}?error=forbidden`);
  }

  const parsed = cancelOrderSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) redirect(`/admin/vendas/${orderId}?error=invalid_input`);
  const { reason } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new SaleError("not_found");
      if (order.paymentStatus === "CANCELLED" || order.paymentStatus === "REFUNDED") {
        throw new SaleError("already_cancelled");
      }

      for (const orderItem of order.items) {
        await lockGiftListItem(tx, orderItem.giftListItemId);
        await tx.giftListItem.update({
          where: { id: orderItem.giftListItemId },
          data: { purchasedQuantity: { decrement: orderItem.quantity } },
        });

        if (orderItem.variantId && order.storeId) {
          await lockInventory(tx, order.storeId, orderItem.variantId);
          await tx.inventory.update({
            where: {
              storeId_productVariantId: { storeId: order.storeId, productVariantId: orderItem.variantId },
            },
            data: { physicalQuantity: { increment: orderItem.quantity } },
          });
        }
      }

      await tx.payment.updateMany({
        where: { orderId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        data: { status: "CANCELLED" },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
          cancelledById: session.userId,
        },
      });
    });
  } catch (e) {
    if (e instanceof SaleError) redirect(`/admin/vendas/${orderId}?error=${e.code}`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "order.cancel",
    entityType: "Order",
    entityId: orderId,
    changes: { reason },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/vendas/${orderId}`);
  revalidatePath("/admin/vendas");
  redirect(`/admin/vendas/${orderId}?saved=1`);
}

/**
 * Fecha o ciclo de um pedido ONLINE: o site cria o pedido com pagamento
 * pendente (não há gateway integrado ainda — seção "Fase 2"), e a equipe
 * confirma aqui quando o comprador efetivamente paga (na loja, Pix
 * combinado, etc.). Só então o pedido passa a aparecer para os pais.
 */
export async function markOrderPaidAction(orderId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = markOrderPaidSchema.safeParse({ paymentMethod: formData.get("paymentMethod") });
  if (!parsed.success) redirect(`/admin/vendas/${orderId}?error=invalid_input`);
  const { paymentMethod } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new SaleError("not_found");
      if (order.paymentStatus !== "PENDING" && order.paymentStatus !== "PROCESSING") {
        throw new SaleError("not_pending");
      }

      await tx.payment.create({
        data: {
          orderId,
          method: paymentMethod,
          status: "APPROVED",
          amount: order.total,
          paidAt: new Date(),
          storeId: order.storeId,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "APPROVED" },
      });
    });
  } catch (e) {
    if (e instanceof SaleError) redirect(`/admin/vendas/${orderId}?error=${e.code}`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "order.mark_paid",
    entityType: "Order",
    entityId: orderId,
    changes: { paymentMethod },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/vendas/${orderId}`);
  revalidatePath("/admin/vendas");
  redirect(`/admin/vendas/${orderId}?saved=1`);
}
