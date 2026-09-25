import Link from "next/link";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  DISCONTINUED: "Descontinuado",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { q } = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      promoPrice: true,
      status: true,
      images: true,
      category: { select: { name: true } },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo geral da Ponto das Crianças.</p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo">Novo produto</Link>
        </Button>
      </div>

      <form method="GET" className="flex max-w-sm gap-2">
        <Input name="q" placeholder="Buscar por nome, SKU ou código de barras" defaultValue={q ?? ""} />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Variações</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="cursor-pointer">
                <TableCell>
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt=""
                      className="size-10 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-md border border-dashed border-border bg-muted/40" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/produtos/${product.id}`} className="hover:underline">
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="text-muted-foreground">{product.category.name}</TableCell>
                <TableCell>{formatCentsToBRL(product.promoPrice ?? product.price)}</TableCell>
                <TableCell className="text-muted-foreground">{product._count.variants}</TableCell>
                <TableCell>
                  <Badge variant={product.status === "ACTIVE" ? "success" : "secondary"}>
                    {STATUS_LABEL[product.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/produtos/novo?cloneFrom=${product.id}`}>Clonar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
