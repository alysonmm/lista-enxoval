import { z } from "zod";

/**
 * Limites do checkout público (qualquer pessoa pode enviar o formulário,
 * sem login). O pedido desconta o estoque na hora, então sem um teto um
 * único envio poderia "segurar" todo o estoque de um item ou estourar o
 * total do pedido. O carrinho já não deixa passar de 20 por item
 * (MAX_QUANTITY_PER_LINE em cart-context.tsx).
 */
export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_ITEMS_PER_ORDER = 50;

export const checkoutOnlineSchema = z
  .object({
    itemIds: z.array(z.string().trim().min(1).max(64)).min(1, "Seu carrinho está vazio.").max(MAX_ITEMS_PER_ORDER),
    quantities: z.array(z.coerce.number().int().min(1).max(MAX_QUANTITY_PER_ITEM)).min(1).max(MAX_ITEMS_PER_ORDER),
    buyerName: z.string().trim().min(2, "Informe seu nome.").max(120),
    buyerPhone: z.string().trim().max(30).optional(),
    // Obrigatório (diferente do cadastro de cliente no admin): o Mercado
    // Pago exige e-mail do pagador para gerar Pix no Checkout Pro.
    buyerEmail: z.string().trim().email("Informe um e-mail válido.").max(200),
    hideBuyerFromParents: z.boolean().default(false),
    message: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.itemIds.length === data.quantities.length, {
    message: "Carrinho inválido.",
  });

export type CheckoutOnlineInput = z.infer<typeof checkoutOnlineSchema>;

// O gerador de mensagem é público e chama uma API paga por tamanho de texto:
// limites de tamanho mantêm o custo de cada chamada pequeno e previsível.
export const generateGiftMessageSchema = z.object({
  babyName: z.string().trim().max(60).nullish(),
  listTitle: z.string().trim().min(1).max(120),
  itemNames: z.array(z.string().trim().min(1).max(150)).min(1).max(20),
  buyerName: z.string().trim().max(120).optional(),
});

export type GenerateGiftMessageInput = z.infer<typeof generateGiftMessageSchema>;
