"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { generateGiftMessage } from "@/lib/ai";
import { createCheckoutPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getAppBaseUrl } from "@/lib/qrcode";
import { checkoutOnlineSchema, generateGiftMessageSchema } from "./schemas";

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "";
  const parts = Object.values(attributes as Record<string, string>).filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

type Tx = Prisma.TransactionClient;

class CheckoutError extends Error {
  constructor(
    public code: string,
    public itemName?: string,
  ) {
    super(code);
  }
}

async function lockGiftListItem(tx: Tx, itemId: string) {
  await tx.$executeRaw`SELECT id FROM gift_list_items WHERE id = ${itemId} FOR UPDATE`;
}

async function lockInventory(tx: Tx, storeId: string, productVariantId: string) {
  await tx.$executeRaw`SELECT id FROM inventory WHERE store_id = ${storeId} AND product_variant_id = ${productVariantId} FOR UPDATE`;
}

function redirectToCheckoutError(slug: string, pin: string | undefined, error: CheckoutError): never {
  const params = new URLSearchParams({ error: error.code });
  if (error.itemName) params.set("item", error.itemName);
  if (pin) params.set("pin", pin);
  redirect(`/lista/${slug}/checkout?${params.toString()}`);
}

export async function checkoutOnlineAction(slug: string, formData: FormData): Promise<void> {
  const pin = (formData.get("pin") as string | null) || undefined;

  const parsed = checkoutOnlineSchema.safeParse({
    itemIds: formData.getAll("itemId"),
    quantities: formData.getAll("quantity"),
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone") || undefined,
    buyerEmail: formData.get("buyerEmail") || undefined,
    hideBuyerFromParents: formData.get("hideBuyerFromParents") === "on",
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    const params = new URLSearchParams({ error: "invalid_input" });
    if (pin) params.set("pin", pin);
    redirect(`/lista/${slug}/checkout?${params.toString()}`);
  }
  const data = parsed.data;

  // Uma mesma linha do carrinho pode aparecer duplicada por um bug de
  // cliente; soma as quantidades por item antes de tocar no banco.
  const linesByItem = new Map<string, number>();
  data.itemIds.forEach((itemId, index) => {
    const quantity = data.quantities[index] ?? 0;
    linesByItem.set(itemId, (linesByItem.get(itemId) ?? 0) + quantity);
  });

  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const list = await tx.giftList.findUnique({ where: { slug } });
      if (!list || list.deletedAt || list.visibility === "PRIVATE") {
        throw new CheckoutError("list_not_found");
      }
      if (list.status !== "ACTIVE") throw new CheckoutError("list_not_active");

      let subtotal = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const [itemId, quantity] of linesByItem) {
        await lockGiftListItem(tx, itemId);

        const item = await tx.giftListItem.findUnique({
          where: { id: itemId },
          include: { product: true, variant: true },
        });
        if (!item || item.giftListId !== list.id || !item.active) {
          throw new CheckoutError("item_not_found");
        }

        const availableInList = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
        if (quantity > availableInList) {
          throw new CheckoutError("item_unavailable", item.product.name);
        }

        if (item.variantId) {
          await lockInventory(tx, list.storeId, item.variantId);
          const inventory = await tx.inventory.findUnique({
            where: { storeId_productVariantId: { storeId: list.storeId, productVariantId: item.variantId } },
          });
          const availableStock = inventory ? inventory.physicalQuantity - inventory.reservedQuantity : 0;
          if (quantity > availableStock) throw new CheckoutError("item_unavailable", item.product.name);
          await tx.inventory.update({
            where: { id: inventory!.id },
            data: { physicalQuantity: { decrement: quantity } },
          });
        }

        await tx.giftListItem.update({
          where: { id: item.id },
          data: { purchasedQuantity: { increment: quantity } },
        });

        const unitPrice = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
        const total = unitPrice * quantity;
        subtotal += total;
        orderItemsData.push({
          giftListItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity,
          unitPrice,
          discount: 0,
          total,
        });
      }

      const buyer = await tx.buyer.create({
        data: {
          name: data.buyerName,
          phone: data.buyerPhone || null,
          email: data.buyerEmail,
        },
      });

      const order = await tx.order.create({
        data: {
          giftListId: list.id,
          buyerId: buyer.id,
          channel: "ONLINE",
          storeId: list.storeId,
          listConsultantId: list.consultantId,
          subtotal,
          discount: 0,
          total: subtotal,
          paymentStatus: "PENDING",
          fulfillmentStatus: "PENDING",
          channelSource: "site",
          hideBuyerFromParents: data.hideBuyerFromParents,
          buyerMessage: data.message || null,
          items: { createMany: { data: orderItemsData } },
          ...(data.message
            ? {
                giftMessage: {
                  create: {
                    giftListId: list.id,
                    message: data.message,
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
    if (e instanceof CheckoutError) redirectToCheckoutError(slug, pin, e);
    throw e;
  }

  await recordAudit({
    actorType: "SYSTEM",
    action: "order.create_online",
    entityType: "Order",
    entityId: orderId,
    changes: { slug, items: Array.from(linesByItem.entries()) },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/lista/${slug}`);
  revalidatePath("/admin/vendas");
  redirect(`/lista/${slug}/checkout/pagamento?order=${orderId}`);
}

/**
 * Cria uma preferência de Checkout Pro para um pedido já criado (pendente)
 * e redireciona o comprador para a página do Mercado Pago, onde ele escolhe
 * cartão de crédito, débito ou Pix e paga — dados de cartão nunca passam
 * pelo nosso servidor. A confirmação real chega depois pelo webhook
 * (essencial para o Pix, que é confirmado de forma assíncrona).
 */
export async function startMercadoPagoPaymentAction(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      giftList: true,
      items: { include: { product: true, variant: true } },
    },
  });
  if (!order || order.channel !== "ONLINE") notFound();
  const slug = order.giftList.slug;

  if (order.paymentStatus === "APPROVED") {
    redirect(`/lista/${slug}/checkout/confirmado?order=${orderId}`);
  }
  if (order.paymentStatus === "CANCELLED" || order.paymentStatus === "REFUNDED") {
    redirect(`/lista/${slug}/checkout/pagamento?order=${orderId}&error=order_unavailable`);
  }
  if (!isMercadoPagoConfigured()) {
    redirect(`/lista/${slug}/checkout/pagamento?order=${orderId}&error=mp_not_configured`);
  }

  const baseUrl = getAppBaseUrl();

  let initPoint: string;
  try {
    const preference = await createCheckoutPreference({
      orderId: order.id,
      items: order.items.map((item) => ({
        id: item.id,
        title: `${item.product.name}${variantLabel(item.variant?.attributes)}`,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice,
      })),
      payerEmail: order.buyer.email,
      payerName: order.buyer.name,
      backUrl: `${baseUrl}/lista/${slug}/checkout/retorno?order=${orderId}`,
      notificationUrl: `${baseUrl}/api/webhooks/mercadopago`,
    });
    initPoint = preference.initPoint;
  } catch (e) {
    console.error("Erro ao criar preferência do Mercado Pago:", e);
    redirect(`/lista/${slug}/checkout/pagamento?order=${orderId}&error=mp_error`);
  }

  redirect(initPoint);
}

export async function generateGiftMessageAction(
  input: unknown,
): Promise<{ message: string } | { error: string }> {
  const parsed = generateGiftMessageSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };

  const message = await generateGiftMessage({
    babyName: parsed.data.babyName || null,
    listTitle: parsed.data.listTitle,
    itemNames: parsed.data.itemNames,
    buyerName: parsed.data.buyerName || null,
  });
  return { message };
}
