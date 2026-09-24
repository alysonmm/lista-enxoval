"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp, getStaffSession } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { customerSchema, newParentPasswordSchema } from "./schemas";

async function requireStaff() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}

function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

export async function createParentCustomerAction(formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    cpf: formData.get("cpf") || undefined,
    cep: formData.get("cep") || undefined,
    street: formData.get("street") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const passwordParsed = newParentPasswordSchema.safeParse({ password: formData.get("password") });

  if (!parsed.success || !passwordParsed.success) {
    redirect("/admin/clientes/novo?error=invalid_input");
  }

  const passwordHash = await hashPassword(passwordParsed.data.password);

  let customerId: string;
  try {
    const created = await prisma.customer.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        parent: { create: { passwordHash } },
      },
    });
    customerId = created.id;
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect("/admin/clientes/novo?error=duplicate");
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "customer.create",
    entityType: "Customer",
    entityId: customerId,
    changes: { name: parsed.data.name, phone: parsed.data.phone },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${customerId}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    cpf: formData.get("cpf") || undefined,
    cep: formData.get("cep") || undefined,
    street: formData.get("street") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect(`/admin/clientes/${customerId}?error=invalid_input`);

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { ...parsed.data, email: parsed.data.email || null },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect(`/admin/clientes/${customerId}?error=duplicate`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "customer.update",
    entityType: "Customer",
    entityId: customerId,
    changes: { name: parsed.data.name },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/clientes/${customerId}`);
  redirect(`/admin/clientes/${customerId}?saved=1`);
}

export async function resetParentPasswordAction(customerId: string, formData: FormData): Promise<void> {
  const session = await requireStaff();

  const parsed = newParentPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) redirect(`/admin/clientes/${customerId}?error=invalid_password`);

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.parent.update({
    where: { customerId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "parent.reset_password",
    entityType: "Customer",
    entityId: customerId,
    ipAddress: await getClientIp(),
  });

  redirect(`/admin/clientes/${customerId}?saved=1`);
}
