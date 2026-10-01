import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicGiftListView } from "@/modules/gift-lists/public";
import { CartBadge } from "@/components/cart/cart-badge";
import { PublicGiftGrid } from "@/components/gift-list/public-gift-grid";
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

export default async function PublicGiftListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pin?: string; categoria?: string; preco?: string }>;
}) {
  const { slug } = await params;
  const { pin, categoria, preco } = await searchParams;

  const view = await getPublicGiftListView(slug, pin);

  if (view.status === "not_found") notFound();

  if (view.status === "requires_pin" || view.status === "invalid_pin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-lista-enxoval.webp"
            alt="Lista de Enxoval — Ponto das Crianças"
            width={1851}
            height={850}
            className="mx-auto mb-4 h-auto w-44"
          />
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

  const heading = view.babyName ? `Enxoval da ${view.babyName}` : view.title;

  return (
    <div className="min-h-screen pb-16">
      <header className="border-b border-border bg-card px-4 py-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-lista-enxoval.webp"
          alt="Lista de Enxoval — Ponto das Crianças"
          width={1851}
          height={850}
          className="mx-auto mb-4 h-auto w-48 sm:w-56"
        />
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

      <PublicGiftGrid items={view.items} initialCategory={categoria} initialPrice={preco} />
      <CartBadge slug={slug} pin={pin} />
    </div>
  );
}
