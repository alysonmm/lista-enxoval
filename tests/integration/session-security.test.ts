/**
 * Segurança das sessões: os tokens de funcionário e do portal dos pais são
 * assinados com o mesmo AUTH_SECRET, então um não pode ser aceito no lugar
 * do outro (antes, bastava um responsável copiar o próprio cookie para o
 * nome do cookie de funcionário para abrir o painel da loja). E como o token
 * vale 7 dias, a sessão é revalidada no banco a cada requisição: conta
 * desativada/excluída perde o acesso na hora e mudança de papel vale na hora.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () => new Headers(),
}));

const { getParentSession, getStaffSession } = await import("@/lib/auth/current-user");
const { signSessionToken } = await import("@/lib/auth/session");
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

describe("segurança das sessões", () => {
  let staffId: string;
  let parentId: string;
  let customerId: string;
  let staffToken: string;
  let parentToken: string;

  beforeAll(async () => {
    const staff = await helpers.createTestStaff("SELLER");
    staffId = staff.id;
    const { customer, parent } = await helpers.createTestParent();
    parentId = parent.id;
    customerId = customer.id;

    staffToken = await signSessionToken(
      { kind: "staff", userId: staff.id, role: "SELLER", storeId: null, name: staff.name, email: staff.email },
      "staff",
    );
    parentToken = await signSessionToken(
      { kind: "parent", parentId: parent.id, customerId: customer.id, name: customer.name },
      "parent",
    );
  });

  beforeEach(() => jar.clear());

  afterAll(async () => {
    await helpers.cleanupParent(parentId);
    await helpers.cleanupStaff(staffId);
  });

  it("aceita os tokens legítimos nos cookies certos", async () => {
    jar.set("pdc_staff_session", staffToken);
    jar.set("pdc_parent_session", parentToken);
    expect((await getStaffSession())?.userId).toBe(staffId);
    expect((await getParentSession())?.parentId).toBe(parentId);
  });

  it("recusa o token do portal dos pais usado como sessão de funcionário", async () => {
    jar.set("pdc_staff_session", parentToken);
    expect(await getStaffSession()).toBeNull();
  });

  it("recusa o token de funcionário usado como sessão do portal dos pais", async () => {
    jar.set("pdc_parent_session", staffToken);
    expect(await getParentSession()).toBeNull();
  });

  it("recusa tokens sem audiência (emitidos antes da correção)", async () => {
    const legacy = await new SignJWT({ kind: "staff", userId: staffId, role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    jar.set("pdc_staff_session", legacy);
    expect(await getStaffSession()).toBeNull();
  });

  it("usa o papel atual do banco, não o que estava no token", async () => {
    await prisma.user.update({ where: { id: staffId }, data: { role: "MANAGER" } });
    jar.set("pdc_staff_session", staffToken); // token emitido como SELLER
    expect((await getStaffSession())?.role).toBe("MANAGER");
    await prisma.user.update({ where: { id: staffId }, data: { role: "SELLER" } });
  });

  it("derruba a sessão de funcionário desativado ou excluído", async () => {
    jar.set("pdc_staff_session", staffToken);

    await prisma.user.update({ where: { id: staffId }, data: { active: false } });
    expect(await getStaffSession()).toBeNull();

    await prisma.user.update({ where: { id: staffId }, data: { active: true, deletedAt: new Date() } });
    expect(await getStaffSession()).toBeNull();

    await prisma.user.update({ where: { id: staffId }, data: { deletedAt: null } });
    expect((await getStaffSession())?.userId).toBe(staffId);
  });

  it("derruba a sessão do responsável cujo cadastro foi excluído", async () => {
    jar.set("pdc_parent_session", parentToken);
    await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
    expect(await getParentSession()).toBeNull();
    await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: null } });
  });
});
