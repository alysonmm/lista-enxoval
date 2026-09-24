import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import {
  getListsReportSummary,
  getMostGiftedProducts,
  getSalesByConsultant,
  getSalesBySeller,
  getSalesByStore,
  type SalesReportFilters,
} from "@/modules/reporting/queries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; storeId?: string; channel?: string }>;
}) {
  const session = await requireStaffPage(["ADMIN", "MANAGER"]);
  const params = await searchParams;

  const filters: SalesReportFilters = {
    storeId: session.role === "MANAGER" ? (session.storeId ?? undefined) : params.storeId || undefined,
    channel: (params.channel as SalesReportFilters["channel"]) || undefined,
    from: params.from ? new Date(`${params.from}T00:00:00`) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
  };

  const stores = session.role === "ADMIN" ? await prisma.store.findMany({ orderBy: { name: "asc" } }) : [];

  const [summary, byStore, byConsultant, bySeller, mostGifted] = await Promise.all([
    getListsReportSummary(filters),
    session.role === "ADMIN" ? getSalesByStore(filters) : Promise.resolve([]),
    getSalesByConsultant(filters),
    getSalesBySeller(filters),
    getMostGiftedProducts(filters),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Vendas aprovadas no período selecionado.</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
        </div>
        {session.role === "ADMIN" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Unidade</label>
            <Select name="storeId" defaultValue={params.storeId ?? ""} className="w-48">
              <option value="">Todas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Canal</label>
          <Select name="channel" defaultValue={params.channel ?? ""} className="w-40">
            <option value="">Todos</option>
            <option value="ONLINE">Online</option>
            <option value="IN_STORE">Presencial</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Total vendido</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCentsToBRL(summary.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">{summary.totalOrders} pedido(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Online × Presencial</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {summary.onlineOrders} / {summary.inStoreOrders}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Ticket médio</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCentsToBRL(summary.averageTicket)}
            </p>
          </CardContent>
        </Card>
      </div>

      {session.role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable rows={byStore} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vendas por consultor da lista</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTable rows={byConsultant} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTable rows={bySeller} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos mais presenteados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mostGifted.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{formatCentsToBRL(row.total)}</TableCell>
                  </TableRow>
                ))}
                {mostGifted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ rows }: { rows: { name: string; total: number; count: number }[] }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Pedidos</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.count}</TableCell>
              <TableCell>{formatCentsToBRL(row.total)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhuma venda no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
