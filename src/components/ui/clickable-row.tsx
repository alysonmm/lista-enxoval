"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { TableRow } from "./table";

interface ClickableRowProps extends ComponentProps<typeof TableRow> {
  href: string;
}

/**
 * Linha de tabela clicável por inteiro. Usa onClick em vez do truque de CSS
 * (::after com position absolute) porque esse truque depende de <tr> ser um
 * containing block válido para descendentes absolutamente posicionados —
 * comportamento inconsistente entre navegadores para elementos de tabela.
 */
function ClickableRow({ href, className, onClick, ...props }: ClickableRowProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, textarea, select, label")) return;
    router.push(href);
  }

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={handleClick}
      {...props}
    />
  );
}

export { ClickableRow };
