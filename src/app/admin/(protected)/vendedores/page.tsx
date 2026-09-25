import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SELLER: "Vendedor / Consultor de Enxoval",
};

export default async function StaffPage() {
  await requireStaffPage(["ADMIN"]);

  const staff = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { store: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground">
            Administradores, gerentes e vendedores/consultores de enxoval.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/vendedores/novo">Novo funcionário</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>{ROLE_LABEL[user.role] ?? user.role}</TableCell>
                <TableCell className="text-muted-foreground">{user.store?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.active ? "success" : "secondary"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/vendedores/${user.id}`}>Editar</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/vendedores/novo?cloneFrom=${user.id}`}>Clonar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum funcionário cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
