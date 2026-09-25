import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin", className)} />;
}

function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoadingSpinner className="size-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export { LoadingSpinner, PageLoading };
