import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { logoutStaffAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { AdminNavLinks } from "./admin-nav";
import type { StaffRole } from "@prisma/client";

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
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Header mobile: a sidebar fica oculta abaixo do breakpoint sm, então o
          menu (e o logout) precisam de um ponto de acesso alternativo aqui. */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ponto das Crianças" className="size-9 rounded-full" />
          <span className="text-sm font-semibold text-foreground">Ponto das Crianças</span>
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-lg">
            <AdminNavLinks />
            <div className="mt-3 border-t border-border pt-3">
              <p className="truncate px-1 text-sm font-medium text-foreground">{session.name}</p>
              <p className="px-1 pb-2 text-xs text-muted-foreground">{roleLabel(session.role)}</p>
              <form action={logoutStaffAction}>
                <SubmitButton variant="ghost" size="sm" className="w-full justify-start">
                  Sair
                </SubmitButton>
              </form>
            </div>
          </div>
        </details>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-4 sm:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ponto das Crianças" className="size-10 rounded-full" />
          <div>
            <p className="text-sm font-semibold text-foreground">Ponto das Crianças</p>
            <p className="text-xs text-muted-foreground">Painel administrativo</p>
          </div>
        </Link>
        <AdminNavLinks className="flex-1" />
        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-medium text-foreground">{session.name}</p>
          <p className="px-2 pb-2 text-xs text-muted-foreground">{roleLabel(session.role)}</p>
          <form action={logoutStaffAction}>
            <SubmitButton variant="ghost" size="sm" className="w-full justify-start">
              Sair
            </SubmitButton>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-background p-4 sm:p-6">{children}</main>
    </div>
  );
}
