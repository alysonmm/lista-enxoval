"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reaisToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { getClientIp, getStaffSession } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { saveImageUpload, UploadError } from "@/lib/storage";
import {
  categorySchema,
  inventoryAdjustmentSchema,
  parseImagesTextarea,
  productSchema,
  productVariantSchema,
  storeSchema,
} from "./schemas";

async function requireAdmin() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin?error=forbidden");
  return session;
}

function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

// ---------------------------------------------------------------------------
// Unidades (Store)
// ---------------------------------------------------------------------------

export async function createStoreAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = storeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect("/admin/unidades/nova?error=invalid_input");

  let store;
  try {
    store = await prisma.store.create({ data: parsed.data });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect("/admin/unidades/nova?error=duplicate_code");
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "store.create",
    entityType: "Store",
    entityId: store.id,
    changes: parsed.data,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/unidades");
  redirect("/admin/unidades");
}

export async function updateStoreAction(storeId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = storeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect(`/admin/unidades/${storeId}?error=invalid_input`);

  try {
    await prisma.store.update({ where: { id: storeId }, data: parsed.data });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect(`/admin/unidades/${storeId}?error=duplicate_code`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "store.update",
    entityType: "Store",
    entityId: storeId,
    changes: parsed.data,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/unidades");
  redirect("/admin/unidades");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function createCategoryAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    parentCategoryId: formData.get("parentCategoryId") || null,
  });
  if (!parsed.success) redirect("/admin/categorias?error=invalid_input");

  const slug = slugify(parsed.data.name);
  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      parentCategoryId: parsed.data.parentCategoryId || null,
      active: true,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "category.create",
    entityType: "Category",
    entityId: category.id,
    changes: parsed.data,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function createProductAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    brand: formData.get("brand") || undefined,
    price: formData.get("price"),
    promoPrice: formData.get("promoPrice") || undefined,
    images: formData.get("images") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) redirect("/admin/produtos/novo?error=invalid_input");

  const data = parsed.data;
  const imageFile = formData.get("imageFile");
  let uploadedImageUrl: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      uploadedImageUrl = await saveImageUpload(imageFile, "products");
    } catch (e) {
      if (e instanceof UploadError) redirect(`/admin/produtos/novo?error=${e.code}`);
      throw e;
    }
  }
  const images = [...(uploadedImageUrl ? [uploadedImageUrl] : []), ...parseImagesTextarea(data.images)];

  let product;
  try {
    product = await prisma.product.create({
      data: {
        sku: data.sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId,
        brand: data.brand || null,
        price: reaisToCents(data.price),
        promoPrice: data.promoPrice != null ? reaisToCents(data.promoPrice) : null,
        images,
        status: data.status,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect("/admin/produtos/novo?error=duplicate_sku");
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    changes: { sku: data.sku, name: data.name },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${product.id}`);
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = productSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    brand: formData.get("brand") || undefined,
    price: formData.get("price"),
    promoPrice: formData.get("promoPrice") || undefined,
    images: formData.get("images") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) redirect(`/admin/produtos/${productId}?error=invalid_input`);

  const data = parsed.data;
  const imageFile = formData.get("imageFile");
  let uploadedImageUrl: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      uploadedImageUrl = await saveImageUpload(imageFile, "products");
    } catch (e) {
      if (e instanceof UploadError) redirect(`/admin/produtos/${productId}?error=${e.code}`);
      throw e;
    }
  }
  const current = await prisma.product.findUnique({ where: { id: productId }, select: { images: true } });
  const primaryImage = uploadedImageUrl ?? current?.images[0] ?? null;
  const images = [...(primaryImage ? [primaryImage] : []), ...parseImagesTextarea(data.images)];

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sku: data.sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId,
        brand: data.brand || null,
        price: reaisToCents(data.price),
        promoPrice: data.promoPrice != null ? reaisToCents(data.promoPrice) : null,
        images,
        status: data.status,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect(`/admin/produtos/${productId}?error=duplicate_sku`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "product.update",
    entityType: "Product",
    entityId: productId,
    changes: { sku: data.sku, name: data.name },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${productId}`);
  redirect(`/admin/produtos/${productId}?saved=1`);
}

export async function archiveProductAction(productId: string): Promise<void> {
  const session = await requireAdmin();

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "product.archive",
    entityType: "Product",
    entityId: productId,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos");
}

// ---------------------------------------------------------------------------
// Variações
// ---------------------------------------------------------------------------

export async function createProductVariantAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");

  const parsed = productVariantSchema.safeParse({
    productId,
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || undefined,
    size: formData.get("size") || undefined,
    color: formData.get("color") || undefined,
    priceOverride: formData.get("priceOverride") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect(`/admin/produtos/${productId}?error=invalid_input`);

  const data = parsed.data;
  const attributes: Record<string, string> = {};
  if (data.size) attributes.tamanho = data.size;
  if (data.color) attributes.cor = data.color;

  try {
    await prisma.productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        barcode: data.barcode || null,
        attributes: attributes as Prisma.InputJsonValue,
        priceOverride: data.priceOverride != null ? reaisToCents(data.priceOverride) : null,
        active: data.active,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect(`/admin/produtos/${productId}?error=duplicate_sku`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "product_variant.create",
    entityType: "ProductVariant",
    entityId: data.productId,
    changes: { sku: data.sku, attributes },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/produtos/${data.productId}`);
  redirect(`/admin/produtos/${data.productId}`);
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export async function adjustInventoryAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const productId = String(formData.get("redirectProductId") ?? "");

  const parsed = inventoryAdjustmentSchema.safeParse({
    storeId: formData.get("storeId"),
    productVariantId: formData.get("productVariantId"),
    physicalQuantity: formData.get("physicalQuantity"),
  });
  if (!parsed.success) redirect(`/admin/produtos/${productId}?error=invalid_input`);

  const { storeId, productVariantId, physicalQuantity } = parsed.data;

  const inventory = await prisma.inventory.upsert({
    where: { storeId_productVariantId: { storeId, productVariantId } },
    create: { storeId, productVariantId, physicalQuantity },
    update: { physicalQuantity },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "inventory.adjust",
    entityType: "Inventory",
    entityId: inventory.id,
    changes: { storeId, productVariantId, physicalQuantity },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/produtos/${productId}`);
  redirect(`/admin/produtos/${productId}`);
}
