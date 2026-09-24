import { requireStaffPage } from "@/lib/auth/current-user";
import { createParentCustomerAction } from "@/modules/people/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha nome, telefone e uma senha com pelo menos 6 caracteres.",
  duplicate: "Já existe um cliente com esses dados.",
};

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaffPage();
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createParentCustomerAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" required placeholder="(85) 90000-0000" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="Se diferente do telefone" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input id="cpf" name="cpf" />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" name="cep" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="street">Endereço</Label>
                <Input id="street" name="street" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label htmlFor="state">UF</Label>
                <Input id="state" name="state" maxLength={2} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3">
              <Label htmlFor="password">Senha de acesso ao portal dos pais</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
              <p className="text-xs text-muted-foreground">
                Combine essa senha com o cliente — ele poderá trocá-la depois em Configurações.
              </p>
            </div>
            <Button type="submit" className="mt-2">
              Salvar cliente
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
