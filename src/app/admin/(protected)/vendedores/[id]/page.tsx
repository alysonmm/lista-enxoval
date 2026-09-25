import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/dates";
import { resetStaffPasswordAction, updateStaffAction } from "@/modules/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente (unidade é obrigatória para Gerente/Vendedor).",
  duplicate: "Já existe um funcionário com esse e-mail.",
  invalid_password: "Informe uma senha com pelo menos 6 caracteres.",
  cannot_deactivate_self: "Você não pode desativar sua própria conta.",
};

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireStaffPage(["ADMIN"]);
  const { id } = await params;
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const [staffMember, stores] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!staffMember || staffMember.deletedAt) notFound();

  const updateWithId = updateStaffAction.bind(null, staffMember.id);
  const resetPasswordWithId = resetStaffPasswordAction.bind(null, staffMember.id);
  const isSelf = staffMember.id === session.userId;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{staffMember.name}</h1>
          <p className="text-sm text-muted-foreground">
            Funcionário desde {formatDateOnly(staffMember.createdAt)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/vendedores/novo?cloneFrom=${staffMember.id}`}>Clonar este funcionário</Link>
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Alterações salvas.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do funcionário</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required defaultValue={staffMember.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required defaultValue={staffMember.email} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" name="phone" defaultValue={staffMember.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Papel</Label>
              <Select id="role" name="role" defaultValue={staffMember.role}>
                <option value="SELLER">Vendedor / Consultor de Enxoval</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storeId">Unidade</Label>
              <Select id="storeId" name="storeId" defaultValue={staffMember.storeId ?? ""}>
                <option value="">— Não se aplica (Administrador) —</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">Obrigatório para Gerente e Vendedor.</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" name="active" defaultChecked={staffMember.active} />
              <Label htmlFor="active">Funcionário ativo</Label>
            </div>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                Você não pode desativar sua própria conta.
              </p>
            )}
            <Button type="submit" className="mt-2 self-start">
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={resetPasswordWithId} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" variant="secondary" className="self-start">
              Definir/redefinir senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
