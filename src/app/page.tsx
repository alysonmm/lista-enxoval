import Link from "next/link";
import { Heart, Store, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
          <Heart className="size-4" />
          Ponto das Crianças
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Lista de Enxoval
        </h1>
        <p className="mt-4 max-w-xl text-balance text-muted-foreground">
          Crie a lista de enxoval do seu bebê, compartilhe com quem você ama e
          acompanhe cada presente — online ou em qualquer uma das nossas lojas.
        </p>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <Users className="size-8 text-primary" />
              <h2 className="text-lg font-semibold">Sou pai/mãe</h2>
              <p className="text-sm text-muted-foreground">
                Acompanhe sua lista, veja presentes recebidos e compartilhe o link.
              </p>
              <Button asChild className="mt-2 w-full">
                <Link href="/pais/login">Acessar portal dos pais</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <Store className="size-8 text-primary" />
              <h2 className="text-lg font-semibold">Sou da equipe Ponto das Crianças</h2>
              <p className="text-sm text-muted-foreground">
                Crie listas, registre vendas presenciais e acompanhe relatórios.
              </p>
              <Button asChild variant="secondary" className="mt-2 w-full">
                <Link href="/admin/login">Acessar painel da loja</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Recebeu um link de lista de um familiar ou amigo? Abra o link que você
          recebeu para ver os produtos e presentear.
        </p>
      </div>
    </div>
  );
}
