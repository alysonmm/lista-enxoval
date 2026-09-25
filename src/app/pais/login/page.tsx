import { loginParentAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha seus dados corretamente.",
  invalid_credentials: "Dados inválidos. Confira e-mail/telefone e senha.",
  locked: "Muitas tentativas. Tente novamente em alguns minutos.",
};

export default async function ParentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível entrar.") : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Ponto das Crianças" className="size-20 rounded-full shadow-sm" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Portal dos pais</CardTitle>
          <CardDescription>Acompanhe a lista de enxoval do seu bebê</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginParentAction} className="flex flex-col gap-4">
            {message && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identifier">E-mail ou telefone</Label>
              <Input id="identifier" name="identifier" type="text" required autoComplete="username" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput id="password" name="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="mt-2">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
