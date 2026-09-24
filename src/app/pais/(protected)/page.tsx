import Link from "next/link";

import { requireParentPage } from "@/lib/auth/current-user";
import { computeDashboard, getParentPrimaryList } from "@/modules/gift-lists/parent-view";
import { formatCentsToBRL } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ParentOverviewPage() {
  const session = await requireParentPage();
  const list = await getParentPrimaryList(session.parentId);

  if (!list) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Você ainda não tem uma lista de enxoval vinculada. Fale com a Ponto das Crianças.
        </CardContent>
      </Card>
    );
  }

  const dashboard = computeDashboard(list);
  const heading = list.baby.nameUndefined ? list.title : `Enxoval da ${list.baby.name ?? ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {list.store.name} · Consultora responsável cuidando de tudo para você
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Itens escolhidos</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{dashboard.itemsChosen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Já presenteados</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{dashboard.itemsCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Concluído</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{dashboard.percentComplete}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${dashboard.percentComplete}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
            <p>Valor dos produtos selecionados: {formatCentsToBRL(dashboard.totalValueChosen)}</p>
            {list.showGiftValuesToParents && (
              <p>Valor já presenteado: {formatCentsToBRL(dashboard.totalValueGifted)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="secondary">
          <Link href="/pais/lista">Ver minha lista completa</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/pais/compartilhar">Compartilhar com a família</Link>
        </Button>
      </div>
    </div>
  );
}
