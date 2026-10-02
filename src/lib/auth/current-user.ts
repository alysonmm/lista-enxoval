import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./session";

const STAFF_COOKIE = "pdc_staff_session";
const PARENT_COOKIE = "pdc_parent_session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export type StaffSessionPayload = {
  kind: "staff";
  userId: string;
  role: StaffRole;
  storeId: string | null;
  name: string;
  email: string;
};

export type ParentSessionPayload = {
  kind: "parent";
  parentId: string;
  customerId: string;
  name: string;
};

export async function createStaffSession(user: {
  id: string;
  role: StaffRole;
  storeId: string | null;
  name: string;
  email: string;
}) {
  const payload: StaffSessionPayload = {
    kind: "staff",
    userId: user.id,
    role: user.role,
    storeId: user.storeId,
    name: user.name,
    email: user.email,
  };
  const token = await signSessionToken(payload, "staff");
  const store = await cookies();
  store.set(STAFF_COOKIE, token, cookieOptions);
}

export async function createParentSession(parent: {
  id: string;
  customerId: string;
  name: string;
}) {
  const payload: ParentSessionPayload = {
    kind: "parent",
    parentId: parent.id,
    customerId: parent.customerId,
    name: parent.name,
  };
  const token = await signSessionToken(payload, "parent");
  const store = await cookies();
  store.set(PARENT_COOKIE, token, cookieOptions);
}

/**
 * Sessão do funcionário logado, ou null. O token só prova quem a pessoa era
 * quando entrou (vale 7 dias) — por isso, a cada requisição, confere no
 * banco se a conta continua ativa e usa o papel/unidade atuais: desativar,
 * excluir ou rebaixar alguém vale na hora, não só quando o token expira.
 * `cache` evita repetir a consulta dentro da mesma requisição.
 */
export const getStaffSession = cache(async (): Promise<StaffSessionPayload | null> => {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken<Partial<StaffSessionPayload>>(token, "staff");
  if (!payload || payload.kind !== "staff" || typeof payload.userId !== "string") return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { active: true, deletedAt: true, role: true, storeId: true, name: true, email: true },
  });
  if (!user || !user.active || user.deletedAt) return null;

  return {
    kind: "staff",
    userId: payload.userId,
    role: user.role,
    storeId: user.storeId,
    name: user.name,
    email: user.email,
  };
});

/** Sessão do responsável logado no portal dos pais, ou null — mesma revalidação no banco. */
export const getParentSession = cache(async (): Promise<ParentSessionPayload | null> => {
  const store = await cookies();
  const token = store.get(PARENT_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken<Partial<ParentSessionPayload>>(token, "parent");
  if (!payload || payload.kind !== "parent" || typeof payload.parentId !== "string") return null;

  const parent = await prisma.parent.findUnique({
    where: { id: payload.parentId },
    select: { customerId: true, customer: { select: { name: true, deletedAt: true } } },
  });
  if (!parent || parent.customer.deletedAt) return null;

  return {
    kind: "parent",
    parentId: payload.parentId,
    customerId: parent.customerId,
    name: parent.customer.name,
  };
});

export async function clearStaffSession() {
  const store = await cookies();
  store.delete(STAFF_COOKIE);
}

export async function clearParentSession() {
  const store = await cookies();
  store.delete(PARENT_COOKIE);
}

/** Usado em layouts/páginas do painel administrativo. Redireciona se não autenticado/autorizado. */
export async function requireStaffPage(allowedRoles?: StaffRole[]): Promise<StaffSessionPayload> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (allowedRoles && !allowedRoles.includes(session.role)) redirect("/admin");
  return session;
}

/** Usado em layouts/páginas do portal dos pais. Redireciona se não autenticado. */
export async function requireParentPage(): Promise<ParentSessionPayload> {
  const session = await getParentSession();
  if (!session) redirect("/pais/login");
  return session;
}

/** Melhor esforço para obter o IP do cliente, para auditoria (seção 75). Pode ser null. */
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return headerList.get("x-real-ip");
}
