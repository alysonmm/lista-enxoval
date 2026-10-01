// A mesma mensagem vale para lista inexistente, em rascunho, cancelada ou
// privada — de propósito, para não revelar qual é o caso a quem só tem o link.
export default function GiftListNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Ponto das Crianças" className="mb-4 size-14 rounded-full" />
      <h1 className="text-lg font-bold text-foreground">Lista não disponível</h1>
      <p className="mt-2 max-w-sm text-balance text-sm text-muted-foreground">
        Não encontramos esta lista de presentes. Confira se o link está completo ou fale com
        quem te enviou — se a lista acabou de ser criada, talvez ainda não tenha sido publicada.
      </p>
    </div>
  );
}
