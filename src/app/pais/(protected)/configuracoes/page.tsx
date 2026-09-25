import { requireParentPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getParentPrimaryList } from "@/modules/gift-lists/parent-view";
import { formatDateForInput } from "@/lib/dates";
import {
  changeParentPasswordAction,
  updateBabyInfoAction,
  updateParentProfileAction,
} from "@/modules/gift-lists/parent-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  invalid_password: "A nova senha deve ter pelo menos 6 caracteres.",
  wrong_current_password: "Senha atual incorreta.",
  invalid_baby: "Não foi possível salvar os dados do bebê.",
};

export default async function ParentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireParentPage();
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível salvar.") : null;

  const [customer, list] = await Promise.all([
    prisma.customer.findUnique({ where: { id: session.customerId } }),
    getParentPrimaryList(session.parentId),
  ]);
  if (!customer) return null;

  const updateBabyWithId = list ? updateBabyInfoAction.bind(null, list.id) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Alterações salvas.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateParentProfileAction} className="flex flex-col gap-4">
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
            <SubmitButton className="self-start">
              Salvar dados
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {list && updateBabyWithId && (
        <Card>
          <CardHeader>
            <CardTitle>Dados do bebê</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateBabyWithId} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" defaultValue={list.baby.name ?? ""} />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="nameUndefined"
                    name="nameUndefined"
                    defaultChecked={list.baby.nameUndefined}
                  />
                  <Label htmlFor="nameUndefined">Nome ainda não definido</Label>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sex">Sexo</Label>
                  <Select id="sex" name="sex" defaultValue={list.baby.sex}>
                    <option value="NOT_INFORMED">Não informado</option>
                    <option value="FEMALE">Feminino</option>
                    <option value="MALE">Masculino</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expectedBirthDate">Previsão de nascimento</Label>
                  <Input
                    id="expectedBirthDate"
                    name="expectedBirthDate"
                    type="date"
                    defaultValue={
                      list.baby.expectedBirthDate ? formatDateForInput(list.baby.expectedBirthDate) : ""
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="showerDate">Data do chá</Label>
                  <Input
                    id="showerDate"
                    name="showerDate"
                    type="date"
                    defaultValue={list.baby.showerDate ? formatDateForInput(list.baby.showerDate) : ""}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="theme">Tema</Label>
                <Input id="theme" name="theme" defaultValue={list.baby.theme ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Mensagem exibida na lista pública</Label>
                <Textarea id="message" name="message" rows={2} defaultValue={list.baby.message ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="photoUrl">URL da foto (opcional)</Label>
                <Input id="photoUrl" name="photoUrl" defaultValue={list.baby.photoUrl ?? ""} />
              </div>
              <SubmitButton variant="secondary" className="self-start">
                Salvar dados do bebê
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={changeParentPasswordAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" name="newPassword" type="password" minLength={6} required />
            </div>
            <SubmitButton variant="secondary" className="self-start">
              Alterar senha
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
