import "server-only";

import { prisma } from "@/lib/prisma";
import type { GiftListStatus } from "@prisma/client";

const STATUS_PRIORITY: Record<GiftListStatus, number> = {
  ACTIVE: 0,
  PAUSED: 1,
  DRAFT: 2,
  CLOSED: 3,
  CANCELLED: 4,
};

/** Lista "principal" do responsável — a mais relevante quando há mais de uma. */
export async function getParentPrimaryList(parentId: string) {
  const memberships = await prisma.giftListParent.findMany({
    where: { parentId, giftList: { deletedAt: null } },
    include: {
      giftList: {
        include: {
          baby: true,
          store: true,
          items: {
            where: { active: true },
            include: { product: true, variant: true },
            orderBy: { createdAt: "asc" },
          },
          parents: { include: { parent: { include: { customer: true } } } },
          orders: {
            where: { paymentStatus: "APPROVED" },
            include: {
              buyer: true,
              giftMessage: true,
              items: { include: { product: true, variant: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (memberships.length === 0) return null;

  memberships.sort((a, b) => {
    const byStatus = STATUS_PRIORITY[a.giftList.status] - STATUS_PRIORITY[b.giftList.status];
    if (byStatus !== 0) return byStatus;
    return b.giftList.createdAt.getTime() - a.giftList.createdAt.getTime();
  });

  return memberships[0].giftList;
}

export type ParentPrimaryList = NonNullable<Awaited<ReturnType<typeof getParentPrimaryList>>>;

export function computeDashboard(list: ParentPrimaryList) {
  const itemsChosen = list.items.length;
  const itemsCompleted = list.items.filter(
    (item) => item.purchasedQuantity >= item.desiredQuantity,
  ).length;
  const percentComplete = itemsChosen > 0 ? Math.round((itemsCompleted / itemsChosen) * 100) : 0;

  const priceOf = (item: ParentPrimaryList["items"][number]) =>
    item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;

  const totalValueChosen = list.items.reduce((sum, item) => sum + priceOf(item) * item.desiredQuantity, 0);
  const totalValueGifted = list.items.reduce(
    (sum, item) => sum + priceOf(item) * item.purchasedQuantity,
    0,
  );

  return { itemsChosen, itemsCompleted, percentComplete, totalValueChosen, totalValueGifted };
}

export function getMissingItems(list: ParentPrimaryList) {
  return list.items
    .map((item) => ({
      item,
      remaining: item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity,
    }))
    .filter(({ remaining }) => remaining > 0);
}

export type ReceivedGift = {
  orderId: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  buyerName: string | null;
  message: string | null;
  total: number;
  createdAt: Date;
};

export function getReceivedGifts(list: ParentPrimaryList): ReceivedGift[] {
  const gifts: ReceivedGift[] = [];
  for (const order of list.orders) {
    for (const orderItem of order.items) {
      const attrs = orderItem.variant?.attributes;
      const variantLabel =
        attrs && typeof attrs === "object"
          ? Object.values(attrs as Record<string, string>).filter(Boolean).join(" / ") || null
          : null;
      gifts.push({
        orderId: order.id,
        productName: orderItem.product.name,
        variantLabel,
        quantity: orderItem.quantity,
        buyerName: order.hideBuyerFromParents ? null : order.buyer.name,
        message: order.giftMessage?.message ?? null,
        total: orderItem.total,
        createdAt: order.createdAt,
      });
    }
  }
  return gifts;
}
