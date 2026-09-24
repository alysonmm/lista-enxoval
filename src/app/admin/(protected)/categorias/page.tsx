import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createCategoryAction } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Informe o nome da categoria.",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { parentCategory: true, _count: { select: { products: true } } },
  });
  const topLevel = categories.filter((c) => !c.parentCategoryId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Categorias</h1>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria pai</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.parentCategory?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category._count.products}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.active ? "success" : "secondary"}>
                      {category.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma categoria cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategoryAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Ex.: Banho" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parentCategoryId">Categoria pai (opcional)</Label>
              <Select id="parentCategoryId" name="parentCategoryId" defaultValue="">
                <option value="">Nenhuma (categoria principal)</option>
                {topLevel.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="mt-2">
              Adicionar categoria
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
