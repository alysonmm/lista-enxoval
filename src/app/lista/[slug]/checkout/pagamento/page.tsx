import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { startMercadoPagoPaymentAction } from "@/modules/checkout/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  mp_error: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.",
  mp_not_configured: "O pagamento online ainda não está disponível — fale com a nossa equipe.",
  order_unavailable: "Este pedido não está mais disponível para pagamento.",
};

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { order: orderId, error } = await searchParams;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { giftList: true, items: { include: { product: true, variant: true } } },
  });
  if (!order || order.giftList.slug !== slug || order.channel !== "ONLINE") notFound();

  if (order.paymentStatus === "APPROVED") {
    redirect(`/lista/${slug}/checkout/confirmado?order=${orderId}`);
  }

  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível continuar.") : null;
  const startPaymentWithId = startMercadoPagoPaymentAction.bind(null, orderId);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Falta pouco!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu presente está reservado. Agora é só finalizar o pagamento.
        </p>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do pedido</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.quantity}x {item.product.name}
              </span>
              <span className="font-medium text-foreground">{formatCentsToBRL(item.total)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>{formatCentsToBRL(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <form action={startPaymentWithId} className="flex flex-col gap-3">
        <SubmitButton size="lg">
          <CreditCard className="size-4" /> Pagar com Mercado Pago
        </SubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          Você será levado(a) para uma página segura do Mercado Pago para pagar com cartão de
          crédito, débito ou Pix.
        </p>
      </form>

      <Link
        href={`/lista/${slug}`}
        className="text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
