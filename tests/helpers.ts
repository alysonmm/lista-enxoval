import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import type { StaffRole } from "@prisma/client";

let counter = 0;
/**
 * Sufixo único por teste. Precisa de um componente aleatório (não só
 * timestamp+contador) porque o Vitest roda cada arquivo de teste em um
 * processo separado: dois arquivos iniciados no mesmo milissegundo teriam
 * o mesmo contador e colidiriam em campos @unique (ex.: Store.code).
 */
export function uniqueId(): string {
  counter += 1;
  return `test-${Date.now()}-${counter}-${randomUUID().slice(0, 8)}`;
}

export async function expectRedirect(promise: Promise<void>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("REDIRECT:")) {
      return e.message.slice("REDIRECT:".length);
    }
    throw e;
  }
  throw new Error("Esperava um redirect, mas a action retornou normalmente.");
}

export function makeStaffSession(overrides: {
  userId: string;
  role?: StaffRole;
  storeId?: string | null;
  name?: string;
  email?: string;
}) {
  return {
    kind: "staff" as const,
    userId: overrides.userId,
    role: overrides.role ?? "ADMIN",
    storeId: overrides.storeId ?? null,
    name: overrides.name ?? "Usuário de Teste",
    email: overrides.email ?? "teste@example.com",
  };
}

export async function createTestStaff(role: StaffRole = "ADMIN", storeId: string | null = null) {
  const id = uniqueId();
  return prisma.user.create({
    data: {
      name: `Staff ${id}`,
      email: `${id}@example.com`,
      passwordHash: await hashPassword("senha123"),
      role,
      storeId,
    },
  });
}

export async function createTestStore() {
  const id = uniqueId();
  return prisma.store.create({
    data: { name: `Loja ${id}`, code: id.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  });
}

export async function createTestCategory() {
  const id = uniqueId();
  return prisma.category.create({ data: { name: `Categoria ${id}`, slug: id } });
}

export async function createTestProductWithVariant(categoryId: string, priceReais = 50) {
  const id = uniqueId();
  const product = await prisma.product.create({
    data: {
      sku: `${id}-P`,
      name: `Produto ${id}`,
      categoryId,
      price: Math.round(priceReais * 100),
      status: "ACTIVE",
    },
  });
  const variant = await prisma.productVariant.create({
    data: { productId: product.id, sku: `${id}-V`, attributes: { tamanho: "M" } },
  });
  return { product, variant };
}

export async function createTestParent() {
  const id = uniqueId();
  const customer = await prisma.customer.create({
    data: {
      name: `Responsável ${id}`,
      phone: `8599999${counter.toString().padStart(4, "0")}`,
      parent: { create: { passwordHash: await hashPassword("senha123") } },
    },
    include: { parent: true },
  });
  return { customer, parent: customer.parent! };
}

export async function createTestGiftList(params: {
  storeId: string;
  consultantId: string;
  parentId: string;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "CANCELLED";
  visibility?: "PUBLIC_LINK" | "PIN_PROTECTED" | "PRIVATE";
  accessPin?: string;
}) {
  const id = uniqueId();
  const baby = await prisma.baby.create({ data: { name: `Bebê ${id}`, sex: "NOT_INFORMED" } });
  const giftList = await prisma.giftList.create({
    data: {
      publicId: id.toUpperCase(),
      slug: id,
      title: `Lista de teste ${id}`,
      babyId: baby.id,
      storeId: params.storeId,
      consultantId: params.consultantId,
      status: params.status ?? "ACTIVE",
      visibility: params.visibility ?? "PUBLIC_LINK",
      accessPin: params.accessPin,
      parents: { create: { parentId: params.parentId, relationship: "MOTHER", isPrimary: true } },
    },
  });
  return { baby, giftList };
}

export async function createTestGiftListItem(params: {
  giftListId: string;
  productId: string;
  variantId?: string | null;
  desiredQuantity: number;
  purchasedQuantity?: number;
  reservedQuantity?: number;
}) {
  return prisma.giftListItem.create({
    data: {
      giftListId: params.giftListId,
      productId: params.productId,
      variantId: params.variantId ?? null,
      desiredQuantity: params.desiredQuantity,
      purchasedQuantity: params.purchasedQuantity ?? 0,
      reservedQuantity: params.reservedQuantity ?? 0,
    },
  });
}

export async function setInventory(storeId: string, productVariantId: string, physicalQuantity: number) {
  return prisma.inventory.create({ data: { storeId, productVariantId, physicalQuantity } });
}

/** Apaga, em ordem segura para as foreign keys, tudo criado a partir de um conjunto de IDs de teste. */
export async function cleanupGiftList(giftListId: string) {
  const list = await prisma.giftList.findUnique({ where: { id: giftListId }, select: { babyId: true } });
  const orders = await prisma.order.findMany({ where: { giftListId }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);

  await prisma.giftMessage.deleteMany({ where: { giftListId } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { giftListId } });
  await prisma.reservation.deleteMany({ where: { giftListItem: { giftListId } } });
  await prisma.giftListParent.deleteMany({ where: { giftListId } });
  await prisma.giftListItem.deleteMany({ where: { giftListId } });
  await prisma.giftList.delete({ where: { id: giftListId } });
  if (list) await prisma.baby.delete({ where: { id: list.babyId } });
}

export async function cleanupParent(parentId: string) {
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { customerId: true } });
  if (!parent) return;
  await prisma.parent.delete({ where: { id: parentId } });
  await prisma.customer.delete({ where: { id: parent.customerId } });
}

export async function cleanupProduct(productId: string) {
  await prisma.inventory.deleteMany({ where: { productVariant: { productId } } });
  await prisma.productVariant.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });
}

export async function cleanupStaff(userId: string) {
  await prisma.userPermission.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

export async function cleanupStore(storeId: string) {
  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.store.delete({ where: { id: storeId } });
}
