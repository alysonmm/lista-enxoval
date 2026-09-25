import { z } from "zod";

export const checkoutOnlineSchema = z
  .object({
    itemIds: z.array(z.string().trim().min(1)).min(1, "Seu carrinho está vazio."),
    quantities: z.array(z.coerce.number().int().min(1)).min(1),
    buyerName: z.string().trim().min(2, "Informe seu nome."),
    buyerPhone: z.string().trim().optional(),
    // Obrigatório (diferente do cadastro de cliente no admin): o Mercado
    // Pago exige e-mail do pagador para gerar Pix no Checkout Pro.
    buyerEmail: z.string().trim().email("Informe um e-mail válido."),
    hideBuyerFromParents: z.boolean().default(false),
    message: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.itemIds.length === data.quantities.length, {
    message: "Carrinho inválido.",
  });

export type CheckoutOnlineInput = z.infer<typeof checkoutOnlineSchema>;

export const generateGiftMessageSchema = z.object({
  babyName: z.string().trim().optional(),
  listTitle: z.string().trim().min(1),
  itemNames: z.array(z.string().trim().min(1)).min(1).max(20),
  buyerName: z.string().trim().optional(),
});

export type GenerateGiftMessageInput = z.infer<typeof generateGiftMessageSchema>;
