"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "./button";
import { LoadingSpinner } from "./loading-spinner";

/**
 * Botão de submit com estado de carregamento (useFormStatus) — mostra um
 * spinner e desabilita enquanto a Server Action do <form> ancestral está
 * em andamento, para que o clique nunca pareça travado.
 */
function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending || disabled} {...props} type="submit">
      {pending && <LoadingSpinner />}
      {children}
    </Button>
  );
}

export { SubmitButton };
