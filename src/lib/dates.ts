export const TIME_ZONE = "America/Fortaleza";

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDateOnly(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(value));
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}

/** Formata para o valor esperado por um <input type="date"> (YYYY-MM-DD), no fuso America/Fortaleza. */
export function formatDateForInput(value: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(toDate(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
