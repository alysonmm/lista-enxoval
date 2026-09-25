import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { ClearCartOnMount } from "@/components/cart/clear-cart-on-mount";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CheckoutConfirmedPage({
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
      items: { include: { product: true, variant: true } },
    },
  });
  if (!order || order.giftList.slug !== slug || order.channel !== "ONLINE") notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <ClearCartOnMount slug={slug} />
      <CheckCircle2 className="size-14 text-success" />
      <div>
        <h1 className="text-xl font-bold text-foreground">Presente confirmado!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Obrigado por presentear {order.giftList.title}. Nossa equipe vai combinar com você a
          forma de pagamento e a retirada ou entrega.
        </p>
      </div>

      <Card className="w-full text-left">
        <CardHeader>
          <CardTitle className="text-base">
            Pedido #{order.sequentialNumber.toString().padStart(6, "0")}
          </CardTitle>
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

      <Button asChild variant="secondary">
        <Link href={`/lista/${slug}`}>Voltar para a lista</Link>
      </Button>
    </div>
  );
}
