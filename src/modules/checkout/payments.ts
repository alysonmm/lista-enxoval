import "server-only";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { fetchMercadoPagoPayment, mapPaymentMethod, mapPaymentStatus } from "@/lib/mercadopago";

/**
 * Ponto único que grava no nosso banco o resultado de um pagamento do
 * Mercado Pago (chamado pelo webhook). Sempre busca o pagamento pela API
 * usando o id — nunca confia em valores (status, valor) vindos direto da
 * notificação, que qualquer um pode forjar.
 *
 * Idempotente: reprocessar a mesma notificação (o Mercado Pago reenvia em
 * caso de falha) não duplica Payment nem aprova o pedido mais de uma vez.
 */
export async function syncOrderPaymentFromMercadoPago(paymentId: string): Promise<void> {
  const mpPayment = await fetchMercadoPagoPayment(paymentId);
  const orderId = mpPayment.external_reference;
  if (!orderId) return;

  const status = mapPaymentStatus(mpPayment.status);
  const method = mapPaymentMethod(mpPayment);
  const providerTransactionId = String(mpPayment.id);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.channel !== "ONLINE") return null;

    let payment = await tx.payment.findFirst({
      where: { orderId, transactions: { some: { provider: "mercadopago", providerTransactionId } } },
    });

    // status_detail guardado em notes só para diagnóstico (ex.: motivo da
    // recusa exibido de volta para o comprador na página de retorno).
    if (!payment) {
      payment = await tx.payment.create({
        data: {
          orderId,
          method,
          status,
          amount: order.total,
          paidAt: status === "APPROVED" ? new Date() : null,
          notes: mpPayment.status_detail ?? null,
        },
      });
    } else if (payment.status !== status) {
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          paidAt: status === "APPROVED" ? new Date() : payment.paidAt,
          notes: mpPayment.status_detail ?? payment.notes,
        },
      });
    }

    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: "mercadopago",
        providerTransactionId,
        type: "WEBHOOK_EVENT",
        status: mpPayment.status ?? "unknown",
        rawPayload: mpPayment as unknown as Prisma.InputJsonValue,
      },
    });

    if (status === "APPROVED" && order.paymentStatus !== "APPROVED") {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "APPROVED" } });
    }

    return { orderId, status };
  });

  if (!result) return;

  await recordAudit({
    actorType: "SYSTEM",
    action: "order.payment_webhook",
    entityType: "Order",
    entityId: result.orderId,
    changes: { provider: "mercadopago", providerTransactionId, status: result.status },
  });
}
