import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Input } from "@/components/ui/input";
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
import type { Prisma } from "@prisma/client";

const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: "Online",
  IN_STORE: "Presencial",
  ADMIN_MANUAL: "Manual (admin)",
  FUTURE_INTEGRATION: "Integração",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
  REFUNDED: "Estornado",
  EXPIRED: "Expirado",
};

const PAYMENT_STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
  EXPIRED: "secondary",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireStaffPage();
  const { q } = await searchParams;

  const where: Prisma.OrderWhereInput = {
    ...(session.role === "SELLER"
      ? { OR: [{ saleSellerId: session.userId }, { listConsultantId: session.userId }] }
      : {}),
    ...(q
      ? {
          OR: [
            { buyer: { name: { contains: q, mode: "insensitive" } } },
            { giftList: { title: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { buyer: true, giftList: true, store: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
        <p className="text-sm text-muted-foreground">Pedidos de todos os canais.</p>
      </div>

      <form method="GET" className="flex max-w-sm gap-2">
        <Input name="q" placeholder="Buscar por comprador ou lista" defaultValue={q ?? ""} />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Lista</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/vendas/${order.id}`} className="hover:underline">
                    #{order.sequentialNumber.toString().padStart(6, "0")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{order.giftList.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.hideBuyerFromParents ? "Anônimo" : order.buyer.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{CHANNEL_LABEL[order.channel]}</TableCell>
                <TableCell className="text-muted-foreground">{order.store?.name ?? "—"}</TableCell>
                <TableCell>{formatCentsToBRL(order.total)}</TableCell>
                <TableCell>
                  <Badge variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}>
                    {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
