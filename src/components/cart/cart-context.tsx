"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  itemId: string;
  productName: string;
  variantLabel: string | null;
  image: string | null;
  /** Preço em centavos, só para exibição — o servidor sempre recalcula o preço real no checkout. */
  price: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isInCart: (itemId: string) => boolean;
  addItem: (item: Omit<CartLine, "quantity">) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const MAX_QUANTITY_PER_LINE = 20;

export function cartStorageKey(slug: string) {
  return `enxoval:cart:${slug}`;
}

function readCart(slug: string): CartLine[] {
  try {
    const raw = localStorage.getItem(cartStorageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        line && typeof line.itemId === "string" && typeof line.quantity === "number",
    );
  } catch {
    return [];
  }
}

function writeCart(slug: string, lines: CartLine[]) {
  try {
    localStorage.setItem(cartStorageKey(slug), JSON.stringify(lines));
  } catch {
    // Armazenamento indisponível (modo privado, cota excedida, etc.) — a
    // sessão em memória continua funcionando, só não persiste ao recarregar.
  }
}

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(readCart(slug));
  }, [slug]);

  const update = useCallback(
    (next: CartLine[]) => {
      setLines(next);
      writeCart(slug, next);
    },
    [slug],
  );

  const addItem = useCallback<CartContextValue["addItem"]>(
    (item) => {
      setLines((current) => {
        const existing = current.find((line) => line.itemId === item.itemId);
        const next = existing
          ? current.map((line) =>
              line.itemId === item.itemId
                ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QUANTITY_PER_LINE) }
                : line,
            )
          : [...current, { ...item, quantity: 1 }];
        writeCart(slug, next);
        return next;
      });
    },
    [slug],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    (itemId) => {
      setLines((current) => {
        const next = current.filter((line) => line.itemId !== itemId);
        writeCart(slug, next);
        return next;
      });
    },
    [slug],
  );

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    (itemId, quantity) => {
      setLines((current) => {
        const clamped = Math.max(1, Math.min(quantity, MAX_QUANTITY_PER_LINE));
        const next = current.map((line) =>
          line.itemId === itemId ? { ...line, quantity: clamped } : line,
        );
        writeCart(slug, next);
        return next;
      });
    },
    [slug],
  );

  const clear = useCallback(() => update([]), [update]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      isInCart: (itemId) => lines.some((line) => line.itemId === itemId),
      addItem,
      removeItem,
      setQuantity,
      clear,
    };
  }, [lines, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de um <CartProvider>.");
  return ctx;
}
