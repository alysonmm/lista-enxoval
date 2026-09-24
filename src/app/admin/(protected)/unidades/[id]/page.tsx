import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateStoreAction } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  duplicate_code: "Já existe uma unidade com esse código.",
};

export default async function EditStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { id } = await params;
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) notFound();

  const updateWithId = updateStoreAction.bind(null, store.id);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Editar unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required defaultValue={store.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" required defaultValue={store.code} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" defaultValue={store.address ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={store.phone ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" name="active" defaultChecked={store.active} />
              <Label htmlFor="active">Unidade ativa</Label>
            </div>
            <Button type="submit" className="mt-2">
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
