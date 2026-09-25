"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Recarrega os dados da página atual (sem navegação/loading cheio) em
 * intervalos regulares — usado enquanto se espera a confirmação
 * assíncrona de um pagamento (o webhook do Mercado Pago, especialmente
 * para Pix, pode levar alguns segundos para chegar).
 */
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
