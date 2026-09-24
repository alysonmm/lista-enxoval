import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

import { getActiveStoresForPublicDisplay, getPublicGiftListView } from "@/modules/gift-lists/public";
import { formatCentsToBRL } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PresentearPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const view = await getPublicGiftListView(slug);
  if (view.status !== "ok") notFound();

  const item = view.items.find((i) => i.id === itemId);
  if (!item || !item.canPurchase) notFound();

  const stores = await getActiveStoresForPublicDisplay();

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <Link
        href={`/lista/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para a lista
      </Link>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">{item.productName}</h1>
            {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
            <p className="mt-1 text-lg font-bold text-foreground">{formatCentsToBRL(item.price)}</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-2 text-base font-semibold text-foreground">Como presentear</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Por enquanto, finalize esse presente em qualquer uma das nossas lojas — é rapidinho! Leve o
        nome do bebê ou o código da lista, e nossa equipe cuida do resto.
      </p>

      <div className="flex flex-col gap-3">
        {stores.map((store) => (
          <Card key={store.name}>
            <CardContent className="flex flex-col gap-1 p-4">
              <p className="font-medium text-foreground">{store.name}</p>
              {store.address && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {store.address}
                </p>
              )}
              {store.phone && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" /> {store.phone}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {stores.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Fale com a Ponto das Crianças para saber como presentear.
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Em breve você também poderá presentear por aqui mesmo, com Pix ou cartão.
      </p>
    </div>
  );
}
