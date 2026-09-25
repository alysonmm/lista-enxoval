"use client";

import { useEffect } from "react";

import { cartStorageKey } from "@/components/cart/cart-context";

export function ClearCartOnMount({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(cartStorageKey(slug));
    } catch {
      // Sem storage disponível — não há carrinho persistido para limpar.
    }
  }, [slug]);

  return null;
}
