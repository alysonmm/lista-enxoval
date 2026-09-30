import "server-only";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";

const MASTER_ADMIN_EMAIL = "admin@pontodascriancas.com.br";

/**
 * Confirma a senha do e-mail admin master, independente de quem está
 * logado no momento — segunda trava antes de ações destrutivas (excluir
 * funcionário, excluir lista).
 */
export async function confirmMasterAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const admin = await prisma.user.findUnique({ where: { email: MASTER_ADMIN_EMAIL } });
  if (!admin || admin.deletedAt) return false;
  return verifyPassword(password, admin.passwordHash);
}

export { MASTER_ADMIN_EMAIL };
