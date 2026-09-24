import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createGiftListAction } from "@/modules/gift-lists/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  invalid_responsible: "Preencha os dados do responsável (nome, telefone e senha com 6+ caracteres).",
  missing_pin: "Informe um PIN de acesso para listas protegidas por PIN.",
  forbidden: "Você só pode criar listas em seu próprio nome como consultor.",
  customer_not_found: "Cliente não encontrado.",
};

export default async function NewGiftListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customerId?: string }>;
}) {
  const session = await requireStaffPage();
  const { error, customerId } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const [stores, staff, existingCustomer] = await Promise.all([
    prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    customerId
      ? prisma.customer.findUnique({ where: { id: customerId }, include: { parent: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Nova lista de enxoval</h1>

      <form action={createGiftListAction} className="flex flex-col gap-6">
        {message && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Bebê</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="babyName">Nome do bebê</Label>
                <Input id="babyName" name="babyName" placeholder="Helena" />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox id="nameUndefined" name="nameUndefined" />
                <Label htmlFor="nameUndefined">Nome ainda não definido</Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sex">Sexo</Label>
                <Select id="sex" name="sex" defaultValue="NOT_INFORMED">
                  <option value="NOT_INFORMED">Não informado</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="MALE">Masculino</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expectedBirthDate">Previsão de nascimento</Label>
                <Input id="expectedBirthDate" name="expectedBirthDate" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="showerDate">Data do chá</Label>
                <Input id="showerDate" name="showerDate" type="date" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme">Tema (opcional)</Label>
              <Input id="theme" name="theme" placeholder="Nuvens, Safári, Jardim..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="message">Mensagem dos pais (opcional)</Label>
              <Textarea
                id="message"
                name="message"
                rows={2}
                placeholder="Estamos preparando tudo para a chegada..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsável</CardTitle>
            <CardDescription>
              {existingCustomer
                ? "Cliente já cadastrado — será o primeiro responsável pela lista."
                : "Cadastre o responsável principal. Ele receberá acesso ao portal dos pais."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {existingCustomer ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <input type="hidden" name="customerId" value={existingCustomer.id} />
                <p className="font-medium text-foreground">{existingCustomer.name}</p>
                <p className="text-muted-foreground">{existingCustomer.phone}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="responsibleName">Nome</Label>
                    <Input id="responsibleName" name="responsibleName" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="responsiblePhone">Telefone</Label>
                    <Input id="responsiblePhone" name="responsiblePhone" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="responsibleWhatsapp">WhatsApp</Label>
                    <Input id="responsibleWhatsapp" name="responsibleWhatsapp" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="responsibleEmail">E-mail</Label>
                    <Input id="responsibleEmail" name="responsibleEmail" type="email" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="responsibleCpf">CPF (opcional)</Label>
                  <Input id="responsibleCpf" name="responsibleCpf" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="responsiblePassword">Senha de acesso ao portal dos pais</Label>
                  <Input
                    id="responsiblePassword"
                    name="responsiblePassword"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="relationship">Relacionamento com o bebê</Label>
              <Select id="relationship" name="relationship" defaultValue="MOTHER">
                <option value="MOTHER">Mãe</option>
                <option value="FATHER">Pai</option>
                <option value="GUARDIAN">Responsável</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título da lista</Label>
              <Input id="title" name="title" required placeholder="Enxoval da Helena" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="storeId">Unidade responsável</Label>
                <Select id="storeId" name="storeId" required defaultValue={session.storeId ?? ""}>
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
                <Label htmlFor="consultantId">Consultor de enxoval</Label>
                <Select id="consultantId" name="consultantId" required defaultValue={session.userId}>
                  {staff.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="visibility">Visibilidade</Label>
                <Select id="visibility" name="visibility" defaultValue="PUBLIC_LINK">
                  <option value="PUBLIC_LINK">Link público (padrão)</option>
                  <option value="PIN_PROTECTED">Protegida por PIN</option>
                  <option value="PRIVATE">Privada</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accessPin">PIN de acesso (se protegida)</Label>
                <Input id="accessPin" name="accessPin" placeholder="0000" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="self-start">
          Criar lista
        </Button>
      </form>
    </div>
  );
}
