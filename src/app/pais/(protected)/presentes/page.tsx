import { requireParentPage } from "@/lib/auth/current-user";
import { getParentPrimaryList, getReceivedGifts } from "@/modules/gift-lists/parent-view";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReceivedGiftsPage() {
  const session = await requireParentPage();
  const list = await getParentPrimaryList(session.parentId);

  if (!list) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma lista encontrada.
        </CardContent>
      </Card>
    );
  }

  const gifts = getReceivedGifts(list);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Presentes recebidos</h1>
      {gifts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Ainda não chegou nenhum presente por aqui. Assim que alguém presentear, você verá aqui!
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {gifts.map((gift, index) => (
            <Card key={`${gift.orderId}-${index}`}>
              <CardContent className="flex flex-col gap-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">
                    {gift.productName}
                    {gift.variantLabel ? ` (${gift.variantLabel})` : ""}
                    {gift.quantity > 1 ? ` × ${gift.quantity}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateOnly(gift.createdAt)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Presente de: {gift.buyerName ?? "Presente anônimo"}
                  {list.showGiftValuesToParents && ` · ${formatCentsToBRL(gift.total)}`}
                </p>
                {gift.message && (
                  <p className="mt-1 rounded-md bg-muted/50 p-2 text-sm italic text-foreground">
                    &ldquo;{gift.message}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
