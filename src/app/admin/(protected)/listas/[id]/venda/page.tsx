import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { registerInStoreSaleAction } from "@/modules/sales/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  item_not_found: "Produto não encontrado nesta lista.",
  list_not_active: "Esta lista não está ativa no momento.",
  exceeds_list_quantity: "Quantidade solicitada acima do que ainda falta para esse item.",
  out_of_stock: "Estoque insuficiente nesta unidade para essa quantidade.",
};

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "";
  const parts = Object.values(attributes as Record<string, string>).filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

export default async function InStoreSalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireStaffPage();
  const { id } = await params;
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível registrar a venda.") : null;

  const list = await prisma.giftList.findUnique({
    where: { id },
    include: {
      baby: true,
      items: { include: { product: true, variant: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!list) notFound();
  if (session.role === "SELLER" && list.consultantId !== session.userId) notFound();
  if (list.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-muted-foreground">
          Esta lista não está ativa — não é possível registrar vendas contra ela agora.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href={`/admin/listas/${id}`}>Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  const sellableItems = list.items.filter((item) => {
    const available = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
    return item.active && available > 0;
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/admin/listas/${id}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para a lista
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Venda presencial — {list.title}</h1>
        <p className="text-sm text-muted-foreground">Código {list.publicId}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Situação atual dos produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Desejado</TableHead>
                  <TableHead>Comprado</TableHead>
                  <TableHead>Reservado</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.map((item) => {
                  const available = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
                  const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                        {variantLabel(item.variant?.attributes)}
                      </TableCell>
                      <TableCell>{item.desiredQuantity}</TableCell>
                      <TableCell>{item.purchasedQuantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.reservedQuantity}</TableCell>
                      <TableCell className={available <= 0 ? "text-muted-foreground" : "font-medium"}>
                        {Math.max(available, 0)}
                      </TableCell>
                      <TableCell>{formatCentsToBRL(price)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {sellableItems.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Todos os produtos desta lista já foram totalmente presenteados.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registrar venda</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={registerInStoreSaleAction.bind(null, id)} className="flex flex-col gap-4">
              {message && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {message}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="giftListItemId">Produto</Label>
                <Select id="giftListItemId" name="giftListItemId" required defaultValue="">
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {sellableItems.map((item) => {
                    const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
                    return (
                      <option key={item.id} value={item.id}>
                        {item.product.name}
                        {variantLabel(item.variant?.attributes)} — {formatCentsToBRL(price)}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="unitPrice">Preço unitário (R$)</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input id="discount" name="discount" type="number" step="0.01" min="0" defaultValue="0" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
                  <option value="CASH">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="DEBIT_CARD">Débito</option>
                  <option value="CREDIT_CARD">Crédito</option>
                  <option value="STORE_FINANCING">Crediário</option>
                  <option value="OTHER">Outra</option>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pdvSaleNumber">Número da venda no PDV</Label>
                  <Input id="pdvSaleNumber" name="pdvSaleNumber" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="couponNumber">Número do cupom</Label>
                  <Input id="couponNumber" name="couponNumber" />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Quem está presenteando</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="buyerName">Nome</Label>
                    <Input id="buyerName" name="buyerName" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="buyerPhone">Telefone (opcional)</Label>
                    <Input id="buyerPhone" name="buyerPhone" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1.5">
                  <Label htmlFor="buyerMessage">Mensagem para os pais (opcional)</Label>
                  <Textarea id="buyerMessage" name="buyerMessage" rows={2} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox id="hideBuyerFromParents" name="hideBuyerFromParents" />
                  <Label htmlFor="hideBuyerFromParents">Presentear anonimamente (pais não verão o nome)</Label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Observação interna</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>

              <Button type="submit" size="lg" className="mt-2 self-start">
                Confirmar venda
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
