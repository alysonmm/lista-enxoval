import Link from "next/link";

import { requireParentPage } from "@/lib/auth/current-user";
import { logoutParentAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const NAV: { href: string; label: string }[] = [
  { href: "/pais", label: "Visão geral" },
  { href: "/pais/lista", label: "Minha lista" },
  { href: "/pais/presentes", label: "Presentes recebidos" },
  { href: "/pais/faltantes", label: "Itens faltantes" },
  { href: "/pais/compartilhar", label: "Compartilhar" },
  { href: "/pais/beneficios", label: "Benefícios" },
  { href: "/pais/configuracoes", label: "Configurações" },
];

export default async function ParentProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireParentPage();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Ponto das Crianças</p>
            <p className="text-xs text-muted-foreground">Olá, {session.name.split(" ")[0]}</p>
          </div>
          <form action={logoutParentAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
