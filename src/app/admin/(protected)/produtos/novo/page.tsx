import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createProductAction } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  duplicate_sku: "Já existe um produto com esse SKU ou código de barras.",
  invalid_image_type: "Envie uma imagem JPG, PNG, WEBP ou GIF.",
  image_too_large: "A imagem deve ter até 5MB.",
};

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cloneFrom?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { error, cloneFrom } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const [categories, source] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    cloneFrom ? prisma.product.findUnique({ where: { id: cloneFrom } }) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{source ? `Clonar "${source.name}"` : "Novo produto"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProductAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            {source && (
              <p className="text-xs text-muted-foreground">
                Dados copiados de <strong>{source.name}</strong>. Defina um SKU novo (obrigatório, não
                pode se repetir) — os demais campos já vêm preenchidos.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Kit Berço Nuvem"
                  defaultValue={source ? `${source.name} (cópia)` : ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="barcode">Código de barras</Label>
                <Input id="barcode" name="barcode" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" defaultValue={source?.brand ?? ""} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select id="categoryId" name="categoryId" required defaultValue={source?.categoryId ?? ""}>
                <option value="" disabled>
                  Selecione...
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" rows={3} defaultValue={source?.description ?? ""} />
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
                  defaultValue={source ? (source.price / 100).toFixed(2) : ""}
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
                  defaultValue={source?.promoPrice != null ? (source.promoPrice / 100).toFixed(2) : ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imageFile">Imagem do produto</Label>
              <Input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
              <p className="text-xs text-muted-foreground">
                {source
                  ? "Deixe em branco para manter a mesma imagem do produto original, ou envie uma nova."
                  : "JPG, PNG, WEBP ou GIF, até 5MB."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="images">URLs de imagem adicionais (uma por linha, opcional)</Label>
              <Textarea
                id="images"
                name="images"
                rows={2}
                placeholder="https://..."
                defaultValue={source ? source.images.join("\n") : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={source?.status ?? "ACTIVE"}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="DISCONTINUED">Descontinuado</option>
              </Select>
            </div>
            <Button type="submit" className="mt-2">
              {source ? "Salvar produto clonado" : "Salvar produto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
