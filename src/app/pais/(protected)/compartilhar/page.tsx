import { requireParentPage } from "@/lib/auth/current-user";
import { getParentPrimaryList } from "@/modules/gift-lists/parent-view";
import { generateQrCodeDataUrl, getPublicListUrl } from "@/lib/qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export default async function SharePage() {
  const session = await requireParentPage();
  const list = await getParentPrimaryList(session.parentId);

  if (!list) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma lista encontrada.
        </CardContent>
      </Card>
    );
  }

  const url = getPublicListUrl(list.slug);
  const qrDataUrl = await generateQrCodeDataUrl(url);
  const babyName = list.baby.nameUndefined ? null : list.baby.name;
  const message = `Estamos preparando tudo para a chegada${
    babyName ? ` da ${babyName}` : ""
  }! Criamos nossa Lista de Enxoval na Ponto das Crianças. Quem quiser nos presentear pode acessar pelo link abaixo:\n\n${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Compartilhar</h1>

      <Card>
        <CardHeader>
          <CardTitle>Link da lista</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {list.status === "DRAFT" && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              Sua lista ainda não foi publicada pela loja: o link e o QR Code vão funcionar assim que
              ela for publicada. Fale com sua consultora.
            </p>
          )}
          <div className="break-all rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
            {url}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={url} variant="secondary" />
            <Button asChild>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Compartilhar no WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code da lista" className="size-56 rounded-lg border border-border" />
          <Button asChild variant="secondary">
            <a href={qrDataUrl} download={`lista-${list.slug}-qrcode.png`}>
              Baixar QR Code (PNG)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
