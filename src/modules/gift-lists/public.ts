import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * DTO da página pública. A ausência estrutural de qualquer campo de
 * quantidade aqui (desired/purchased/reserved/remaining) É a garantia de
 * privacidade — não um filtro aplicado depois. Nunca adicione esses campos
 * a este tipo. Ver ARCHITECTURE.md § Arquitetura de privacidade e o teste
 * obrigatório em tests/integration/public-list-privacy.test.ts.
 */
export type PublicGiftListItem = {
  id: string;
  productName: string;
  description: string | null;
  image: string | null;
  variantLabel: string | null;
  price: number;
  priorityLabel: "Escolha dos pais" | "Item essencial" | null;
  canPurchase: boolean;
};

export type PublicGiftListView =
  | { status: "not_found" }
  | { status: "requires_pin"; slug: string }
  | { status: "invalid_pin"; slug: string }
  | {
      status: "ok";
      slug: string;
      title: string;
      babyName: string | null;
      message: string | null;
      photoUrl: string | null;
      theme: string | null;
      readOnly: boolean;
      /** Percentual agregado (0-100); nunca as quantidades brutas por trás dele. */
      progressPercent: number | null;
      items: PublicGiftListItem[];
    };

const PRIORITY_LABEL: Record<string, PublicGiftListItem["priorityLabel"]> = {
  NORMAL: null,
  DESIRED: "Escolha dos pais",
  ESSENTIAL: "Item essencial",
};

function variantLabel(attributes: unknown): string | null {
  if (!attributes || typeof attributes !== "object") return null;
  const parts = Object.values(attributes as Record<string, string>).filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : null;
}

export async function getPublicGiftListView(slug: string, pin?: string): Promise<PublicGiftListView> {
  const list = await prisma.giftList.findUnique({
    where: { slug },
    include: {
      baby: true,
      items: {
        where: { active: true },
        include: { product: true, variant: { include: { inventory: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!list || list.deletedAt) return { status: "not_found" };
  if (list.status === "DRAFT" || list.status === "CANCELLED") return { status: "not_found" };
  if (list.visibility === "PRIVATE") return { status: "not_found" };
  if (list.visibility === "PIN_PROTECTED") {
    if (!pin) return { status: "requires_pin", slug };
    if (pin !== list.accessPin) return { status: "invalid_pin", slug };
  }

  const readOnly = list.status === "PAUSED" || list.status === "CLOSED";

  const items: PublicGiftListItem[] = list.items.map((item) => {
    const availableInList = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
    let canPurchase = !readOnly && availableInList > 0;
    if (canPurchase && item.variant) {
      const totalStock = item.variant.inventory.reduce(
        (sum, inv) => sum + Math.max(inv.physicalQuantity - inv.reservedQuantity, 0),
        0,
      );
      canPurchase = totalStock > 0;
    }
    return {
      id: item.id,
      productName: item.product.name,
      description: item.product.description,
      image: item.product.images[0] ?? null,
      variantLabel: variantLabel(item.variant?.attributes),
      price: item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price,
      priorityLabel: PRIORITY_LABEL[item.priority] ?? null,
      canPurchase,
    };
  });

  let progressPercent: number | null = null;
  if (list.showPublicProgress) {
    const totalDesired = list.items.reduce((sum, i) => sum + i.desiredQuantity, 0);
    const totalPurchased = list.items.reduce((sum, i) => sum + i.purchasedQuantity, 0);
    progressPercent = totalDesired > 0 ? Math.round((totalPurchased / totalDesired) * 100) : 0;
  }

  return {
    status: "ok",
    slug: list.slug,
    title: list.title,
    babyName: list.baby.nameUndefined ? null : list.baby.name,
    message: list.baby.message,
    photoUrl: list.baby.photoUrl,
    theme: list.baby.theme,
    readOnly,
    progressPercent,
    items,
  };
}

export async function getActiveStoresForPublicDisplay() {
  return prisma.store.findMany({
    where: { active: true },
    select: { name: true, address: true, phone: true },
    orderBy: { name: "asc" },
  });
}
