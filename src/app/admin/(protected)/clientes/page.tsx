import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaffPage();
  const { q } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { cpf: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { addresses: true } }, parent: { include: { giftListParents: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Pais e responsáveis cadastrados.</p>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/novo">Novo cliente</Link>
        </Button>
      </div>

      <form method="GET" className="flex max-w-sm gap-2">
        <Input name="q" placeholder="Buscar por nome, telefone, CPF ou e-mail" defaultValue={q ?? ""} />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Listas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/clientes/${customer.id}`} className="hover:underline">
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.parent?.giftListParents.length ?? 0}
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
