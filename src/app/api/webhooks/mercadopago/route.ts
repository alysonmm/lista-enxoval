import { NextResponse, type NextRequest } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

import { syncOrderPaymentFromMercadoPago } from "@/modules/checkout/payments";

/**
 * Webhook do Mercado Pago — notificado a cada mudança de status de um
 * pagamento (essencial para o Pix, confirmado de forma assíncrona minutos
 * depois do checkout, bem depois de o comprador ter saído da nossa página).
 *
 * A verificação de assinatura é obrigatória: sem MERCADOPAGO_WEBHOOK_SECRET
 * configurada, este endpoint se recusa a processar qualquer notificação —
 * do contrário, qualquer um que descubra esta URL poderia forjar um aviso
 * de "pagamento aprovado" para qualquer pedido.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { type?: string; data?: { id?: string } } | null;
  if (!body || body.type !== "payment") {
    // Outros tópicos (merchant_order, etc.) não nos interessam.
    return NextResponse.json({ received: true });
  }

  const dataId = request.nextUrl.searchParams.get("data.id") ?? body.data?.id ?? null;
  if (!dataId) return NextResponse.json({ error: "missing_data_id" }, { status: 400 });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("MERCADOPAGO_WEBHOOK_SECRET não configurada — recusando processar webhook do Mercado Pago.");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: request.nextUrl.searchParams.get("data.id"),
      secret,
      toleranceSeconds: 300,
    });
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      console.error("Assinatura inválida no webhook do Mercado Pago:", e.reason);
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
    throw e;
  }

  await syncOrderPaymentFromMercadoPago(dataId);

  return NextResponse.json({ received: true });
}
