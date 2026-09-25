import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicGiftListView } from "@/modules/gift-lists/public";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; item?: string; pin?: string }>;
}) {
  const { slug } = await params;
  const { error, item, pin } = await searchParams;

  const view = await getPublicGiftListView(slug, pin);
  if (view.status !== "ok") notFound();

  return (
    <CheckoutForm
      slug={slug}
      pin={pin}
      listTitle={view.title}
      babyName={view.babyName}
      readOnly={view.readOnly}
      errorCode={error}
      errorItemName={item}
    />
  );
}
