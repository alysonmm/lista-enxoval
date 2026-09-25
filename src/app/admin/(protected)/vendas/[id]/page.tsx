import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cancelOrderAction } from "@/modules/sales/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Informe o motivo do cancelamento.",
  forbidden: "Você não tem permissão para cancelar vendas.",
  not_found: "Pedido não encontrado.",
  already_cancelled: "Este pedido já foi cancelado anteriormente.",
};

const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: "Online",
  IN_STORE: "Presencial",
  ADMIN_MANUAL: "Manual (admin)",
  FUTURE_INTEGRATION: "Integração",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  STORE_FINANCING: "Crediário",
  GIFT_CARD: "Vale-presente",
  OTHER: "Outra",
};

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "";
  const parts = Object.values(attributes as Record<string, string>).filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireStaffPage();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível concluir a ação.") : null;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: true,
      giftList: true,
      store: true,
      saleSeller: true,
      listConsultant: true,
      cancelledBy: true,
      giftMessage: true,
      items: { include: { product: true, variant: true } },
      payments: true,
    },
  });
  if (!order) notFound();
  if (
    session.role === "SELLER" &&
    order.saleSellerId !== session.userId &&
    order.listConsultantId !== session.userId
  ) {
    notFound();
  }

  const isCancelled = order.paymentStatus === "CANCELLED" || order.paymentStatus === "REFUNDED";
  const canCancel = session.role === "ADMIN" || (await hasPermission(session, PERMISSIONS.SALES_CANCEL));
  const cancelWithId = cancelOrderAction.bind(null, order.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/vendas"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para vendas
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Pedido #{order.sequentialNumber.toString().padStart(6, "0")}
          </h1>
          <Badge variant={isCancelled ? "destructive" : "success"}>
            {isCancelled ? "Cancelado" : "Aprovado"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Lista{" "}
          <Link href={`/admin/listas/${order.giftListId}`} className="underline">
            {order.giftList.title}
          </Link>{" "}
          · {formatDateTime(order.createdAt)} · {CHANNEL_LABEL[order.channel]}
        </p>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Alterações salvas.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Preço unit.</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                      {variantLabel(item.variant?.attributes)}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCentsToBRL(item.unitPrice)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCentsToBRL(item.discount)}
                    </TableCell>
                    <TableCell className="font-medium">{formatCentsToBRL(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-right text-lg font-bold text-foreground">
            Total: {formatCentsToBRL(order.total)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comprador</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-foreground">
              {order.hideBuyerFromParents ? "Anônimo para os pais" : order.buyer.name}
            </p>
            {order.buyer.phone && <p className="text-muted-foreground">{order.buyer.phone}</p>}
            {order.giftMessage && (
              <p className="mt-2 rounded-md bg-muted/50 p-2 italic text-muted-foreground">
                &ldquo;{order.giftMessage.message}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>Unidade: {order.store?.name ?? "—"}</p>
            <p>Vendedor: {order.saleSeller?.name ?? "—"}</p>
            <p>Consultor da lista: {order.listConsultant?.name ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cupom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{PAYMENT_METHOD_LABEL[payment.method]}</TableCell>
                    <TableCell>{formatCentsToBRL(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "APPROVED" ? "success" : "secondary"}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.couponNumber ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isCancelled ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Cancelado em {order.cancelledAt ? formatDateTime(order.cancelledAt) : "—"} por{" "}
            {order.cancelledBy?.name ?? "—"}. Motivo: {order.cancelReason ?? "—"}
          </CardContent>
        </Card>
      ) : (
        canCancel && (
          <Card>
            <CardHeader>
              <CardTitle>Cancelar venda</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={cancelWithId} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="reason">Motivo</Label>
                  <Input id="reason" name="reason" required placeholder="Ex.: cliente desistiu" />
                </div>
                <Button type="submit" variant="destructive">
                  Cancelar venda
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
