"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string }[] = [
  { href: "/pais", label: "Visão geral" },
  { href: "/pais/lista", label: "Minha lista" },
  { href: "/pais/presentes", label: "Presentes recebidos" },
  { href: "/pais/faltantes", label: "Itens faltantes" },
  { href: "/pais/compartilhar", label: "Compartilhar" },
  { href: "/pais/beneficios", label: "Benefícios" },
  { href: "/pais/configuracoes", label: "Configurações" },
];

export function ParentNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 pb-2">
      {NAV.map((item) => {
        const isActive = item.href === "/pais" ? pathname === "/pais" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-foreground hover:border-border hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
