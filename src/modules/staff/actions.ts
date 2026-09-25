"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp, getStaffSession } from "@/lib/auth/current-user";
import { recordAudit } from "@/lib/audit";
import { staffPasswordSchema, staffSchema } from "./schemas";

async function requireAdmin() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin?error=forbidden");
  return session;
}

function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

function parseStaffForm(formData: FormData) {
  return staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    storeId: formData.get("storeId") || undefined,
    phone: formData.get("phone") || undefined,
  });
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = parseStaffForm(formData);
  const passwordParsed = staffPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success || !passwordParsed.success) {
    redirect("/admin/vendedores/novo?error=invalid_input");
  }

  const passwordHash = await hashPassword(passwordParsed.data.password);

  let staffId: string;
  try {
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        storeId: parsed.data.role === "ADMIN" ? null : (parsed.data.storeId ?? null),
        phone: parsed.data.phone || null,
      },
    });
    staffId = created.id;
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect("/admin/vendedores/novo?error=duplicate");
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "staff.create",
    entityType: "User",
    entityId: staffId,
    changes: { name: parsed.data.name, role: parsed.data.role },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/vendedores");
  redirect(`/admin/vendedores/${staffId}?saved=1`);
}

export async function updateStaffAction(staffId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = parseStaffForm(formData);
  if (!parsed.success) redirect(`/admin/vendedores/${staffId}?error=invalid_input`);

  const active = formData.get("active") === "on";
  if (staffId === session.userId && !active) {
    redirect(`/admin/vendedores/${staffId}?error=cannot_deactivate_self`);
  }

  try {
    await prisma.user.update({
      where: { id: staffId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        storeId: parsed.data.role === "ADMIN" ? null : (parsed.data.storeId ?? null),
        phone: parsed.data.phone || null,
        active,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) redirect(`/admin/vendedores/${staffId}?error=duplicate`);
    throw e;
  }

  await recordAudit({
    actorUserId: session.userId,
    action: "staff.update",
    entityType: "User",
    entityId: staffId,
    changes: { name: parsed.data.name, role: parsed.data.role, active },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/vendedores/${staffId}`);
  revalidatePath("/admin/vendedores");
  redirect(`/admin/vendedores/${staffId}?saved=1`);
}

export async function resetStaffPasswordAction(staffId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();

  const parsed = staffPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) redirect(`/admin/vendedores/${staffId}?error=invalid_password`);

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: staffId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await recordAudit({
    actorUserId: session.userId,
    action: "staff.reset_password",
    entityType: "User",
    entityId: staffId,
    ipAddress: await getClientIp(),
  });

  redirect(`/admin/vendedores/${staffId}?saved=1`);
}
