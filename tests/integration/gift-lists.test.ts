/**
 * Criação de lista e regras de quantidade (seção 140: "criação de lista;
 * adição de produto; quantidades"). Cobre o fluxo real da seção 128 (bebê +
 * responsável + lista criados juntos) e a checagem server-side que impede
 * reduzir a quantidade desejada abaixo do já comprado/reservado.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sessionHolder = vi.hoisted(() => ({
  current: null as null | { kind: "staff"; userId: string; role: "ADMIN" | "MANAGER" | "SELLER"; storeId: string | null; name: string; email: string },
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));
vi.mock("@/lib/auth/current-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/current-user")>();
  return {
    ...actual,
    getStaffSession: async () => sessionHolder.current,
    getClientIp: async () => null,
  };
});

const { createGiftListAction, addGiftListItemAction, updateGiftListItemAction } = await import(
  "@/modules/gift-lists/actions"
);
const { prisma } = await import("@/lib/prisma");
const helpers = await import("../helpers");

describe("criação de lista e regras de quantidade", () => {
  let storeId: string;
  let categoryId: string;
  let productId: string;
  let staffId: string;
  const createdListIds: string[] = [];
  const createdCustomerIds: string[] = [];

  beforeAll(async () => {
    const store = await helpers.createTestStore();
    storeId = store.id;
    const category = await helpers.createTestCategory();
    categoryId = category.id;
    const { product } = await helpers.createTestProductWithVariant(categoryId, 39.9);
    productId = product.id;
    const staff = await helpers.createTestStaff("SELLER", storeId);
    staffId = staff.id;
    sessionHolder.current = { kind: "staff", userId: staffId, role: "SELLER", storeId, name: "Consultora", email: "c@t.com" };
  });

  afterAll(async () => {
    for (const id of createdListIds) await helpers.cleanupGiftList(id);
    for (const id of createdCustomerIds) {
      const parent = await prisma.parent.findUnique({ where: { customerId: id } });
      if (parent) await helpers.cleanupParent(parent.id);
    }
    await helpers.cleanupProduct(productId);
    await helpers.cleanupStaff(staffId);
    await helpers.cleanupStore(storeId);
    await prisma.category.delete({ where: { id: categoryId } });
  });

  it("cria bebê + responsável + lista numa única transação (seção 128)", async () => {
    const uniquePhone = `8598888${Date.now().toString().slice(-4)}`;
    const formData = new FormData();
    formData.set("title", "Enxoval de Teste");
    formData.set("storeId", storeId);
    formData.set("consultantId", staffId);
    formData.set("visibility", "PUBLIC_LINK");
    formData.set("relationship", "MOTHER");
    formData.set("babyName", "Bebê Teste");
    formData.set("sex", "FEMALE");
    formData.set("responsibleName", "Responsável Teste");
    formData.set("responsiblePhone", uniquePhone);
    formData.set("responsiblePassword", "senha123");

    const message = await helpers
      .expectRedirect(createGiftListAction(formData))
      .catch((e) => {
        throw e;
      });
    const listId = message.match(/\/admin\/listas\/([^/?]+)/)?.[1];
    expect(listId).toBeTruthy();
    createdListIds.push(listId!);

    const list = await prisma.giftList.findUniqueOrThrow({
      where: { id: listId! },
      include: { baby: true, parents: { include: { parent: { include: { customer: true } } } } },
    });
    expect(list.title).toBe("Enxoval de Teste");
    expect(list.status).toBe("DRAFT");
    expect(list.baby.name).toBe("Bebê Teste");
    expect(list.parents).toHaveLength(1);
    expect(list.parents[0].relationship).toBe("MOTHER");
    expect(list.parents[0].isPrimary).toBe(true);
    expect(list.parents[0].parent.customer.name).toBe("Responsável Teste");
    createdCustomerIds.push(list.parents[0].parent.customer.id);

    // A senha foi de fato armazenada com hash (nunca em texto puro).
    expect(list.parents[0].parent.passwordHash).not.toBe("senha123");
    expect(list.parents[0].parent.passwordHash).not.toBeNull();
  });

  it("não permite reduzir a quantidade desejada abaixo do já comprado + reservado", async () => {
    const { parent } = await helpers.createTestParent();
    createdCustomerIds.push(parent.customerId);
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId: parent.id });
    createdListIds.push(giftList.id);
    const item = await helpers.createTestGiftListItem({
      giftListId: giftList.id,
      productId,
      desiredQuantity: 5,
      purchasedQuantity: 3,
      reservedQuantity: 1,
    });

    const formData = new FormData();
    formData.set("desiredQuantity", "3"); // abaixo de purchased(3) + reserved(1) = 4
    formData.set("priority", "NORMAL");

    await expect(
      updateGiftListItemAction(giftList.id, item.id, formData),
    ).rejects.toThrow(`REDIRECT:/admin/listas/${giftList.id}?error=invalid_input`);

    const unchanged = await prisma.giftListItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.desiredQuantity).toBe(5); // não foi alterado
  });

  it("permite aumentar a quantidade desejada normalmente", async () => {
    const { parent } = await helpers.createTestParent();
    createdCustomerIds.push(parent.customerId);
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId: parent.id });
    createdListIds.push(giftList.id);
    const item = await helpers.createTestGiftListItem({
      giftListId: giftList.id,
      productId,
      desiredQuantity: 2,
    });

    const formData = new FormData();
    formData.set("desiredQuantity", "10");
    formData.set("priority", "ESSENTIAL");

    await expect(
      updateGiftListItemAction(giftList.id, item.id, formData),
    ).rejects.toThrow(`REDIRECT:/admin/listas/${giftList.id}?saved=1`);

    const updated = await prisma.giftListItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.desiredQuantity).toBe(10);
    expect(updated.priority).toBe("ESSENTIAL");
  });

  it("adiciona um novo produto à lista", async () => {
    const { parent } = await helpers.createTestParent();
    createdCustomerIds.push(parent.customerId);
    const { giftList } = await helpers.createTestGiftList({ storeId, consultantId: staffId, parentId: parent.id });
    createdListIds.push(giftList.id);

    const formData = new FormData();
    formData.set("productOption", `${productId}::`);
    formData.set("desiredQuantity", "4");
    formData.set("priority", "DESIRED");

    // Sem redirect de propósito: adicionar um produto revalida e permanece
    // na mesma página (ver addGiftListItemAction), em vez de recarregar a
    // tela inteira a cada item adicionado.
    await expect(addGiftListItemAction(giftList.id, formData)).resolves.toBeUndefined();

    const items = await prisma.giftListItem.findMany({ where: { giftListId: giftList.id } });
    expect(items).toHaveLength(1);
    expect(items[0].desiredQuantity).toBe(4);
    expect(items[0].priority).toBe("DESIRED");
  });
});
