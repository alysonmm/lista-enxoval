import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, ImageOff } from "lucide-react";
import type { Metadata } from "next";

import { getPublicGiftListView } from "@/modules/gift-lists/public";
import { formatCentsToBRL } from "@/lib/money";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { CartBadge } from "@/components/cart/cart-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const view = await getPublicGiftListView(slug);

  const base: Metadata = {
    robots: { index: false, follow: false },
  };

  if (view.status !== "ok") {
    return { ...base, title: "Lista de Enxoval | Ponto das Crianças" };
  }

  const title = view.babyName ? `Enxoval da ${view.babyName}` : view.title;
  return {
    ...base,
    title: `${title} | Ponto das Crianças`,
    description: view.message ?? "Presenteie com carinho pela Ponto das Crianças.",
    openGraph: {
      title,
      description: view.message ?? undefined,
      images: view.photoUrl ? [view.photoUrl] : undefined,
    },
  };
}

type Filter = "todos" | "disponiveis";

function FilterTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
          : "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </Link>
  );
}

export default async function PublicGiftListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pin?: string; filtro?: string }>;
}) {
  const { slug } = await params;
  const { pin, filtro } = await searchParams;

  const view = await getPublicGiftListView(slug, pin);

  if (view.status === "not_found") notFound();

  if (view.status === "requires_pin" || view.status === "invalid_pin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <Heart className="mx-auto mb-4 size-8 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Lista protegida</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite o PIN que você recebeu para ver esta lista de presentes.
          </p>
          <form method="GET" className="mt-6 flex flex-col gap-3">
            <input
              name="pin"
              inputMode="numeric"
              autoFocus
              placeholder="PIN"
              className="rounded-md border border-input bg-card px-3 py-2 text-center text-lg tracking-widest shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {view.status === "invalid_pin" && (
              <p className="text-sm text-destructive">PIN incorreto. Tente novamente.</p>
            )}
            <SubmitButton>Acessar lista</SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  const filter: Filter = filtro === "disponiveis" ? "disponiveis" : "todos";
  const filteredItems = view.items.filter((item) => {
    if (filter === "disponiveis") return item.canPurchase;
    return true;
  });

  const heading = view.babyName ? `Enxoval da ${view.babyName}` : view.title;

  return (
    <div className="min-h-screen pb-16">
      <header className="border-b border-border bg-card px-4 py-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Ponto das Crianças" className="mx-auto mb-3 size-12 rounded-full" />
        {view.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.photoUrl}
            alt={heading}
            className="mx-auto mb-4 size-24 rounded-full object-cover shadow-sm"
          />
        )}
        <h1 className="text-2xl font-extrabold text-foreground">{heading}</h1>
        {view.message && (
          <p className="mx-auto mt-2 max-w-md text-balance text-sm text-muted-foreground">
            {view.message}
          </p>
        )}
        {view.progressPercent !== null && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${view.progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{view.progressPercent}% concluído</p>
          </div>
        )}
        {view.readOnly && (
          <p className="mx-auto mt-4 max-w-xs rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Esta lista não está mais recebendo novos presentes no momento.
          </p>
        )}
      </header>

      <nav className="sticky top-0 z-10 flex justify-center gap-1 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <FilterTab href={`/lista/${slug}`} label="Todos" active={filter === "todos"} />
        <FilterTab
          href={`/lista/${slug}?filtro=disponiveis`}
          label="Disponíveis"
          active={filter === "disponiveis"}
        />
      </nav>

      <main className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <div className="flex aspect-square items-center justify-center bg-muted">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.productName} className="size-full object-cover" />
              ) : (
                <ImageOff className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              {item.priorityLabel && (
                <Badge variant={item.priorityLabel === "Item essencial" ? "warning" : "accent"} className="self-start">
                  {item.priorityLabel}
                </Badge>
              )}
              <h2 className="font-semibold leading-snug text-foreground">{item.productName}</h2>
              {item.variantLabel && (
                <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
              )}
              {item.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-lg font-bold text-foreground">
                  {formatCentsToBRL(item.price)}
                </span>
              </div>
              {item.canPurchase ? (
                <AddToCartButton
                  itemId={item.id}
                  productName={item.productName}
                  variantLabel={item.variantLabel}
                  image={item.image}
                  price={item.price}
                />
              ) : (
                <Button disabled variant="secondary" className="mt-1 w-full">
                  ✓ Presente já garantido
                </Button>
              )}
            </div>
          </article>
        ))}
        {filteredItems.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">
            Nenhum produto encontrado neste filtro.
          </p>
        )}
      </main>
      <CartBadge slug={slug} pin={pin} />
    </div>
  );
}
