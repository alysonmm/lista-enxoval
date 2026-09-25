import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

import { centsToReais } from "@/lib/money";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function getConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("mercadopago_not_configured");
  return new MercadoPagoConfig({ accessToken });
}

export type PreferenceItemInput = {
  id: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreatePreferenceInput = {
  orderId: string;
  items: PreferenceItemInput[];
  payerEmail?: string | null;
  payerName: string;
  /** Mesma URL para os três casos — a página de retorno decide o que mostrar consultando o pedido no nosso banco, nunca confiando no redirect em si. */
  backUrl: string;
  notificationUrl: string;
};

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

/**
 * Cria uma preferência de Checkout Pro — o comprador é redirecionado para
 * uma página hospedada pelo próprio Mercado Pago para escolher e pagar com
 * cartão de crédito, débito ou Pix. Dados de cartão nunca passam pelo nosso
 * servidor.
 */
export async function createCheckoutPreference(
  input: CreatePreferenceInput,
): Promise<CreatePreferenceResult> {
  const preference = new Preference(getConfig());

  const [firstName, ...rest] = input.payerName.trim().split(/\s+/);
  const surname = rest.join(" ") || undefined;

  const result = await preference.create({
    body: {
      items: input.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        currency_id: "BRL",
        unit_price: centsToReais(item.unitPriceCents),
      })),
      payer: {
        email: input.payerEmail || undefined,
        name: firstName || undefined,
        surname,
      },
      external_reference: input.orderId,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.backUrl,
        pending: input.backUrl,
        failure: input.backUrl,
      },
      auto_return: "approved",
      // Só os três métodos pedidos — sem boleto (liquidação em dias, não
      // combina com "presentear agora") nem saque em caixa eletrônico.
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      },
    },
  });

  if (!result.id || !result.init_point) throw new Error("mercadopago_preference_incomplete");
  return { preferenceId: result.id, initPoint: result.init_point };
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const payment = new Payment(getConfig());
  return payment.get({ id: paymentId });
}

export type MercadoPagoPaymentLike = {
  payment_type_id?: string;
  payment_method_id?: string;
};

export function mapPaymentMethod(mpPayment: MercadoPagoPaymentLike): PaymentMethod {
  if (mpPayment.payment_method_id === "pix") return "PIX";
  if (mpPayment.payment_type_id === "bank_transfer") return "PIX";
  if (mpPayment.payment_type_id === "credit_card") return "CREDIT_CARD";
  if (mpPayment.payment_type_id === "debit_card") return "DEBIT_CARD";
  return "OTHER";
}

export function mapPaymentStatus(mpStatus: string | undefined): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "PROCESSING";
    case "pending":
    default:
      return "PENDING";
  }
}
