"use client";

import { Check, ShoppingCart } from "lucide-react";

import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  itemId,
  productName,
  variantLabel,
  image,
  price,
}: {
  itemId: string;
  productName: string;
  variantLabel: string | null;
  image: string | null;
  price: number;
}) {
  const { isInCart, addItem, removeItem } = useCart();
  const inCart = isInCart(itemId);

  if (inCart) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="mt-1 w-full"
        onClick={() => removeItem(itemId)}
      >
        <Check className="size-4" /> No carrinho — remover
      </Button>
    );
  }

  return (
    <Button
      type="button"
      className="mt-1 w-full"
      onClick={() => addItem({ itemId, productName, variantLabel, image, price })}
    >
      <ShoppingCart className="size-4" /> Adicionar ao carrinho
    </Button>
  );
}
