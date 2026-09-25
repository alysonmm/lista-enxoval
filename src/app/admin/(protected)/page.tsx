import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { getDashboardSummary } from "@/modules/reporting/queries";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateForInput } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function scopeFromSession(session: Awaited<ReturnType<typeof requireStaffPage>>) {
  if (session.role === "MANAGER") return { storeId: session.storeId ?? undefined };
  if (session.role === "SELLER") return { sellerId: session.userId };
  return {};
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <CardContent className="p-5">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  );

  if (!href) return <Card>{content}</Card>;

  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/40 hover:bg-muted/40">{content}</Card>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireStaffPage();
  const summary = await getDashboardSummary(scopeFromSession(session));

  const now = new Date();
  const todayParam = formatDateForInput(now);
  const startOfMonthParam = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));

  // Vendedor não acessa /admin/relatorios (restrito a ADMIN/MANAGER) — leva ao
  // próprio /admin/vendas, que ele já pode ver com o escopo das suas vendas.
  const canSeeReports = session.role !== "SELLER";
  const salesBaseHref = canSeeReports ? "/admin/relatorios" : "/admin/vendas";
  const reportHref = (query: string) => (canSeeReports ? `${salesBaseHref}?${query}` : salesBaseHref);

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
        <StatCard
          label="Listas ativas"
          value={summary.activeLists.toString()}
          href="/admin/listas?status=ACTIVE"
        />
        <StatCard
          label="Novas listas no mês"
          value={summary.newListsThisMonth.toString()}
          href="/admin/listas"
        />
        <StatCard
          label="Vendas hoje"
          value={formatCentsToBRL(summary.salesTodayTotal)}
          hint={`${summary.salesTodayCount} pedido(s)`}
          href={reportHref(`from=${todayParam}`)}
        />
        <StatCard
          label="Vendas no mês"
          value={formatCentsToBRL(summary.salesMonthTotal)}
          hint={`${summary.salesMonthCount} pedido(s)`}
          href={reportHref(`from=${startOfMonthParam}`)}
        />
        <StatCard
          label="Venda online"
          value={formatCentsToBRL(summary.onlineTotal)}
          href={reportHref("channel=ONLINE")}
        />
        <StatCard
          label="Venda presencial"
          value={formatCentsToBRL(summary.inStoreTotal)}
          href={reportHref("channel=IN_STORE")}
        />
        <StatCard
          label="Ticket médio"
          value={formatCentsToBRL(summary.averageTicket)}
          href={salesBaseHref}
        />
        <StatCard
          label="Compradores únicos"
          value={summary.uniqueBuyers.toString()}
          href={salesBaseHref}
        />
      </div>

      <Link href="/admin/listas?status=ACTIVE">
        <Card className="transition-colors hover:border-primary/40 hover:bg-muted/40">
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
      </Link>
    </div>
  );
}
