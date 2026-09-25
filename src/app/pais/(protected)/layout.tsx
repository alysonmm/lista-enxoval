import Link from "next/link";

import { requireParentPage } from "@/lib/auth/current-user";
import { logoutParentAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { ParentNavLinks } from "./parent-nav";

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
          <Link href="/pais" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ponto das Crianças" className="size-9 rounded-full" />
            <div>
              <p className="text-sm font-semibold text-foreground">Ponto das Crianças</p>
              <p className="text-xs text-muted-foreground">Olá, {session.name.split(" ")[0]}</p>
            </div>
          </Link>
          <form action={logoutParentAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
        <ParentNavLinks />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
