import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { logoutStaffAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import type { StaffRole } from "@prisma/client";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listas", label: "Listas" },
  { href: "/admin/vendas", label: "Vendas" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/vendedores", label: "Funcionários" },
  { href: "/admin/unidades", label: "Unidades" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

function roleLabel(role: StaffRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "MANAGER":
      return "Gerente";
    case "SELLER":
      return "Vendedor / Consultor de Enxoval";
    default:
      return role;
  }
}

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffPage();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-4 sm:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-foreground">Ponto das Crianças</p>
          <p className="text-xs text-muted-foreground">Painel administrativo</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-medium text-foreground">{session.name}</p>
          <p className="px-2 pb-2 text-xs text-muted-foreground">{roleLabel(session.role)}</p>
          <form action={logoutStaffAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-background p-4 sm:p-6">{children}</main>
    </div>
  );
}
