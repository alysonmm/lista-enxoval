import "server-only";
import type { AuditActorType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function recordAudit(params: {
  actorUserId?: string | null;
  actorType?: AuditActorType;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      actorType: params.actorType ?? "USER",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
