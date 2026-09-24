import { requireParentPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateOnly } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  AVAILABLE: "Disponível",
  PARTIALLY_USED: "Parcialmente usado",
  USED: "Utilizado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

export default async function BenefitsPage() {
  const session = await requireParentPage();

  const credits = await prisma.customerCredit.findMany({
    where: { parentId: session.parentId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Benefícios</h1>
      {credits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Você ainda não tem créditos ou benefícios. Continue divulgando sua lista — conforme os
            presentes chegam, benefícios podem ser liberados pela Ponto das Crianças.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {credits.map((credit) => (
            <Card key={credit.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-foreground">{formatCentsToBRL(credit.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatDateOnly(credit.createdAt)}
                    {credit.expiresAt && ` · Válido até ${formatDateOnly(credit.expiresAt)}`}
                  </p>
                </div>
                <Badge variant={credit.status === "AVAILABLE" ? "success" : "secondary"}>
                  {STATUS_LABEL[credit.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
