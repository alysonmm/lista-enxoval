"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "./button";

type CopyState = "idle" | "copied" | "failed";

function copyWithTextarea(text: string): boolean {
  // Plano B para navegadores sem a Clipboard API (ou com ela bloqueada):
  // seleciona o texto num textarea invisível e usa o comando de copiar.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Copia `value` para a área de transferência e confirma no próprio botão. */
function CopyButton({
  value,
  label = "Copiar link",
  copiedLabel = "Link copiado!",
  ...props
}: Omit<ButtonProps, "onClick" | "children"> & {
  value: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function handleClick() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      ok = copyWithTextarea(value);
    }
    setState(ok ? "copied" : "failed");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <Button type="button" onClick={handleClick} {...props}>
      {state === "copied" ? <Check /> : <Copy />}
      {state === "copied" ? copiedLabel : state === "failed" ? "Não foi possível copiar" : label}
    </Button>
  );
}

export { CopyButton };
