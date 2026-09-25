import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import {
  adjustInventoryAction,
  createProductVariantAction,
  updateProductAction,
} from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  duplicate_sku: "Já existe um produto ou variação com esse SKU/código de barras.",
  invalid_image_type: "Envie uma imagem JPG, PNG, WEBP ou GIF.",
  image_too_large: "A imagem deve ter até 5MB.",
};

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "Único";
  const attrs = attributes as Record<string, string>;
  const parts = Object.values(attrs).filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Único";
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { id } = await params;
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const [product, categories, stores] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
          include: { inventory: { include: { store: true } } },
        },
      },
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const updateWithId = updateProductAction.bind(null, product.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="text-sm text-muted-foreground">SKU {product.sku}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/produtos/novo?cloneFrom=${product.id}`}>Clonar este produto</Link>
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Produto atualizado com sucesso.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required defaultValue={product.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" required defaultValue={product.sku} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="barcode">Código de barras</Label>
                <Input id="barcode" name="barcode" defaultValue={product.barcode ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" defaultValue={product.brand ?? ""} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select id="categoryId" name="categoryId" required defaultValue={product.categoryId}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={product.description ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={(product.price / 100).toFixed(2)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promoPrice">Preço promocional (R$)</Label>
                <Input
                  id="promoPrice"
                  name="promoPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product.promoPrice != null ? (product.promoPrice / 100).toFixed(2) : ""}
                />
              </div>
            </div>
            {product.images[0] && (
              <div className="flex flex-col gap-1.5">
                <Label>Imagem atual</Label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-32 w-32 rounded-md border border-border object-cover"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imageFile">
                {product.images[0] ? "Trocar imagem do produto" : "Imagem do produto"}
              </Label>
              <Input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou GIF, até 5MB.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="images">URLs de imagem adicionais (uma por linha, opcional)</Label>
              <Textarea id="images" name="images" rows={2} defaultValue={product.images.slice(1).join("\n")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={product.status}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="DISCONTINUED">Descontinuado</option>
              </Select>
            </div>
            <SubmitButton className="mt-2 self-start">
              Salvar alterações
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variação</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variantLabel(variant.attributes)}</TableCell>
                    <TableCell className="text-muted-foreground">{variant.sku}</TableCell>
                    <TableCell>
                      {formatCentsToBRL(variant.priceOverride ?? product.promoPrice ?? product.price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {variant.inventory.reduce((sum, inv) => sum + inv.physicalQuantity, 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.active ? "success" : "secondary"}>
                        {variant.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {product.variants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma variação cadastrada. Produtos sem variação usam o preço acima.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <form action={createProductVariantAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU da variação</Label>
              <Input id="sku" name="sku" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input id="barcode" name="barcode" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="size">Tamanho</Label>
              <Input id="size" name="size" placeholder="RN, P, M, G..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="color">Cor</Label>
              <Input id="color" name="color" placeholder="Rosa, Branco, Bege..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priceOverride">Preço específico (R$, opcional)</Label>
              <Input id="priceOverride" name="priceOverride" type="number" step="0.01" min="0" />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox id="variant-active" name="active" defaultChecked />
              <Label htmlFor="variant-active">Variação ativa</Label>
            </div>
            <SubmitButton variant="secondary" className="sm:col-span-2 sm:self-start">
              Adicionar variação
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {product.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estoque por unidade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variação</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Físico</TableHead>
                    <TableHead>Reservado</TableHead>
                    <TableHead>Disponível</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.flatMap((variant) =>
                    variant.inventory.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{variantLabel(variant.attributes)}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.store.name}</TableCell>
                        <TableCell>{inv.physicalQuantity}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.reservedQuantity}</TableCell>
                        <TableCell>{inv.physicalQuantity - inv.reservedQuantity}</TableCell>
                      </TableRow>
                    )),
                  )}
                  {product.variants.every((v) => v.inventory.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum estoque lançado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <form action={adjustInventoryAction} className="grid gap-4 sm:grid-cols-4 sm:items-end">
              <input type="hidden" name="redirectProductId" value={product.id} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="productVariantId">Variação</Label>
                <Select id="productVariantId" name="productVariantId" required defaultValue="">
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant.attributes)} ({variant.sku})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="storeId">Unidade</Label>
                <Select id="storeId" name="storeId" required defaultValue="">
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="physicalQuantity">Quantidade física</Label>
                <Input id="physicalQuantity" name="physicalQuantity" type="number" min="0" required />
              </div>
              <SubmitButton variant="secondary">
                Atualizar estoque
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
