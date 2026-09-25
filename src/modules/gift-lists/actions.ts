"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GiftList } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp, getStaffSession, type StaffSessionPayload } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generatePublicId, generateUniqueGiftListSlug } from "@/lib/slug";
import { toOptionalDate } from "@/modules/people/schemas";
import {
  createGiftListSchema,
  decodeProductOption,
  giftListItemSchema,
  newResponsibleSchema,
  updateGiftListItemSchema,
  updateGiftListSchema,
} from "./schemas";

async function requireStaff(): Promise<StaffSessionPayload> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Garante que o funcionário pode gerenciar esta lista (dono ou ADMIN/MANAGER). */
async function requireListAccess(listId: string, session: StaffSessionPayload): Promise<GiftList> {
  const list = await prisma.giftList.findUnique({ where: { id: listId } });
  if (!list) redirect("/admin/listas?error=not_found");
  if (session.role === "SELLER" && list.consultantId !== session.userId) {
    redirect("/admin/listas?error=forbidden");
  }
  return list;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Criação (bebê + responsável + lista, em uma transação)
// ---------------------------------------------------------------------------

export async function createGiftListAction(formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = createGiftListSchema.safeParse({
    title: field(formData, "title"),
    storeId: field(formData, "storeId"),
    consultantId: field(formData, "consultantId"),
    visibility: field(formData, "visibility") || undefined,
    accessPin: field(formData, "accessPin") || undefined,
    relationship: field(formData, "relationship"),
    customerId: field(formData, "customerId") || undefined,
    name: field(formData, "babyName") || undefined,
    nameUndefined: formData.get("nameUndefined") === "on",
    sex: field(formData, "sex") || undefined,
    expectedBirthDate: field(formData, "expectedBirthDate") || undefined,
    showerDate: field(formData, "showerDate") || undefined,
    photoUrl: field(formData, "photoUrl") || undefined,
    message: field(formData, "message") || undefined,
    theme: field(formData, "theme") || undefined,
  });
  if (!parsed.success) redirect("/admin/listas/nova?error=invalid_input");
  const data = parsed.data;

  if (data.visibility === "PIN_PROTECTED" && !data.accessPin) {
    redirect("/admin/listas/nova?error=missing_pin");
  }
  if (session.role === "SELLER" && data.consultantId !== session.userId) {
    redirect("/admin/listas/nova?error=forbidden");
  }

  let newResponsible: ReturnType<typeof newResponsibleSchema.safeParse> | null = null;
  if (!data.customerId) {
    newResponsible = newResponsibleSchema.safeParse({
      name: field(formData, "responsibleName"),
      phone: field(formData, "responsiblePhone"),
      whatsapp: field(formData, "responsibleWhatsapp") || undefined,
      email: field(formData, "responsibleEmail") || undefined,
      cpf: field(formData, "responsibleCpf") || undefined,
      password: field(formData, "responsiblePassword"),
    });
    if (!newResponsible.success) redirect("/admin/listas/nova?error=invalid_responsible");
  }

  const babyName = data.nameUndefined ? null : data.name || null;

  const giftList = await prisma.$transaction(async (tx) => {
    let parentId: string;

    if (data.customerId) {
      const parent = await tx.parent.findUnique({ where: { customerId: data.customerId } });
      if (!parent) redirect("/admin/listas/nova?error=customer_not_found");
      parentId = parent.id;
    } else {
      const responsibleData = newResponsible!.success ? newResponsible!.data : null;
      if (!responsibleData) redirect("/admin/listas/nova?error=invalid_responsible");
      const passwordHash = await hashPassword(responsibleData.password);
      const customer = await tx.customer.create({
        data: {
          name: responsibleData.name,
          phone: responsibleData.phone,
          whatsapp: responsibleData.whatsapp || null,
          email: responsibleData.email || null,
          cpf: responsibleData.cpf || null,
          parent: { create: { passwordHash } },
        },
        include: { parent: true },
      });
      parentId = customer.parent!.id;
    }

    const baby = await tx.baby.create({
      data: {
        name: babyName,
        nameUndefined: data.nameUndefined,
        sex: data.sex,
        expectedBirthDate: toOptionalDate(data.expectedBirthDate) ?? null,
        showerDate: toOptionalDate(data.showerDate) ?? null,
        photoUrl: data.photoUrl || null,
        message: data.message || null,
        theme: data.theme || null,
      },
    });

    const slug = await generateUniqueGiftListSlug(data.title);
    const publicId = generatePublicId(babyName);

    return tx.giftList.create({
      data: {
        publicId,
        slug,
        title: data.title,
        babyId: baby.id,
        storeId: data.storeId,
        consultantId: data.consultantId,
        visibility: data.visibility,
        accessPin: data.visibility === "PIN_PROTECTED" ? data.accessPin : null,
        createdById: session.userId,
        parents: { create: { parentId, relationship: data.relationship, isPrimary: true } },
      },
    });
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.create",
    entityType: "GiftList",
    entityId: giftList.id,
    changes: { title: data.title },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/listas");
  redirect(`/admin/listas/${giftList.id}`);
}

// ---------------------------------------------------------------------------
// Edição e ciclo de vida
// ---------------------------------------------------------------------------

export async function updateGiftListAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  const parsed = updateGiftListSchema.safeParse({
    title: field(formData, "title"),
    storeId: field(formData, "storeId"),
    consultantId: field(formData, "consultantId"),
    visibility: field(formData, "visibility"),
    accessPin: field(formData, "accessPin") || undefined,
    showPublicProgress: formData.get("showPublicProgress") === "on",
    showGiftValuesToParents: formData.get("showGiftValuesToParents") === "on",
  });
  if (!parsed.success) redirect(`/admin/listas/${listId}?error=invalid_input`);
  const data = parsed.data;
  if (data.visibility === "PIN_PROTECTED" && !data.accessPin) {
    redirect(`/admin/listas/${listId}?error=missing_pin`);
  }

  await prisma.giftList.update({
    where: { id: listId },
    data: {
      title: data.title,
      storeId: data.storeId,
      consultantId: data.consultantId,
      visibility: data.visibility,
      accessPin: data.visibility === "PIN_PROTECTED" ? data.accessPin : null,
      showPublicProgress: data.showPublicProgress,
      showGiftValuesToParents: data.showGiftValuesToParents,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.update",
    entityType: "GiftList",
    entityId: listId,
    changes: data,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

export async function publishGiftListAction(listId: string): Promise<void> {
  const session = await requireStaff();
  const list = await requireListAccess(listId, session);
  if (list.status !== "DRAFT" && list.status !== "PAUSED") {
    redirect(`/admin/listas/${listId}?error=invalid_status`);
  }

  await prisma.giftList.update({ where: { id: listId }, data: { status: "ACTIVE" } });
  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.publish",
    entityType: "GiftList",
    entityId: listId,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

export async function pauseGiftListAction(listId: string): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  await prisma.giftList.update({ where: { id: listId }, data: { status: "PAUSED" } });
  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.pause",
    entityType: "GiftList",
    entityId: listId,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

export async function closeGiftListAction(listId: string): Promise<void> {
  const session = await requireStaff();
  if (session.role !== "ADMIN") redirect(`/admin/listas/${listId}?error=forbidden`);

  await prisma.giftList.update({
    where: { id: listId },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.close",
    entityType: "GiftList",
    entityId: listId,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

export async function cancelGiftListAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();
  if (session.role !== "ADMIN") {
    const allowed = await hasPermission(session, PERMISSIONS.LISTS_CANCEL);
    if (!allowed) redirect(`/admin/listas/${listId}?error=forbidden`);
  }

  const reason = field(formData, "reason").trim();
  await prisma.giftList.update({ where: { id: listId }, data: { status: "CANCELLED" } });
  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.cancel",
    entityType: "GiftList",
    entityId: listId,
    changes: { reason },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

// ---------------------------------------------------------------------------
// Segundo responsável
// ---------------------------------------------------------------------------

export async function addGiftListParentAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  const customerId = field(formData, "customerId");
  const relationship = field(formData, "relationship");
  if (!customerId || !["MOTHER", "FATHER", "GUARDIAN"].includes(relationship)) {
    redirect(`/admin/listas/${listId}?error=invalid_input`);
  }

  const parent = await prisma.parent.findUnique({ where: { customerId } });
  if (!parent) redirect(`/admin/listas/${listId}?error=customer_not_found`);

  try {
    await prisma.giftListParent.create({
      data: {
        giftListId: listId,
        parentId: parent.id,
        relationship: relationship as "MOTHER" | "FATHER" | "GUARDIAN",
      },
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      redirect(`/admin/listas/${listId}?error=duplicate_parent`);
    }
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list.add_parent",
    entityType: "GiftList",
    entityId: listId,
    changes: { customerId, relationship },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

// ---------------------------------------------------------------------------
// Itens da lista
// ---------------------------------------------------------------------------

export async function addGiftListItemAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  const productOption = field(formData, "productOption");
  const { productId, variantId } = decodeProductOption(productOption);

  const parsed = giftListItemSchema.safeParse({
    productId,
    variantId: variantId || undefined,
    desiredQuantity: field(formData, "desiredQuantity"),
    priority: field(formData, "priority") || undefined,
    notes: field(formData, "notes") || undefined,
  });
  if (!parsed.success) redirect(`/admin/listas/${listId}?error=invalid_input`);
  const data = parsed.data;

  await prisma.giftListItem.create({
    data: {
      giftListId: listId,
      productId: data.productId,
      variantId: data.variantId || null,
      desiredQuantity: data.desiredQuantity,
      priority: data.priority,
      notes: data.notes || null,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list_item.create",
    entityType: "GiftList",
    entityId: listId,
    changes: data,
    ipAddress: await getClientIp(),
  });

  // Sem redirect: revalida e permanece na mesma página, para que adicionar
  // um produto atualize só a tabela de itens em vez de recarregar a tela
  // inteira (que aqui também busca loja, equipe, todos os produtos e gera
  // o QR Code — um custo alto para repetir a cada item adicionado).
  revalidatePath(`/admin/listas/${listId}`);
}

export async function updateGiftListItemAction(
  listId: string,
  itemId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  const parsed = updateGiftListItemSchema.safeParse({
    desiredQuantity: field(formData, "desiredQuantity"),
    priority: field(formData, "priority"),
    notes: field(formData, "notes") || undefined,
  });
  if (!parsed.success) redirect(`/admin/listas/${listId}?error=invalid_input`);
  const data = parsed.data;

  const current = await prisma.giftListItem.findUnique({ where: { id: itemId } });
  if (!current) redirect(`/admin/listas/${listId}?error=not_found`);
  if (data.desiredQuantity < current.purchasedQuantity + current.reservedQuantity) {
    redirect(`/admin/listas/${listId}?error=invalid_input`);
  }

  await prisma.giftListItem.update({
    where: { id: itemId },
    data: { desiredQuantity: data.desiredQuantity, priority: data.priority, notes: data.notes || null },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "gift_list_item.update",
    entityType: "GiftListItem",
    entityId: itemId,
    changes: data,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}?saved=1`);
}

export async function toggleGiftListItemActiveAction(listId: string, itemId: string): Promise<void> {
  const session = await requireStaff();
  await requireListAccess(listId, session);

  const item = await prisma.giftListItem.findUnique({ where: { id: itemId } });
  if (!item) redirect(`/admin/listas/${listId}?error=not_found`);

  await prisma.giftListItem.update({ where: { id: itemId }, data: { active: !item.active } });
  await recordAudit({
    actorUserId: session.userId,
    action: item.active ? "gift_list_item.deactivate" : "gift_list_item.activate",
    entityType: "GiftListItem",
    entityId: itemId,
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/listas/${listId}`);
  redirect(`/admin/listas/${listId}`);
}
