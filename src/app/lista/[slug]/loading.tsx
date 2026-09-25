import { PageLoading } from "@/components/ui/loading-spinner";

export default function PublicListLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <PageLoading label="Carregando a lista..." />
    </div>
  );
}
