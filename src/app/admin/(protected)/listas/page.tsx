import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  PAUSED: "warning",
  CLOSED: "secondary",
  CANCELLED: "destructive",
};

export default async function GiftListsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireStaffPage();
  const { q } = await searchParams;

  const where: Prisma.GiftListWhereInput = {
    deletedAt: null,
    ...(session.role === "SELLER" ? { consultantId: session.userId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { publicId: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { baby: { name: { contains: q, mode: "insensitive" } } },
            {
              parents: {
                some: {
                  parent: {
                    customer: {
                      OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { phone: { contains: q } },
                        { cpf: { contains: q } },
                      ],
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const lists = await prisma.giftList.findMany({
    where,
    include: { baby: true, store: true, consultant: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listas de enxoval</h1>
          <p className="text-sm text-muted-foreground">
            {session.role === "SELLER" ? "Suas listas" : "Todas as listas"}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/listas/nova">Nova lista</Link>
        </Button>
      </div>

      <form method="GET" className="flex max-w-sm gap-2">
        <Input
          name="q"
          placeholder="Bebê, mãe/pai, telefone, CPF, título ou código"
          defaultValue={q ?? ""}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lista</TableHead>
              <TableHead>Bebê</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.map((list) => (
              <TableRow key={list.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/listas/${list.id}`} className="hover:underline">
                    {list.title}
                  </Link>
                  <p className="text-xs font-normal text-muted-foreground">{list.publicId}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {list.baby.nameUndefined ? "Nome ainda não definido" : (list.baby.name ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">{list.store.name}</TableCell>
                <TableCell className="text-muted-foreground">{list.consultant.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateOnly(list.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[list.status]}>{STATUS_LABEL[list.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {lists.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma lista encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
