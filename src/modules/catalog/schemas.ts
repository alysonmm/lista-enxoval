import { z } from "zod";

export const storeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da unidade."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Informe um código (ex.: PDC1)."),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type StoreInput = z.infer<typeof storeSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  parentCategoryId: z.string().trim().optional().nullable(),
  active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

const productStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]);

export const productSchema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU."),
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(2, "Informe o nome do produto."),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  brand: z.string().trim().optional(),
  price: z.coerce.number().min(0, "Informe um preço válido."),
  promoPrice: z.coerce.number().min(0).optional().nullable(),
  images: z.string().trim().optional(),
  status: productStatusEnum.default("ACTIVE"),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productVariantSchema = z.object({
  productId: z.string().trim().min(1),
  sku: z.string().trim().min(1, "Informe o SKU da variação."),
  barcode: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  active: z.boolean().default(true),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const inventoryAdjustmentSchema = z.object({
  storeId: z.string().trim().min(1, "Selecione a unidade."),
  productVariantId: z.string().trim().min(1, "Selecione a variação."),
  physicalQuantity: z.coerce.number().int().min(0, "Informe uma quantidade válida."),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

/** Converte o texto de imagens (uma URL por linha) em um array, ignorando linhas vazias. */
export function parseImagesTextarea(value?: string): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
