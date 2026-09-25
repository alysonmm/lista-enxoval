import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { makeStaffSession, createTestStaff, cleanupStaff } from "../helpers";

describe("hasPermission (seções 11/12 — permissões configuráveis)", () => {
  const createdStaffIds: string[] = [];

  afterAll(async () => {
    for (const id of createdStaffIds) await cleanupStaff(id);
  });

  it("ADMIN sempre tem todas as permissões, mesmo sem override", async () => {
    const admin = await createTestStaff("ADMIN");
    createdStaffIds.push(admin.id);
    const session = makeStaffSession({ userId: admin.id, role: "ADMIN" });

    expect(await hasPermission(session, PERMISSIONS.LISTS_CANCEL)).toBe(true);
    expect(await hasPermission(session, PERMISSIONS.SALES_CANCEL)).toBe(true);
  });

  it("MANAGER não tem lists.cancel/sales.cancel por padrão (seção 12: 'mediante permissão')", async () => {
    const manager = await createTestStaff("MANAGER");
    createdStaffIds.push(manager.id);
    const session = makeStaffSession({ userId: manager.id, role: "MANAGER" });

    expect(await hasPermission(session, PERMISSIONS.LISTS_CANCEL)).toBe(false);
    expect(await hasPermission(session, PERMISSIONS.SALES_CANCEL)).toBe(false);
  });

  it("SELLER não tem permissões administrativas por padrão", async () => {
    const seller = await createTestStaff("SELLER");
    createdStaffIds.push(seller.id);
    const session = makeStaffSession({ userId: seller.id, role: "SELLER" });

    expect(await hasPermission(session, PERMISSIONS.REPORTS_VIEW_ALL_STORES)).toBe(false);
  });

  it("um override explícito concede a permissão a um MANAGER", async () => {
    const manager = await createTestStaff("MANAGER");
    createdStaffIds.push(manager.id);
    const permission = await prisma.permission.upsert({
      where: { key: PERMISSIONS.SALES_CANCEL },
      create: { key: PERMISSIONS.SALES_CANCEL, description: "Cancelar vendas" },
      update: {},
    });
    await prisma.userPermission.create({
      data: { userId: manager.id, permissionId: permission.id, granted: true },
    });

    const session = makeStaffSession({ userId: manager.id, role: "MANAGER" });
    expect(await hasPermission(session, PERMISSIONS.SALES_CANCEL)).toBe(true);
    // Outras permissões continuam negadas — o override é pontual, não geral.
    expect(await hasPermission(session, PERMISSIONS.LISTS_CANCEL)).toBe(false);
  });

  it("um override com granted:false revoga explicitamente mesmo se o papel desse acesso", async () => {
    const seller = await createTestStaff("SELLER");
    createdStaffIds.push(seller.id);
    const permission = await prisma.permission.upsert({
      where: { key: PERMISSIONS.LISTS_VIEW_ALL_STORES },
      create: { key: PERMISSIONS.LISTS_VIEW_ALL_STORES, description: "Ver listas de todas as unidades" },
      update: {},
    });
    await prisma.userPermission.create({
      data: { userId: seller.id, permissionId: permission.id, granted: false },
    });

    const session = makeStaffSession({ userId: seller.id, role: "SELLER" });
    expect(await hasPermission(session, PERMISSIONS.LISTS_VIEW_ALL_STORES)).toBe(false);
  });
});
