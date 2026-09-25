import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createStaffAction } from "@/modules/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente (unidade é obrigatória para Gerente/Vendedor).",
  duplicate: "Já existe um funcionário com esse e-mail.",
};

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaffPage(["ADMIN"]);
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const stores = await prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo funcionário</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStaffAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Carla Souza" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required placeholder="carla@pontodascriancas.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Papel</Label>
              <Select id="role" name="role" defaultValue="SELLER">
                <option value="SELLER">Vendedor / Consultor de Enxoval</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storeId">Unidade</Label>
              <Select id="storeId" name="storeId" defaultValue="">
                <option value="">— Não se aplica (Administrador) —</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">Obrigatório para Gerente e Vendedor.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha de acesso ao painel</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="mt-2">
              Salvar funcionário
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
