"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getParentSession } from "@/lib/auth/current-user";
import { customerSchema, babySchema, toOptionalDate } from "@/modules/people/schemas";

async function requireParent() {
  const session = await getParentSession();
  if (!session) redirect("/pais/login");
  return session;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateParentProfileAction(formData: FormData): Promise<void> {
  const session = await requireParent();

  const parsed = customerSchema.safeParse({
    name: field(formData, "name"),
    phone: field(formData, "phone"),
    whatsapp: field(formData, "whatsapp") || undefined,
    email: field(formData, "email") || undefined,
    cpf: field(formData, "cpf") || undefined,
    cep: field(formData, "cep") || undefined,
    street: field(formData, "street") || undefined,
    city: field(formData, "city") || undefined,
    state: field(formData, "state") || undefined,
  });
  if (!parsed.success) redirect("/pais/configuracoes?error=invalid_input");

  await prisma.customer.update({
    where: { id: session.customerId },
    data: { ...parsed.data, email: parsed.data.email || null },
  });

  revalidatePath("/pais/configuracoes");
  redirect("/pais/configuracoes?saved=1");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
});

export async function changeParentPasswordAction(formData: FormData): Promise<void> {
  const session = await requireParent();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: field(formData, "currentPassword"),
    newPassword: field(formData, "newPassword"),
  });
  if (!parsed.success) redirect("/pais/configuracoes?error=invalid_password");

  const parent = await prisma.parent.findUnique({ where: { id: session.parentId } });
  if (!parent?.passwordHash || !(await verifyPassword(parsed.data.currentPassword, parent.passwordHash))) {
    redirect("/pais/configuracoes?error=wrong_current_password");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.parent.update({ where: { id: session.parentId }, data: { passwordHash } });

  redirect("/pais/configuracoes?saved=1");
}

export async function updateBabyInfoAction(listId: string, formData: FormData): Promise<void> {
  const session = await requireParent();

  const membership = await prisma.giftListParent.findFirst({
    where: { parentId: session.parentId, giftListId: listId },
    select: { giftList: { select: { babyId: true } } },
  });
  if (!membership) redirect("/pais");

  const parsed = babySchema.safeParse({
    name: field(formData, "name") || undefined,
    nameUndefined: formData.get("nameUndefined") === "on",
    sex: field(formData, "sex") || undefined,
    expectedBirthDate: field(formData, "expectedBirthDate") || undefined,
    showerDate: field(formData, "showerDate") || undefined,
    photoUrl: field(formData, "photoUrl") || undefined,
    message: field(formData, "message") || undefined,
    theme: field(formData, "theme") || undefined,
  });
  if (!parsed.success) redirect("/pais/configuracoes?error=invalid_baby");
  const data = parsed.data;

  await prisma.baby.update({
    where: { id: membership.giftList.babyId },
    data: {
      name: data.nameUndefined ? null : data.name || null,
      nameUndefined: data.nameUndefined,
      sex: data.sex,
      expectedBirthDate: toOptionalDate(data.expectedBirthDate) ?? null,
      showerDate: toOptionalDate(data.showerDate) ?? null,
      photoUrl: data.photoUrl || null,
      message: data.message || null,
      theme: data.theme || null,
    },
  });

  revalidatePath("/pais/configuracoes");
  revalidatePath("/pais");
  redirect("/pais/configuracoes?saved=1");
}
