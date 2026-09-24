import { requireStaffPage } from "@/lib/auth/current-user";
import { getDashboardSummary } from "@/modules/reporting/queries";
import { formatCentsToBRL } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function scopeFromSession(session: Awaited<ReturnType<typeof requireStaffPage>>) {
  if (session.role === "MANAGER") return { storeId: session.storeId ?? undefined };
  if (session.role === "SELLER") return { sellerId: session.userId };
  return {};
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireStaffPage();
  const summary = await getDashboardSummary(scopeFromSession(session));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {session.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {session.role === "SELLER"
            ? "Seu desempenho nas listas que você atende."
            : session.role === "MANAGER"
              ? "Indicadores da sua unidade."
              : "Indicadores gerais da Ponto das Crianças."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Listas ativas" value={summary.activeLists.toString()} />
        <StatCard label="Novas listas no mês" value={summary.newListsThisMonth.toString()} />
        <StatCard
          label="Vendas hoje"
          value={formatCentsToBRL(summary.salesTodayTotal)}
          hint={`${summary.salesTodayCount} pedido(s)`}
        />
        <StatCard
          label="Vendas no mês"
          value={formatCentsToBRL(summary.salesMonthTotal)}
          hint={`${summary.salesMonthCount} pedido(s)`}
        />
        <StatCard label="Venda online" value={formatCentsToBRL(summary.onlineTotal)} />
        <StatCard label="Venda presencial" value={formatCentsToBRL(summary.inStoreTotal)} />
        <StatCard label="Ticket médio" value={formatCentsToBRL(summary.averageTicket)} />
        <StatCard label="Compradores únicos" value={summary.uniqueBuyers.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valor potencial das listas ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{formatCentsToBRL(summary.potentialValue)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Soma do preço × quantidade desejada de todos os itens ativos nas listas em andamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
