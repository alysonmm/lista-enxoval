"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearParentSession,
  clearStaffSession,
  createParentSession,
  createStaffSession,
} from "@/lib/auth/current-user";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function isLocked(lockedUntil: Date | null): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginStaffAction(formData: FormData): Promise<void> {
  const parsed = staffLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/admin/login?error=invalid_input");
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt || !user.active) {
    redirect("/admin/login?error=invalid_credentials");
  }
  if (isLocked(user.lockedUntil)) {
    redirect("/admin/login?error=locked");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
      },
    });
    redirect("/admin/login?error=invalid_credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createStaffSession({
    id: user.id,
    role: user.role,
    storeId: user.storeId,
    name: user.name,
    email: user.email,
  });

  redirect("/admin");
}

export async function logoutStaffAction(): Promise<void> {
  await clearStaffSession();
  redirect("/admin/login");
}

const parentLoginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function loginParentAction(formData: FormData): Promise<void> {
  const parsed = parentLoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/pais/login?error=invalid_input");
  }

  const { identifier, password } = parsed.data;
  const normalized = identifier.toLowerCase();

  const parent = await prisma.parent.findFirst({
    where: {
      customer: {
        deletedAt: null,
        OR: [{ email: normalized }, { phone: identifier }],
      },
    },
    include: { customer: true },
  });

  if (!parent || !parent.passwordHash) {
    redirect("/pais/login?error=invalid_credentials");
  }
  if (isLocked(parent.lockedUntil)) {
    redirect("/pais/login?error=locked");
  }

  const validPassword = await verifyPassword(password, parent.passwordHash);
  if (!validPassword) {
    const attempts = parent.failedLoginAttempts + 1;
    await prisma.parent.update({
      where: { id: parent.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
      },
    });
    redirect("/pais/login?error=invalid_credentials");
  }

  await prisma.parent.update({
    where: { id: parent.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createParentSession({
    id: parent.id,
    customerId: parent.customerId,
    name: parent.customer.name,
  });

  redirect("/pais");
}

export async function logoutParentAction(): Promise<void> {
  await clearParentSession();
  redirect("/pais/login");
}
