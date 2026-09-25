import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createStoreAction } from "@/modules/catalog/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  duplicate_code: "Já existe uma unidade com esse código.",
};

export default async function NewStorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cloneFrom?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { error, cloneFrom } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const source = cloneFrom ? await prisma.store.findUnique({ where: { id: cloneFrom } }) : null;

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{source ? `Clonar "${source.name}"` : "Nova unidade"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStoreAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            {source && (
              <p className="text-xs text-muted-foreground">
                Dados copiados de <strong>{source.name}</strong>. Ajuste o nome e defina um código novo (o
                código não pode se repetir).
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Ponto das Crianças — Shopping X"
                defaultValue={source ? `${source.name} (cópia)` : ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" required placeholder="PDC1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" defaultValue={source?.address ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={source?.phone ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" name="active" defaultChecked={source?.active ?? true} />
              <Label htmlFor="active">Unidade ativa</Label>
            </div>
            <SubmitButton className="mt-2">
              {source ? "Salvar unidade clonada" : "Salvar unidade"}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
