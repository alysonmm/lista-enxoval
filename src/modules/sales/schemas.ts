import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "CASH",
  "PIX",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "STORE_FINANCING",
  "OTHER",
]);

export const inStoreSaleSchema = z.object({
  giftListItemId: z.string().trim().min(1, "Selecione um produto."),
  quantity: z.coerce.number().int().min(1, "Informe uma quantidade válida."),
  unitPrice: z.coerce.number().min(0, "Informe um preço válido."),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: paymentMethodEnum,
  buyerName: z.string().trim().min(2, "Informe o nome de quem está presenteando."),
  buyerPhone: z.string().trim().optional(),
  hideBuyerFromParents: z.boolean().default(false),
  buyerMessage: z.string().trim().optional(),
  pdvSaleNumber: z.string().trim().optional(),
  couponNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type InStoreSaleInput = z.infer<typeof inStoreSaleSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo do cancelamento."),
});

export const markOrderPaidSchema = z.object({
  paymentMethod: paymentMethodEnum,
});
