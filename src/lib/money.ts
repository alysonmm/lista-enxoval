const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em centavos (inteiro) para o formato de moeda brasileira. */
export function formatCentsToBRL(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/** Converte um valor decimal (ex.: de um <input type="number" step="0.01">) para centavos. */
export function reaisToCents(value: string | number): number {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Converte centavos para um valor decimal, útil para preencher inputs numéricos. */
export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}
