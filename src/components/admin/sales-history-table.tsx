"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCentsToBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ClickableRow } from "@/components/ui/clickable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
  REFUNDED: "Estornado",
  EXPIRED: "Expirado",
};

const PAYMENT_STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
  EXPIRED: "secondary",
};

export type SalesHistoryRow = {
  id: string;
  productSummary: string;
  quantity: number;
  buyerName: string;
  total: number;
  paymentStatus: string;
  createdAt: string;
};

function handleExportPdf() {
  document.body.classList.add("print-scope");
  const cleanup = () => {
    document.body.classList.remove("print-scope");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function SalesHistoryTable({
  listTitle,
  rows,
}: {
  listTitle: string;
  rows: SalesHistoryRow[];
}) {
  const [status, setStatus] = useState("ALL");
  const [buyer, setBuyer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const buyerQuery = buyer.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "ALL" && row.paymentStatus !== status) return false;
      if (buyerQuery && !row.buyerName.toLowerCase().includes(buyerQuery)) return false;
      const createdDate = row.createdAt.slice(0, 10);
      if (from && createdDate < from) return false;
      if (to && createdDate > to) return false;
      return true;
    });
  }, [rows, status, buyer, from, to]);

  return (
    <div data-print-target>
      <div className="mb-4 hidden print:block">
        <h2 className="text-lg font-bold text-foreground">{listTitle} — Histórico de vendas</h2>
        <p className="text-sm text-muted-foreground">Gerado em {formatDateTime(new Date())}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden" data-print-hide>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="ALL">Todos</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Comprador</Label>
          <Input
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            placeholder="Buscar por nome"
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button type="button" variant="outline" onClick={handleExportPdf} className="ml-auto">
          Exportar PDF
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd.</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="print:hidden" data-print-hide />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <ClickableRow key={row.id} href={`/admin/vendas/${row.id}`}>
                <TableCell className="font-medium">{row.productSummary}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.buyerName}</TableCell>
                <TableCell>{formatCentsToBRL(row.total)}</TableCell>
                <TableCell>
                  <Badge variant={PAYMENT_STATUS_VARIANT[row.paymentStatus]}>
                    {PAYMENT_STATUS_LABEL[row.paymentStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="print:hidden" data-print-hide>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/vendas/${row.id}`}>Ver</Link>
                  </Button>
                </TableCell>
              </ClickableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {rows.length === 0
                    ? "Nenhuma venda registrada ainda para esta lista."
                    : "Nenhuma venda encontrada com esses filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
