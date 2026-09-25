import { CartProvider } from "@/components/cart/cart-context";

export default async function GiftListLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CartProvider slug={slug}>{children}</CartProvider>;
}
