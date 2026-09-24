import { z } from "zod";

import { babySchema, customerSchema, newParentPasswordSchema } from "@/modules/people/schemas";

export const relationshipEnum = z.enum(["MOTHER", "FATHER", "GUARDIAN"]);
export const visibilityEnum = z.enum(["PUBLIC_LINK", "PIN_PROTECTED", "PRIVATE"]);
export const priorityEnum = z.enum(["NORMAL", "DESIRED", "ESSENTIAL"]);

export const createGiftListSchema = z
  .object({
    title: z.string().trim().min(3, "Informe um título para a lista."),
    storeId: z.string().trim().min(1, "Selecione a unidade responsável."),
    consultantId: z.string().trim().min(1, "Selecione o consultor responsável."),
    visibility: visibilityEnum.default("PUBLIC_LINK"),
    accessPin: z.string().trim().optional(),
    relationship: relationshipEnum,
    customerId: z.string().trim().optional(),
  })
  .merge(babySchema);

/**
 * Quando `customerId` não é informado no formulário, um novo responsável
 * (Customer + Parent) é criado a partir destes campos — validados
 * separadamente pela action, não como parte de `createGiftListSchema`.
 */
export const newResponsibleSchema = customerSchema.merge(newParentPasswordSchema);

export const giftListItemSchema = z.object({
  productId: z.string().trim().min(1, "Selecione um produto."),
  variantId: z.string().trim().optional(),
  desiredQuantity: z.coerce.number().int().min(1, "Informe uma quantidade válida."),
  priority: priorityEnum.default("NORMAL"),
  notes: z.string().trim().optional(),
});

export type GiftListItemInput = z.infer<typeof giftListItemSchema>;

export const updateGiftListItemSchema = z.object({
  desiredQuantity: z.coerce.number().int().min(0, "Informe uma quantidade válida."),
  priority: priorityEnum,
  notes: z.string().trim().optional(),
});

export const updateGiftListSchema = z.object({
  title: z.string().trim().min(3, "Informe um título para a lista."),
  storeId: z.string().trim().min(1),
  consultantId: z.string().trim().min(1),
  visibility: visibilityEnum,
  accessPin: z.string().trim().optional(),
  showPublicProgress: z.boolean().default(false),
  showGiftValuesToParents: z.boolean().default(false),
});

/** Um option value de item combina produto e variação: "<productId>::<variantId|>" */
export function encodeProductOption(productId: string, variantId?: string | null): string {
  return `${productId}::${variantId ?? ""}`;
}

export function decodeProductOption(value: string): { productId: string; variantId: string | null } {
  const [productId, variantId] = value.split("::");
  return { productId: productId ?? "", variantId: variantId ? variantId : null };
}
