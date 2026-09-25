"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { useCart } from "@/components/cart/cart-context";
import { checkoutOnlineAction, generateGiftMessageAction } from "@/modules/checkout/actions";
import { formatCentsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  list_not_found: "Esta lista não está mais disponível.",
  list_not_active: "Esta lista não está recebendo novos presentes no momento.",
  item_not_found:
    "Um dos itens do carrinho não foi encontrado — atualize o carrinho e tente novamente.",
};

export function CheckoutForm({
  slug,
  pin,
  listTitle,
  babyName,
  readOnly,
  errorCode,
  errorItemName,
}: {
  slug: string;
  pin?: string;
  listTitle: string;
  babyName: string | null;
  readOnly: boolean;
  errorCode?: string;
  errorItemName?: string;
}) {
  const { lines, subtotal } = useCart();
  const [message, setMessage] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [isGenerating, startGenerating] = useTransition();

  const cartHref = `/lista/${slug}/carrinho${pin ? `?pin=${pin}` : ""}`;

  const errorMessage = errorCode
    ? errorCode === "item_unavailable" && errorItemName
      ? `O item "${errorItemName}" não está mais disponível. Remova-o do carrinho e tente novamente.`
      : (ERROR_MESSAGES[errorCode] ?? "Não foi possível concluir o pedido.")
    : null;

  if (readOnly) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground">
          Esta lista não está mais recebendo novos presentes no momento.
        </p>
        <Button asChild variant="secondary">
          <Link href={`/lista/${slug}`}>Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Button asChild>
          <Link href={`/lista/${slug}`}>Ver a lista de presentes</Link>
        </Button>
      </div>
    );
  }

  function handleGenerateMessage() {
    startGenerating(async () => {
      const result = await generateGiftMessageAction({
        babyName,
        listTitle,
        itemNames: lines.map((line) => line.productName),
        buyerName: buyerName || undefined,
      });
      if ("message" in result) setMessage(result.message);
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <Link
        href={cartHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para o carrinho
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-foreground">Finalizar presente</h1>
      <p className="mb-6 text-sm text-muted-foreground">{listTitle}</p>

      {errorMessage && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {lines.map((line) => (
            <div key={line.itemId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {line.quantity}x {line.productName}
                {line.variantLabel && (
                  <span className="text-muted-foreground"> ({line.variantLabel})</span>
                )}
              </span>
              <span className="font-medium text-foreground">
                {formatCentsToBRL(line.price * line.quantity)}
              </span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>{formatCentsToBRL(subtotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={checkoutOnlineAction.bind(null, slug)} className="flex flex-col gap-4">
            {lines.map((line) => (
              <div key={line.itemId}>
                <input type="hidden" name="itemId" value={line.itemId} />
                <input type="hidden" name="quantity" value={line.quantity} />
              </div>
            ))}
            {pin && <input type="hidden" name="pin" value={pin} />}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyerName">Seu nome</Label>
              <Input
                id="buyerName"
                name="buyerName"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buyerPhone">Telefone (opcional)</Label>
                <Input id="buyerPhone" name="buyerPhone" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buyerEmail">E-mail</Label>
                <Input id="buyerEmail" name="buyerEmail" type="email" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="message">Mensagem carinhosa para os pais (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMessage}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <LoadingSpinner className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Gerar mensagem com IA
                </Button>
              </div>
              <Textarea
                id="message"
                name="message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva uma mensagem carinhosa ou gere uma automaticamente..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="hideBuyerFromParents" name="hideBuyerFromParents" />
              <Label htmlFor="hideBuyerFromParents">
                Presentear anonimamente (pais não verão o nome)
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Depois de confirmar, você paga com cartão de crédito, débito ou Pix numa página
              segura do Mercado Pago.
            </p>

            <SubmitButton size="lg" className="mt-2">
              Confirmar presente
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
