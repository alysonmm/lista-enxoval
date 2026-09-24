import "server-only";
import type { StaffRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { StaffSessionPayload } from "@/lib/auth/current-user";

/**
 * Catálogo de permissões finas e configuráveis por usuário (seções 11/12).
 * A maioria das ações é liberada apenas por papel (ver `canAccess`); estas
 * chaves cobrem os casos que a especificação chama explicitamente de
 * "mediante permissão" ou que variam por unidade/loja.
 */
export const PERMISSIONS = {
  LISTS_CANCEL: "lists.cancel",
  SALES_CANCEL: "sales.cancel",
  REPORTS_VIEW_ALL_STORES: "reports.view_all_stores",
  LISTS_VIEW_ALL_STORES: "lists.view_all_stores",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  ADMIN: Object.values(PERMISSIONS),
  MANAGER: [],
  SELLER: [],
};

/**
 * Verifica uma permissão fina, respeitando overrides por usuário
 * (tabela `user_permissions`) sobre o padrão do papel.
 */
export async function hasPermission(
  session: StaffSessionPayload,
  key: PermissionKey,
): Promise<boolean> {
  if (session.role === "ADMIN") return true;

  const override = await prisma.userPermission.findFirst({
    where: { userId: session.userId, permission: { key } },
    select: { granted: true },
  });
  if (override) return override.granted;

  return ROLE_DEFAULT_PERMISSIONS[session.role].includes(key);
}

/** Checagem síncrona simples por papel, para ações sem necessidade de override por usuário. */
export function isRole(session: StaffSessionPayload, ...roles: StaffRole[]): boolean {
  return roles.includes(session.role);
}
