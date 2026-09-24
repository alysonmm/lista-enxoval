import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateGiftListItemAction } from "@/modules/gift-lists/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Informe uma quantidade válida.",
};

export default async function EditGiftListItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireStaffPage();
  const { id, itemId } = await params;
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const item = await prisma.giftListItem.findUnique({
    where: { id: itemId },
    include: { product: true, variant: true, giftList: true },
  });
  if (!item || item.giftListId !== id) notFound();
  if (session.role === "SELLER" && item.giftList.consultantId !== session.userId) notFound();

  const updateWithIds = updateGiftListItemAction.bind(null, id, itemId);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{item.product.name}</CardTitle>
          <CardDescription>
            Desejado atualmente: {item.desiredQuantity} · Comprado: {item.purchasedQuantity} · Reservado:{" "}
            {item.reservedQuantity}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWithIds} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desiredQuantity">Quantidade desejada</Label>
              <Input
                id="desiredQuantity"
                name="desiredQuantity"
                type="number"
                min={item.purchasedQuantity + item.reservedQuantity}
                required
                defaultValue={item.desiredQuantity}
              />
              <p className="text-xs text-muted-foreground">
                Não pode ser menor que o já comprado + reservado ({item.purchasedQuantity + item.reservedQuantity}).
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <Select id="priority" name="priority" defaultValue={item.priority}>
                <option value="NORMAL">Normal</option>
                <option value="DESIRED">Escolha dos pais</option>
                <option value="ESSENTIAL">Item essencial</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observação</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={item.notes ?? ""} />
            </div>
            <Button type="submit" className="self-start">
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
