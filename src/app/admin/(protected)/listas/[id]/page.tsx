import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaffPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/money";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { encodeProductOption } from "@/modules/gift-lists/schemas";
import {
  addGiftListItemAction,
  addGiftListParentAction,
  cancelGiftListAction,
  closeGiftListAction,
  pauseGiftListAction,
  publishGiftListAction,
  toggleGiftListItemActiveAction,
  updateGiftListAction,
} from "@/modules/gift-lists/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  MOTHER: "Mãe",
  FATHER: "Pai",
  GUARDIAN: "Responsável",
};

const PRIORITY_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  DESIRED: "Escolha dos pais",
  ESSENTIAL: "Item essencial",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Preencha os campos obrigatórios corretamente.",
  missing_pin: "Informe um PIN de acesso para listas protegidas por PIN.",
  invalid_status: "Essa ação não é permitida no status atual da lista.",
  forbidden: "Você não tem permissão para essa ação.",
  customer_not_found: "Cliente não encontrado. Cadastre-o antes em Clientes.",
  duplicate_parent: "Esse cliente já é responsável por esta lista.",
  not_found: "Item não encontrado.",
};

function variantLabel(attributes: unknown): string {
  if (!attributes || typeof attributes !== "object") return "";
  const attrs = attributes as Record<string, string>;
  const parts = Object.values(attrs).filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

export default async function GiftListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireStaffPage();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? "Não foi possível concluir a ação.") : null;

  const list = await prisma.giftList.findUnique({
    where: { id },
    include: {
      baby: true,
      store: true,
      consultant: true,
      parents: { include: { parent: { include: { customer: true } } } },
      items: {
        include: { product: true, variant: true },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        include: { buyer: true, items: { include: { product: true, variant: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!list) notFound();
  if (session.role === "SELLER" && list.consultantId !== session.userId) notFound();

  const [stores, staff, products] = await Promise.all([
    prisma.store.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      include: { variants: { where: { active: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const canEditMeta = session.role !== "SELLER" || list.consultantId === session.userId;
  const canClose = session.role === "ADMIN";
  const updateWithId = updateGiftListAction.bind(null, list.id);
  const addParentWithId = addGiftListParentAction.bind(null, list.id);
  const addItemWithId = addGiftListItemAction.bind(null, list.id);
  const cancelWithId = cancelGiftListAction.bind(null, list.id);

  const productOptions = products.flatMap((product) =>
    product.variants.length > 0
      ? product.variants.map((variant) => ({
          value: encodeProductOption(product.id, variant.id),
          label: `${product.name}${variantLabel(variant.attributes)}`,
        }))
      : [{ value: encodeProductOption(product.id), label: product.name }],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{list.title}</h1>
            <Badge>{STATUS_LABEL[list.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Código {list.publicId} · /lista/{list.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/admin/listas/${list.id}/venda`}>Registrar venda presencial</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/lista/${list.slug}`} target="_blank">
              Ver página pública
            </Link>
          </Button>
          {(list.status === "DRAFT" || list.status === "PAUSED") && (
            <form action={publishGiftListAction.bind(null, list.id)}>
              <Button type="submit">Publicar</Button>
            </form>
          )}
          {list.status === "ACTIVE" && (
            <form action={pauseGiftListAction.bind(null, list.id)}>
              <Button type="submit" variant="outline">
                Pausar
              </Button>
            </form>
          )}
          {canClose && list.status !== "CLOSED" && list.status !== "CANCELLED" && (
            <form action={closeGiftListAction.bind(null, list.id)}>
              <Button type="submit" variant="outline">
                Encerrar
              </Button>
            </form>
          )}
        </div>
      </div>

      {message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
      )}
      {saved && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Alterações salvas.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bebê</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p className="text-base font-medium text-foreground">
              {list.baby.nameUndefined ? "Nome ainda não definido" : (list.baby.name ?? "—")}
            </p>
            <p className="text-muted-foreground">
              Previsão: {list.baby.expectedBirthDate ? formatDateOnly(list.baby.expectedBirthDate) : "—"}
            </p>
            <p className="text-muted-foreground">
              Chá: {list.baby.showerDate ? formatDateOnly(list.baby.showerDate) : "—"}
            </p>
            {list.baby.theme && <p className="text-muted-foreground">Tema: {list.baby.theme}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2 text-sm">
              {list.parents.map((gp) => (
                <li key={gp.id} className="flex items-center justify-between">
                  <span>
                    {gp.parent.customer.name}{" "}
                    <span className="text-muted-foreground">({RELATIONSHIP_LABEL[gp.relationship]})</span>
                  </span>
                  {gp.isPrimary && <Badge variant="secondary">Principal</Badge>}
                </li>
              ))}
            </ul>
            <form action={addParentWithId} className="flex flex-col gap-2 border-t border-border pt-3">
              <Label htmlFor="customerId" className="text-xs text-muted-foreground">
                Adicionar responsável (cliente já cadastrado)
              </Label>
              <div className="flex gap-2">
                <Input id="customerId" name="customerId" placeholder="ID do cliente" className="flex-1" />
                <Select name="relationship" defaultValue="GUARDIAN" className="w-40">
                  <option value="MOTHER">Mãe</option>
                  <option value="FATHER">Pai</option>
                  <option value="GUARDIAN">Responsável</option>
                </Select>
                <Button type="submit" variant="secondary">
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Busque o ID em{" "}
                <Link href="/admin/clientes" className="underline">
                  Clientes
                </Link>
                .
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {canEditMeta && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações da lista</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWithId} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={list.title} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="storeId">Unidade</Label>
                  <Select id="storeId" name="storeId" required defaultValue={list.storeId}>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="consultantId">Consultor</Label>
                  <Select id="consultantId" name="consultantId" required defaultValue={list.consultantId}>
                    {staff.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="visibility">Visibilidade</Label>
                  <Select id="visibility" name="visibility" defaultValue={list.visibility}>
                    <option value="PUBLIC_LINK">Link público</option>
                    <option value="PIN_PROTECTED">Protegida por PIN</option>
                    <option value="PRIVATE">Privada</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="accessPin">PIN de acesso</Label>
                  <Input id="accessPin" name="accessPin" defaultValue={list.accessPin ?? ""} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showPublicProgress"
                  name="showPublicProgress"
                  defaultChecked={list.showPublicProgress}
                />
                <Label htmlFor="showPublicProgress">Mostrar progresso geral publicamente</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showGiftValuesToParents"
                  name="showGiftValuesToParents"
                  defaultChecked={list.showGiftValuesToParents}
                />
                <Label htmlFor="showGiftValuesToParents">Mostrar valores dos presentes aos pais</Label>
              </div>
              <Button type="submit" variant="secondary" className="self-start">
                Salvar configurações
              </Button>
            </form>

            {session.role === "ADMIN" && list.status !== "CANCELLED" && (
              <form action={cancelWithId} className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
                <Label htmlFor="reason" className="text-xs text-muted-foreground">
                  Cancelar lista (ação irreversível)
                </Label>
                <div className="flex gap-2">
                  <Input id="reason" name="reason" placeholder="Motivo do cancelamento" className="flex-1" />
                  <Button type="submit" variant="destructive">
                    Cancelar lista
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Produtos da lista</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Desejado</TableHead>
                  <TableHead>Comprado</TableHead>
                  <TableHead>Reservado</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.map((item) => {
                  const available = item.desiredQuantity - item.purchasedQuantity - item.reservedQuantity;
                  const price = item.variant?.priceOverride ?? item.product.promoPrice ?? item.product.price;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                        {variantLabel(item.variant?.attributes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {PRIORITY_LABEL[item.priority]}
                      </TableCell>
                      <TableCell>{item.desiredQuantity}</TableCell>
                      <TableCell>{item.purchasedQuantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.reservedQuantity}</TableCell>
                      <TableCell className={available <= 0 ? "text-muted-foreground" : "font-medium"}>
                        {Math.max(available, 0)}
                      </TableCell>
                      <TableCell>{formatCentsToBRL(price)}</TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "success" : "secondary"}>
                          {item.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/listas/${list.id}/itens/${item.id}`}>Editar</Link>
                        </Button>
                        <form action={toggleGiftListItemActiveAction.bind(null, list.id, item.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {item.active ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum produto adicionado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <form action={addItemWithId} className="grid gap-4 sm:grid-cols-4 sm:items-end">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="productOption">Produto</Label>
              <Select id="productOption" name="productOption" required defaultValue="">
                <option value="" disabled>
                  Selecione...
                </option>
                {productOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desiredQuantity">Quantidade desejada</Label>
              <Input id="desiredQuantity" name="desiredQuantity" type="number" min="1" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <Select id="priority" name="priority" defaultValue="NORMAL">
                <option value="NORMAL">Normal</option>
                <option value="DESIRED">Escolha dos pais</option>
                <option value="ESSENTIAL">Item essencial</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <Label htmlFor="notes">Observação (opcional)</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <Button type="submit" variant="secondary">
              Adicionar produto
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.orders.map((order) => {
                  const isCancelled = order.paymentStatus === "CANCELLED" || order.paymentStatus === "REFUNDED";
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.items
                          .map((item) => `${item.product.name}${variantLabel(item.variant?.attributes)}`)
                          .join(", ")}
                      </TableCell>
                      <TableCell>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                      <TableCell>
                        {order.hideBuyerFromParents ? `${order.buyer.name} (anônimo p/ os pais)` : order.buyer.name}
                      </TableCell>
                      <TableCell>{formatCentsToBRL(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={isCancelled ? "destructive" : "success"}>
                          {isCancelled ? "Cancelado" : "Aprovado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/vendas/${order.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma venda registrada ainda para esta lista.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
