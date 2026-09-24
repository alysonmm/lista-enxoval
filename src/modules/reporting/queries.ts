import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DashboardScope = { storeId?: string; sellerId?: string };

function itemPrice(item: { product: { price: number; promoPrice: number | null }; variant: { priceOverride: number | null } | null }): number {
  return item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
}

export async function getDashboardSummary(scope: DashboardScope = {}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const listWhere: Prisma.GiftListWhereInput = {
    deletedAt: null,
    ...(scope.storeId ? { storeId: scope.storeId } : {}),
    ...(scope.sellerId ? { consultantId: scope.sellerId } : {}),
  };

  const orderWhere: Prisma.OrderWhereInput = {
    paymentStatus: "APPROVED",
    ...(scope.storeId ? { storeId: scope.storeId } : {}),
    ...(scope.sellerId
      ? { OR: [{ saleSellerId: scope.sellerId }, { listConsultantId: scope.sellerId }] }
      : {}),
  };

  const [activeLists, newListsThisMonth, ordersToday, ordersThisMonth, approvedOrders, potentialItems] =
    await Promise.all([
      prisma.giftList.count({ where: { ...listWhere, status: "ACTIVE" } }),
      prisma.giftList.count({ where: { ...listWhere, createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfToday } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.findMany({
        where: orderWhere,
        select: { total: true, channel: true, buyerId: true },
      }),
      prisma.giftListItem.findMany({
        where: { active: true, giftList: { ...listWhere, status: "ACTIVE" } },
        include: { product: { select: { price: true, promoPrice: true } }, variant: { select: { priceOverride: true } } },
      }),
    ]);

  const onlineTotal = approvedOrders
    .filter((o) => o.channel === "ONLINE")
    .reduce((sum, o) => sum + o.total, 0);
  const inStoreTotal = approvedOrders
    .filter((o) => o.channel === "IN_STORE")
    .reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = approvedOrders.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = approvedOrders.length > 0 ? Math.round(totalRevenue / approvedOrders.length) : 0;
  const uniqueBuyers = new Set(approvedOrders.map((o) => o.buyerId)).size;
  const potentialValue = potentialItems.reduce(
    (sum, item) => sum + itemPrice(item) * item.desiredQuantity,
    0,
  );

  return {
    activeLists,
    newListsThisMonth,
    salesTodayCount: ordersToday._count,
    salesTodayTotal: ordersToday._sum.total ?? 0,
    salesMonthCount: ordersThisMonth._count,
    salesMonthTotal: ordersThisMonth._sum.total ?? 0,
    onlineTotal,
    inStoreTotal,
    averageTicket,
    uniqueBuyers,
    potentialValue,
  };
}

export type SalesReportFilters = {
  storeId?: string;
  consultantId?: string;
  sellerId?: string;
  channel?: "ONLINE" | "IN_STORE" | "ADMIN_MANUAL" | "FUTURE_INTEGRATION";
  from?: Date;
  to?: Date;
  sellerScope?: string; // when set, restrict to orders touched by this staff member (SELLER role)
};

function buildOrderWhere(filters: SalesReportFilters): Prisma.OrderWhereInput {
  return {
    paymentStatus: "APPROVED",
    ...(filters.storeId ? { storeId: filters.storeId } : {}),
    ...(filters.consultantId ? { listConsultantId: filters.consultantId } : {}),
    ...(filters.sellerId ? { saleSellerId: filters.sellerId } : {}),
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.sellerScope
      ? { OR: [{ saleSellerId: filters.sellerScope }, { listConsultantId: filters.sellerScope }] }
      : {}),
  };
}

export async function getSalesByStore(filters: SalesReportFilters) {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(filters),
    include: { store: true },
  });
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const order of orders) {
    const key = order.store?.name ?? "Online (sem unidade)";
    const entry = map.get(key) ?? { name: key, total: 0, count: 0 };
    entry.total += order.total;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getSalesByConsultant(filters: SalesReportFilters) {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(filters),
    include: { listConsultant: true },
  });
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const order of orders) {
    const key = order.listConsultant?.name ?? "—";
    const entry = map.get(key) ?? { name: key, total: 0, count: 0 };
    entry.total += order.total;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getSalesBySeller(filters: SalesReportFilters) {
  const orders = await prisma.order.findMany({
    where: { ...buildOrderWhere(filters), saleSellerId: { not: null } },
    include: { saleSeller: true },
  });
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const order of orders) {
    const key = order.saleSeller?.name ?? "—";
    const entry = map.get(key) ?? { name: key, total: 0, count: 0 };
    entry.total += order.total;
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getMostGiftedProducts(filters: SalesReportFilters, limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { order: buildOrderWhere(filters) },
    include: { product: true },
  });
  const map = new Map<string, { name: string; quantity: number; total: number }>();
  for (const item of items) {
    const entry = map.get(item.productId) ?? { name: item.product.name, quantity: 0, total: 0 };
    entry.quantity += item.quantity;
    entry.total += item.total;
    map.set(item.productId, entry);
  }
  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export async function getListsReportSummary(filters: SalesReportFilters) {
  const orders = await prisma.order.findMany({ where: buildOrderWhere(filters) });
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const onlineOrders = orders.filter((o) => o.channel === "ONLINE").length;
  const inStoreOrders = orders.filter((o) => o.channel === "IN_STORE").length;
  const averageTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  return { totalOrders, totalRevenue, onlineOrders, inStoreOrders, averageTicket };
}
