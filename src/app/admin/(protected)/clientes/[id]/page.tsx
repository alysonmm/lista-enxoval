import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/dates";
import { resetParentPasswordAction, updateCustomerAction } from "@/modules/people/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  invalid_password: "A senha deve ter pelo menos 6 caracteres.",
  duplicate: "Já existe outro cliente com esses dados.",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      parent: {
        include: {
          giftListParents: {
            include: { giftList: { include: { baby: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  if (!customer) notFound();

  const updateWithId = updateCustomerAction.bind(null, customer.id);
  const resetPasswordWithId = resetParentPasswordAction.bind(null, customer.id);
  const lists = customer.parent?.giftListParents.map((gp) => gp.giftList) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">Cliente desde {formatDateOnly(customer.createdAt)}</p>
        </div>
        <Button asChild>
          <Link href={`/admin/listas/nova?customerId=${customer.id}`}>Nova lista para este cliente</Link>
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Alterações salvas.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWithId} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required defaultValue={customer.name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" name="phone" required defaultValue={customer.phone ?? ""} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" name="whatsapp" defaultValue={customer.whatsapp ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" name="cpf" defaultValue={customer.cpf ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" defaultValue={customer.cep ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="street">Endereço</Label>
                  <Input id="street" name="street" defaultValue={customer.street ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label htmlFor="state">UF</Label>
                  <Input id="state" name="state" maxLength={2} defaultValue={customer.state ?? ""} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue={customer.city ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={customer.notes ?? ""} />
              </div>
              <Button type="submit" className="mt-2 self-start">
                Salvar alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acesso ao portal dos pais</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={resetPasswordWithId} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {customer.parent?.passwordHash
                  ? "Este cliente já tem acesso ao portal."
                  : "Este cliente ainda não tem senha definida."}
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" name="password" type="password" minLength={6} required />
              </div>
              <Button type="submit" variant="secondary">
                Definir/redefinir senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listas de enxoval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lista</TableHead>
                  <TableHead>Bebê</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/listas/${list.id}`} className="hover:underline">
                        {list.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {list.baby.nameUndefined ? "Nome ainda não definido" : (list.baby.name ?? "—")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={list.status === "ACTIVE" ? "success" : "secondary"}>
                        {STATUS_LABEL[list.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {lists.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma lista ainda.
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
