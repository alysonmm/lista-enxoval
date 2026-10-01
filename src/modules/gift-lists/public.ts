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
  /** Categoria principal do produto (a categoria-pai, quando ele está numa subcategoria). */
  category: { slug: string; name: string };
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
        include: {
          product: { include: { category: { include: { parentCategory: true } } } },
          variant: { include: { inventory: true } },
        },
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

  // Itens fora da faixa de preço da lista (quando configurada) não entram
  // na página pública nem no cálculo de progresso — a faixa define o que
  // efetivamente chega ao comprador, não só uma exibição cosmética.
  const visibleItems = list.items.filter((item) => {
    const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
    if (list.minPriceCents != null && price < list.minPriceCents) return false;
    if (list.maxPriceCents != null && price > list.maxPriceCents) return false;
    return true;
  });

  const items: PublicGiftListItem[] = visibleItems.map((item) => {
    // Atingir a quantidade desejada não bloqueia a compra: o item continua
    // disponível para outros convidados. Só deixa de ser comprável quando a
    // lista não aceita mais presentes ou quando a variação está sem estoque.
    let canPurchase = !readOnly;
    if (canPurchase && item.variant) {
      const totalStock = item.variant.inventory.reduce(
        (sum, inv) => sum + Math.max(inv.physicalQuantity - inv.reservedQuantity, 0),
        0,
      );
      canPurchase = totalStock > 0;
    }
    const category = item.product.category.parentCategory ?? item.product.category;
    return {
      id: item.id,
      productName: item.product.name,
      description: item.product.description,
      image: item.product.images[0] ?? null,
      variantLabel: variantLabel(item.variant?.attributes),
      price: item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price,
      priorityLabel: PRIORITY_LABEL[item.priority] ?? null,
      category: { slug: category.slug, name: category.name },
      canPurchase,
    };
  });

  let progressPercent: number | null = null;
  if (list.showPublicProgress) {
    // Compras além do desejado não contam a mais: o progresso mede quanto do
    // que os pais pediram já foi presenteado e nunca passa de 100%.
    const totalDesired = visibleItems.reduce((sum, i) => sum + i.desiredQuantity, 0);
    const totalFulfilled = visibleItems.reduce(
      (sum, i) => sum + Math.min(i.purchasedQuantity, i.desiredQuantity),
      0,
    );
    progressPercent = totalDesired > 0 ? Math.round((totalFulfilled / totalDesired) * 100) : 0;
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
