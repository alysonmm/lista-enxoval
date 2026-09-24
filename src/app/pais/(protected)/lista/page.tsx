import { requireParentPage } from "@/lib/auth/current-user";
import { getParentPrimaryList } from "@/modules/gift-lists/parent-view";
import { formatCentsToBRL } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default async function ParentListPage() {
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Minha lista</h1>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Desejado</TableHead>
              <TableHead>Presenteado</TableHead>
              <TableHead>Restante</TableHead>
              <TableHead>Preço</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((item) => {
              const remaining = Math.max(item.desiredQuantity - item.purchasedQuantity, 0);
              const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
              const complete = item.purchasedQuantity >= item.desiredQuantity;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product.name}
                    {variantLabel(item.variant?.attributes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PRIORITY_LABEL[item.priority]}
                  </TableCell>
                  <TableCell>{item.desiredQuantity}</TableCell>
                  <TableCell>{item.purchasedQuantity}</TableCell>
                  <TableCell>
                    {complete ? (
                      <Badge variant="success">Completo</Badge>
                    ) : (
                      <span className="font-medium">{remaining}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatCentsToBRL(price)}</TableCell>
                </TableRow>
              );
            })}
            {list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum item na lista ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
