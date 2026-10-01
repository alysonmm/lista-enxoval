"use client";

import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";

import type { PublicGiftListItem } from "@/modules/gift-lists/public";
import { formatCentsToBRL } from "@/lib/money";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

/**
 * Faixas do filtro de preço, em centavos. O limite inferior é exclusivo e o
 * superior inclusivo: um item de R$ 50,00 cai em "Até R$ 50".
 */
const PRICE_RANGES = [
  { id: "ate-50", label: "Até R$ 50", min: -Infinity, max: 5000 },
  { id: "50-100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { id: "100-200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { id: "200-500", label: "R$ 200 a R$ 500", min: 20000, max: 50000 },
  { id: "acima-500", label: "Acima de R$ 500", min: 50000, max: Infinity },
] as const;

type PriceRange = (typeof PRICE_RANGES)[number];

function inRange(price: number, range: PriceRange) {
  return price > range.min && price <= range.max;
}

/**
 * Grade de produtos da página pública com filtros de categoria e faixa de
 * preço. O filtro roda no navegador (instantâneo, sem recarregar a página) e
 * fica refletido na URL (?categoria=&preco=) para sobreviver a um refresh ou
 * ao "voltar" do carrinho.
 */
export function PublicGiftGrid({
  items,
  initialCategory,
  initialPrice,
}: {
  items: PublicGiftListItem[];
  initialCategory?: string;
  initialPrice?: string;
}) {
  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of items) names.set(item.category.slug, item.category.name);
    return [...names]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  // Só oferece as faixas que têm pelo menos um produto nesta lista.
  const priceRanges = useMemo(
    () => PRICE_RANGES.filter((range) => items.some((item) => inRange(item.price, range))),
    [items],
  );

  const [category, setCategory] = useState(() =>
    categories.some((c) => c.slug === initialCategory) ? initialCategory! : "",
  );
  const [price, setPrice] = useState(() =>
    priceRanges.some((r) => r.id === initialPrice) ? initialPrice! : "",
  );

  const selectedRange = priceRanges.find((r) => r.id === price);
  const filteredItems = items.filter(
    (item) =>
      (!category || item.category.slug === category) &&
      (!selectedRange || inRange(item.price, selectedRange)),
  );
  const hasFilters = category !== "" || price !== "";

  function applyFilters(nextCategory: string, nextPrice: string) {
    setCategory(nextCategory);
    setPrice(nextPrice);
    // Atualiza só a URL (sem nova requisição ao servidor), preservando os
    // demais parâmetros — como o ?pin= das listas protegidas.
    const params = new URLSearchParams(window.location.search);
    params.delete("filtro");
    if (nextCategory) params.set("categoria", nextCategory);
    else params.delete("categoria");
    if (nextPrice) params.set("preco", nextPrice);
    else params.delete("preco");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-muted-foreground">
        Esta lista ainda não tem produtos.
      </p>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4">
          <div className="min-w-0 flex-1 sm:max-w-60">
            <Select
              aria-label="Filtrar por categoria"
              value={category}
              onChange={(event) => applyFilters(event.target.value, price)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1 sm:max-w-60">
            <Select
              aria-label="Filtrar por faixa de preço"
              value={price}
              onChange={(event) => applyFilters(category, event.target.value)}
            >
              <option value="">Todos os preços</option>
              {priceRanges.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-1">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {filteredItems.length} {filteredItems.length === 1 ? "presente" : "presentes"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasFilters}
              onClick={() => applyFilters("", "")}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

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
                  Indisponível no momento
                </Button>
              )}
            </div>
          </article>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">Nenhum presente encontrado com esses filtros.</p>
            <Button type="button" variant="outline" onClick={() => applyFilters("", "")}>
              Limpar filtros
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
