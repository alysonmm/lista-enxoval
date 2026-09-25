"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { useCart } from "@/components/cart/cart-context";
import { formatCentsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const pin = useSearchParams().get("pin") ?? undefined;
  const { lines, subtotal, removeItem, setQuantity } = useCart();

  const listHref = `/lista/${slug}${pin ? `?pin=${pin}` : ""}`;
  const checkoutHref = `/lista/${slug}/checkout${pin ? `?pin=${pin}` : ""}`;

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <ShoppingCart className="size-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Seu carrinho está vazio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Volte para a lista e escolha os presentes que quer dar.
          </p>
        </div>
        <Button asChild>
          <Link href={listHref}>Ver a lista de presentes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-32">
      <Link
        href={listHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Continuar escolhendo presentes
      </Link>

      <h1 className="mb-4 text-2xl font-bold text-foreground">Seu carrinho</h1>

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <Card key={line.itemId}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt={line.productName} className="size-full object-cover" />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{line.productName}</p>
                {line.variantLabel && (
                  <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                )}
                <p className="text-sm font-semibold text-foreground">
                  {formatCentsToBRL(line.price)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => removeItem(line.itemId)}
                  aria-label={`Remover ${line.productName} do carrinho`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="flex items-center gap-1 rounded-md border border-input">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.itemId, line.quantity - 1)}
                    disabled={line.quantity <= 1}
                    aria-label="Diminuir quantidade"
                    className="flex size-7 items-center justify-center text-foreground disabled:opacity-30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-medium">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.itemId, line.quantity + 1)}
                    aria-label="Aumentar quantidade"
                    className="flex size-7 items-center justify-center text-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatCentsToBRL(subtotal)}</p>
          </div>
          <Button asChild size="lg" className="flex-1 sm:flex-none">
            <Link href={checkoutHref}>Ir para o checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
