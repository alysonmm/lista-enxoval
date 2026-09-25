import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/checkout/auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
  cc_rejected_bad_filled_card_number: "Número do cartão inválido.",
  cc_rejected_bad_filled_security_code: "Código de segurança inválido.",
  cc_rejected_bad_filled_date: "Data de validade inválida.",
  cc_rejected_call_for_authorize: "O banco pediu para autorizar o pagamento antes — entre em contato com ele.",
  cc_rejected_card_disabled: "Cartão desabilitado — entre em contato com o banco.",
  cc_rejected_high_risk: "O pagamento foi recusado por segurança. Tente outro cartão ou o Pix.",
};

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      giftList: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order || order.giftList.slug !== slug || order.channel !== "ONLINE") notFound();

  if (order.paymentStatus === "APPROVED") {
    redirect(`/lista/${slug}/checkout/confirmado?order=${orderId}`);
  }

  const latestPayment = order.payments[0] ?? null;

  if (latestPayment?.status === "REJECTED") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="size-12 text-destructive" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Pagamento recusado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {REJECTION_MESSAGES[latestPayment.notes ?? ""] ??
              "Não foi possível aprovar o pagamento. Você pode tentar novamente com outro cartão ou com Pix."}
          </p>
        </div>
        <Card className="w-full">
          <CardContent className="p-4">
            <Button asChild size="lg" className="w-full">
              <Link href={`/lista/${slug}/checkout/pagamento?order=${orderId}`}>Tentar novamente</Link>
            </Button>
          </CardContent>
        </Card>
        <Link href={`/lista/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <AutoRefresh intervalMs={4000} />
      <Clock className="size-12 animate-pulse text-primary" />
      <div>
        <h1 className="text-xl font-bold text-foreground">Confirmando seu pagamento…</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {latestPayment?.method === "PIX"
            ? "Assim que o Pix for compensado (geralmente poucos segundos), esta página atualiza sozinha."
            : "Isso deve levar só um instante. Esta página atualiza sozinha."}
        </p>
      </div>
      <Link href={`/lista/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
        Você pode fechar esta página — avisamos a loja assim que confirmar
      </Link>
    </div>
  );
}
