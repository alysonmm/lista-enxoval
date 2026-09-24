import { requireParentPage } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParentOverviewPage() {
  await requireParentPage();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O progresso do enxoval (itens escolhidos, presenteados e percentual concluído)
          aparecerá aqui.
        </CardContent>
      </Card>
    </div>
  );
}
