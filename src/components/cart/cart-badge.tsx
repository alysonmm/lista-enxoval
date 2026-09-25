"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/components/cart/cart-context";
import { formatCentsToBRL } from "@/lib/money";

export function CartBadge({ slug, pin }: { slug: string; pin?: string }) {
  const { count, subtotal } = useCart();

  if (count === 0) return null;

  return (
    <Link
      href={`/lista/${slug}/carrinho${pin ? `?pin=${pin}` : ""}`}
      className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
    >
      <span className="relative">
        <ShoppingCart className="size-5" />
        <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {count}
        </span>
      </span>
      Ver carrinho · {formatCentsToBRL(subtotal)}
    </Link>
  );
}
