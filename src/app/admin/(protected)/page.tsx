import { requireStaffPage } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await requireStaffPage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {session.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo(a) ao painel da Ponto das Crianças.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Os indicadores gerais (listas ativas, vendas do dia/mês, ticket médio) aparecerão aqui.
        </CardContent>
      </Card>
    </div>
  );
}
