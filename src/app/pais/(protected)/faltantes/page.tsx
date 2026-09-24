import { requireParentPage } from "@/lib/auth/current-user";
import { getMissingItems, getParentPrimaryList } from "@/modules/gift-lists/parent-view";
import { formatCentsToBRL } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PRIORITY_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  DESIRED: "Escolha dos pais",
  ESSENTIAL: "Item essencial",
};

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "";
  const parts = Object.values(attributes as Record<string, string>).filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

export default async function MissingItemsPage() {
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

  const missing = getMissingItems(list);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Itens faltantes</h1>
      {missing.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Uhul! Todos os itens da sua lista já foram presenteados ou reservados.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {missing.map(({ item, remaining }) => {
            const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {item.product.name}
                      {variantLabel(item.variant?.attributes)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Faltam {remaining} · {formatCentsToBRL(price)} cada
                    </p>
                  </div>
                  {item.priority !== "NORMAL" && (
                    <Badge variant={item.priority === "ESSENTIAL" ? "warning" : "accent"}>
                      {PRIORITY_LABEL[item.priority]}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
