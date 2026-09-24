/**
 * Seed de demonstração (seção 111): 3 unidades, 1 admin, 2 gerentes,
 * 5 vendedores, 10 clientes, 3 listas, 50 produtos, compras online e
 * presenciais, um pedido cancelado, produtos completos e disponíveis.
 *
 * Idempotente por construção: sempre limpa as tabelas relevantes antes de
 * recriar os dados, então pode ser rodado quantas vezes for preciso em
 * desenvolvimento (`npm run db:seed`). Nunca rode contra produção.
 */
import { PrismaClient, type BabySex, type ParentRelationship } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function reais(value: number): number {
  return Math.round(value * 100);
}

function randomSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function publicId(babyName: string | null): string {
  const cleaned = (babyName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return `${cleaned.slice(0, 3) || "LST"}-${randomSuffix(4).toUpperCase()}`;
}

async function resetDatabase() {
  console.log("Limpando dados existentes...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.giftMessage.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.customerCredit.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.giftListParent.deleteMany();
  await prisma.giftListItem.deleteMany();
  await prisma.giftList.deleteMany();
  await prisma.baby.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.benefitTier.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.integration.deleteMany();
}

async function seedStoresAndStaff(passwordHash: string) {
  console.log("Criando unidades e funcionários...");

  const [pdc1, pdc2, pdc3] = await Promise.all([
    prisma.store.create({
      data: {
        name: "Ponto das Crianças — Shopping Iguatemi",
        code: "PDC1",
        address: "Av. Washington Soares, 85 — Fortaleza/CE",
        phone: "(85) 3000-1001",
      },
    }),
    prisma.store.create({
      data: {
        name: "Ponto das Crianças — Shopping RioMar",
        code: "PDC2",
        address: "Av. Sen. Virgílio Távora, 1400 — Fortaleza/CE",
        phone: "(85) 3000-1002",
      },
    }),
    prisma.store.create({
      data: {
        name: "Ponto das Crianças — Centro",
        code: "PDC3",
        address: "Rua Major Facundo, 500 — Fortaleza/CE",
        phone: "(85) 3000-1003",
      },
    }),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Camila Andrade",
      email: "admin@pontodascriancas.com.br",
      passwordHash,
      role: "ADMIN",
      phone: "(85) 99000-0001",
    },
  });

  const [manager1, manager2] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Roberto Nunes",
        email: "gerente.iguatemi@pontodascriancas.com.br",
        passwordHash,
        role: "MANAGER",
        storeId: pdc1.id,
        phone: "(85) 99000-0002",
      },
    }),
    prisma.user.create({
      data: {
        name: "Fernanda Dias",
        email: "gerente.riomar@pontodascriancas.com.br",
        passwordHash,
        role: "MANAGER",
        storeId: pdc2.id,
        phone: "(85) 99000-0003",
      },
    }),
  ]);

  const sellerSeeds = [
    { name: "Carla Mendes", store: pdc1 },
    { name: "Fran Oliveira", store: pdc2 },
    { name: "Juliana Rocha", store: pdc3 },
    { name: "Patrícia Gomes", store: pdc1 },
    { name: "Bianca Freitas", store: pdc2 },
  ];
  const sellers = await Promise.all(
    sellerSeeds.map((s, i) =>
      prisma.user.create({
        data: {
          name: s.name,
          email: `vendedor${i + 1}@pontodascriancas.com.br`,
          passwordHash,
          role: "SELLER",
          storeId: s.store.id,
          phone: `(85) 99000-01${i.toString().padStart(2, "0")}`,
        },
      }),
    ),
  );

  return { stores: [pdc1, pdc2, pdc3], admin, managers: [manager1, manager2], sellers };
}

async function seedPermissions() {
  console.log("Criando catálogo de permissões...");
  await prisma.permission.createMany({
    data: [
      { key: "lists.cancel", description: "Cancelar listas de enxoval" },
      { key: "sales.cancel", description: "Cancelar vendas/pedidos" },
      { key: "reports.view_all_stores", description: "Ver relatórios de todas as unidades" },
      { key: "lists.view_all_stores", description: "Ver listas de todas as unidades" },
    ],
  });
}

async function seedBenefitTiers() {
  console.log("Criando faixas de benefício (exemplo)...");
  await prisma.benefitTier.createMany({
    data: [
      { minValue: reais(1000), maxValue: reais(2499.99), rewardType: "CREDIT", rewardValue: reais(50), description: "R$ 1.000 em vendas → R$ 50 de crédito" },
      { minValue: reais(2500), maxValue: reais(4999.99), rewardType: "CREDIT", rewardValue: reais(150), description: "R$ 2.500 em vendas → R$ 150 de crédito" },
      { minValue: reais(5000), maxValue: null, rewardType: "CREDIT", rewardValue: reais(350), description: "R$ 5.000 em vendas → R$ 350 de crédito" },
    ],
  });
}

async function seedSystemSettings() {
  console.log("Criando configurações do sistema...");
  await prisma.systemSetting.createMany({
    data: [
      { key: "reservation_ttl_minutes", value: 15, description: "Minutos de reserva durante checkout online (seção 55)" },
      { key: "public_progress_default", value: false, description: "Progresso geral público ativado por padrão? (seção 8)" },
      { key: "leftover_discount_percent", value: 15, description: "Desconto oferecido em itens não presenteados ao encerrar a lista (seção 79)" },
      { key: "leftover_discount_days", value: 7, description: "Validade do desconto de itens não presenteados, em dias" },
    ],
  });
}

type CategorySpec = { name: string; parent?: string };

const CATEGORY_SPECS: CategorySpec[] = [
  { name: "Roupas" },
  { name: "Saída de Maternidade" },
  { name: "Banho" },
  { name: "Quarto" },
  { name: "Passeio" },
  { name: "Alimentação" },
  { name: "Higiene" },
  { name: "Bolsas" },
  { name: "Ninhos" },
  { name: "Mantas" },
  { name: "Acessórios" },
  { name: "Móveis" },
  { name: "Decoração" },
  { name: "Outros" },
];

async function seedCategories() {
  console.log("Criando categorias...");
  const map = new Map<string, string>();
  for (const spec of CATEGORY_SPECS) {
    const category = await prisma.category.create({
      data: {
        name: spec.name,
        slug: slugify(spec.name),
        parentCategoryId: spec.parent ? map.get(spec.parent) : null,
      },
    });
    map.set(spec.name, category.id);
  }
  return map;
}

type ProductSpec = {
  name: string;
  category: string;
  price: number;
  sku: string;
  sizes?: string[];
  colors?: string[];
};

const PRODUCT_SPECS: ProductSpec[] = [
  { name: "Body Manga Curta", category: "Roupas", price: 34.9, sku: "ROU-001", sizes: ["RN", "P", "M", "G"], colors: ["Branco", "Rosa", "Bege"] },
  { name: "Body Manga Longa", category: "Roupas", price: 39.9, sku: "ROU-002" },
  { name: "Macacão Tricot", category: "Roupas", price: 129.9, sku: "ROU-003", sizes: ["RN", "P", "M"] },
  { name: "Macacão Plush", category: "Roupas", price: 89.9, sku: "ROU-004", sizes: ["RN", "P", "M"] },
  { name: "Conjunto Blusa e Calça", category: "Roupas", price: 79.9, sku: "ROU-005", sizes: ["P", "M", "G"] },
  { name: "Pijama Algodão", category: "Roupas", price: 59.9, sku: "ROU-006", sizes: ["P", "M", "G"] },
  { name: "Casaco de Frio", category: "Roupas", price: 99.9, sku: "ROU-007", sizes: ["P", "M", "G"] },
  { name: "Meias Kit c/3", category: "Roupas", price: 24.9, sku: "ROU-008" },
  { name: "Saída de Maternidade Luxo", category: "Saída de Maternidade", price: 189.9, sku: "SDM-001" },
  { name: "Saída de Maternidade Simples", category: "Saída de Maternidade", price: 129.9, sku: "SDM-002" },
  { name: "Kit Banho Completo", category: "Banho", price: 149.9, sku: "BAN-001" },
  { name: "Toalha com Capuz", category: "Banho", price: 69.9, sku: "BAN-002", colors: ["Branco", "Amarelo", "Verde"] },
  { name: "Banheira Inflável", category: "Banho", price: 119.9, sku: "BAN-003" },
  { name: "Termômetro de Banho", category: "Banho", price: 39.9, sku: "BAN-004" },
  { name: "Saboneteira", category: "Banho", price: 19.9, sku: "BAN-005" },
  { name: "Kit Higiene Banho", category: "Banho", price: 89.9, sku: "BAN-006" },
  { name: "Kit Berço Nuvem", category: "Quarto", price: 349.9, sku: "QRT-001", colors: ["Azul", "Rosa", "Bege"] },
  { name: "Móbile Musical", category: "Quarto", price: 99.9, sku: "QRT-002" },
  { name: "Protetor de Berço", category: "Quarto", price: 129.9, sku: "QRT-003", colors: ["Branco", "Cinza"] },
  { name: "Cortina Blackout", category: "Quarto", price: 159.9, sku: "QRT-004" },
  { name: "Luminária Noturna", category: "Quarto", price: 79.9, sku: "QRT-005" },
  { name: "Carrinho de Bebê", category: "Passeio", price: 899.9, sku: "PAS-001", colors: ["Preto", "Cinza"] },
  { name: "Bebê Conforto", category: "Passeio", price: 599.9, sku: "PAS-002", colors: ["Preto", "Bege"] },
  { name: "Canguru Ergonômico", category: "Passeio", price: 249.9, sku: "PAS-003" },
  { name: "Sombrinha para Carrinho", category: "Passeio", price: 49.9, sku: "PAS-004" },
  { name: "Organizador de Carrinho", category: "Passeio", price: 59.9, sku: "PAS-005" },
  { name: "Kit Mamadeiras", category: "Alimentação", price: 89.9, sku: "ALI-001" },
  { name: "Cadeira de Alimentação", category: "Alimentação", price: 399.9, sku: "ALI-002", colors: ["Cinza", "Verde"] },
  { name: "Kit Pratinhos", category: "Alimentação", price: 49.9, sku: "ALI-003", colors: ["Azul", "Rosa"] },
  { name: "Esterilizador", category: "Alimentação", price: 199.9, sku: "ALI-004" },
  { name: "Babador Impermeável Kit c/3", category: "Alimentação", price: 39.9, sku: "ALI-005" },
  { name: "Kit Higiene Completo", category: "Higiene", price: 119.9, sku: "HIG-001" },
  { name: "Trocador Portátil", category: "Higiene", price: 69.9, sku: "HIG-002" },
  { name: "Nécessaire Maternidade", category: "Higiene", price: 89.9, sku: "HIG-003", colors: ["Cinza", "Rosa"] },
  { name: "Cortador de Unha Bebê", category: "Higiene", price: 19.9, sku: "HIG-004" },
  { name: "Bolsa Maternidade Grande", category: "Bolsas", price: 249.9, sku: "BOL-001", colors: ["Cinza", "Bege", "Preto"] },
  { name: "Mochila Maternidade", category: "Bolsas", price: 219.9, sku: "BOL-002", colors: ["Cinza", "Preto"] },
  { name: "Frasqueira Térmica", category: "Bolsas", price: 79.9, sku: "BOL-003" },
  { name: "Ninho Redutor", category: "Ninhos", price: 129.9, sku: "NIN-001", colors: ["Nuvem Azul", "Nuvem Rosa"] },
  { name: "Ninho Percy", category: "Ninhos", price: 149.9, sku: "NIN-002", colors: ["Bege", "Cinza"] },
  { name: "Kit Manta Rosa", category: "Mantas", price: 89.9, sku: "MAN-001" },
  { name: "Manta Soft Azul", category: "Mantas", price: 79.9, sku: "MAN-002" },
  { name: "Manta de Tricot", category: "Mantas", price: 99.9, sku: "MAN-003", colors: ["Bege", "Cinza"] },
  { name: "Kit Chupetas", category: "Acessórios", price: 29.9, sku: "ACE-001" },
  { name: "Porta Chupeta", category: "Acessórios", price: 19.9, sku: "ACE-002", colors: ["Azul", "Rosa", "Amarelo"] },
  { name: "Mordedor", category: "Acessórios", price: 24.9, sku: "ACE-003", colors: ["Azul", "Rosa"] },
  { name: "Álbum do Bebê", category: "Acessórios", price: 69.9, sku: "ACE-004" },
  { name: "Cômoda com Trocador", category: "Móveis", price: 799.9, sku: "MOV-001", colors: ["Branco", "Cinza"] },
  { name: "Guarda-roupa Infantil", category: "Móveis", price: 999.9, sku: "MOV-002", colors: ["Branco", "Cinza"] },
  { name: "Quadro Decorativo Kit c/3", category: "Decoração", price: 89.9, sku: "DEC-001" },
];

async function seedProducts(categoryMap: Map<string, string>, storeIds: string[]) {
  console.log(`Criando ${PRODUCT_SPECS.length} produtos...`);
  const productsByName = new Map<
    string,
    { id: string; price: number; variants: { id: string; sku: string }[] }
  >();

  for (const spec of PRODUCT_SPECS) {
    const categoryId = categoryMap.get(spec.category);
    if (!categoryId) throw new Error(`Categoria não encontrada: ${spec.category}`);

    const product = await prisma.product.create({
      data: {
        sku: spec.sku,
        name: spec.name,
        categoryId,
        brand: "Ponto das Crianças",
        price: reais(spec.price),
        status: "ACTIVE",
        images: [],
      },
    });

    const variants: { id: string; sku: string }[] = [];

    if (spec.sizes || spec.colors) {
      const sizes = spec.sizes ?? [null];
      const colors = spec.colors ?? [null];
      let variantIndex = 0;
      for (const size of sizes) {
        for (const color of colors) {
          variantIndex += 1;
          const attributes: Record<string, string> = {};
          if (size) attributes.tamanho = size;
          if (color) attributes.cor = color;
          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${spec.sku}-V${variantIndex}`,
              attributes,
            },
          });
          variants.push({ id: variant.id, sku: variant.sku });

          for (const storeId of storeIds) {
            await prisma.inventory.create({
              data: {
                storeId,
                productVariantId: variant.id,
                physicalQuantity: 5 + Math.floor(Math.random() * 10),
              },
            });
          }
        }
      }
    }

    productsByName.set(spec.name, { id: product.id, price: reais(spec.price), variants });
  }

  return productsByName;
}

type CustomerSpec = {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  city: string;
  state: string;
};

const CUSTOMER_SPECS: CustomerSpec[] = [
  { name: "Mariana Souza", phone: "(85) 99999-0001", email: "mariana.souza@example.com", cpf: "111.111.111-01", city: "Fortaleza", state: "CE" },
  { name: "João Souza", phone: "(85) 99999-0002", email: "joao.souza@example.com", cpf: "111.111.111-02", city: "Fortaleza", state: "CE" },
  { name: "Carla Lima", phone: "(85) 99999-0003", email: "carla.lima@example.com", cpf: "111.111.111-03", city: "Fortaleza", state: "CE" },
  { name: "Ana Ferreira", phone: "(85) 99999-0004", email: "ana.ferreira@example.com", cpf: "111.111.111-04", city: "Fortaleza", state: "CE" },
  { name: "Pedro Alves", phone: "(85) 99999-0005", email: "pedro.alves@example.com", cpf: "111.111.111-05", city: "Fortaleza", state: "CE" },
  { name: "Beatriz Castro", phone: "(85) 99999-0006", email: "beatriz.castro@example.com", cpf: "111.111.111-06", city: "Fortaleza", state: "CE" },
  { name: "Lucas Martins", phone: "(85) 99999-0007", email: "lucas.martins@example.com", cpf: "111.111.111-07", city: "Fortaleza", state: "CE" },
  { name: "Sofia Ribeiro", phone: "(85) 99999-0008", email: "sofia.ribeiro@example.com", cpf: "111.111.111-08", city: "Fortaleza", state: "CE" },
  { name: "Rafael Barros", phone: "(85) 99999-0009", email: "rafael.barros@example.com", cpf: "111.111.111-09", city: "Fortaleza", state: "CE" },
  { name: "Isabela Rocha", phone: "(85) 99999-0010", email: "isabela.rocha@example.com", cpf: "111.111.111-10", city: "Fortaleza", state: "CE" },
];

async function seedCustomers(passwordHash: string) {
  console.log(`Criando ${CUSTOMER_SPECS.length} clientes/pais...`);
  const parentsByName = new Map<string, { customerId: string; parentId: string }>();

  for (const spec of CUSTOMER_SPECS) {
    const customer = await prisma.customer.create({
      data: {
        name: spec.name,
        phone: spec.phone,
        email: spec.email,
        cpf: spec.cpf,
        city: spec.city,
        state: spec.state,
        parent: { create: { passwordHash } },
      },
      include: { parent: true },
    });
    parentsByName.set(spec.name, { customerId: customer.id, parentId: customer.parent!.id });
  }

  return parentsByName;
}

type ItemPlan = {
  productName: string;
  variantSku?: string;
  desired: number;
  priority: "NORMAL" | "DESIRED" | "ESSENTIAL";
};

type SalePlan = {
  itemProductName: string;
  itemVariantSku?: string;
  quantity: number;
  channel: "ONLINE" | "IN_STORE";
  buyerName: string;
  buyerPhone?: string;
  hideBuyerFromParents?: boolean;
  message?: string;
  cancelled?: boolean;
  cancelReason?: string;
};

type ListPlan = {
  title: string;
  babyName: string | null;
  nameUndefined: boolean;
  sex: BabySex;
  theme?: string;
  message?: string;
  storeIndex: number;
  consultantIndex: number;
  parents: { customerName: string; relationship: ParentRelationship; isPrimary: boolean }[];
  items: ItemPlan[];
  sales: SalePlan[];
  status: "ACTIVE" | "DRAFT" | "CLOSED";
  showPublicProgress?: boolean;
  showGiftValuesToParents?: boolean;
};

const LIST_PLANS: ListPlan[] = [
  {
    title: "Enxoval da Helena",
    babyName: "Helena",
    nameUndefined: false,
    sex: "FEMALE",
    theme: "Nuvens",
    message: "Estamos preparando tudo para a chegada da Helena! Quem quiser nos presentear pode escolher aqui.",
    storeIndex: 0,
    consultantIndex: 0,
    parents: [
      { customerName: "Mariana Souza", relationship: "MOTHER", isPrimary: true },
      { customerName: "João Souza", relationship: "FATHER", isPrimary: false },
    ],
    status: "ACTIVE",
    showGiftValuesToParents: true,
    items: [
      { productName: "Body Manga Longa", desired: 6, priority: "NORMAL" },
      { productName: "Macacão Tricot", variantSku: "ROU-003-V1", desired: 4, priority: "NORMAL" },
      { productName: "Kit Manta Rosa", desired: 2, priority: "DESIRED" },
      { productName: "Saída de Maternidade Luxo", desired: 1, priority: "NORMAL" },
      { productName: "Bolsa Maternidade Grande", variantSku: "BOL-001-V1", desired: 1, priority: "NORMAL" },
      { productName: "Kit Berço Nuvem", variantSku: "QRT-001-V1", desired: 1, priority: "ESSENTIAL" },
    ],
    sales: [
      { itemProductName: "Body Manga Longa", quantity: 2, channel: "ONLINE", buyerName: "Beatriz Castro", message: "Parabéns pela Helena!" },
      { itemProductName: "Body Manga Longa", quantity: 1, channel: "IN_STORE", buyerName: "Lucas Martins" },
      { itemProductName: "Body Manga Longa", quantity: 2, channel: "IN_STORE", buyerName: "Sofia Ribeiro", hideBuyerFromParents: true },
      { itemProductName: "Macacão Tricot", itemVariantSku: "ROU-003-V1", quantity: 4, channel: "IN_STORE", buyerName: "Rafael Barros", message: "Que a Helena venha com muita saúde." },
      { itemProductName: "Kit Manta Rosa", quantity: 1, channel: "ONLINE", buyerName: "Pedro Alves", message: "Com muito carinho!" },
      { itemProductName: "Saída de Maternidade Luxo", quantity: 1, channel: "IN_STORE", buyerName: "Isabela Rocha" },
      {
        itemProductName: "Kit Berço Nuvem",
        itemVariantSku: "QRT-001-V1",
        quantity: 1,
        channel: "IN_STORE",
        buyerName: "Fernanda Alencar",
        cancelled: true,
        cancelReason: "Cliente desistiu da compra",
      },
    ],
  },
  {
    title: "Enxoval do Miguel",
    babyName: "Miguel",
    nameUndefined: false,
    sex: "MALE",
    theme: "Safári",
    message: "Miguel está chegando! Preparamos essa listinha com muito carinho.",
    storeIndex: 1,
    consultantIndex: 1,
    parents: [{ customerName: "Carla Lima", relationship: "MOTHER", isPrimary: true }],
    status: "ACTIVE",
    showGiftValuesToParents: false,
    showPublicProgress: true,
    items: [
      { productName: "Body Manga Curta", variantSku: "ROU-001-V1", desired: 6, priority: "NORMAL" },
      { productName: "Manta Soft Azul", desired: 2, priority: "DESIRED" },
      { productName: "Carrinho de Bebê", variantSku: "PAS-001-V1", desired: 1, priority: "ESSENTIAL" },
      { productName: "Kit Mamadeiras", desired: 3, priority: "NORMAL" },
      { productName: "Cadeira de Alimentação", variantSku: "ALI-002-V1", desired: 1, priority: "NORMAL" },
    ],
    sales: [
      { itemProductName: "Body Manga Curta", itemVariantSku: "ROU-001-V1", quantity: 3, channel: "IN_STORE", buyerName: "Ana Ferreira" },
      { itemProductName: "Manta Soft Azul", quantity: 2, channel: "ONLINE", buyerName: "Isabela Rocha", message: "Um abraço para o Miguel!" },
      { itemProductName: "Kit Mamadeiras", quantity: 3, channel: "IN_STORE", buyerName: "Rafael Barros" },
    ],
  },
  {
    title: "Enxoval do Bebê Ferreira",
    babyName: null,
    nameUndefined: true,
    sex: "NOT_INFORMED",
    theme: undefined,
    message: "Ainda não sabemos o nome, mas já estamos preparando tudo com muito amor!",
    storeIndex: 2,
    consultantIndex: 2,
    parents: [{ customerName: "Ana Ferreira", relationship: "MOTHER", isPrimary: true }],
    status: "ACTIVE",
    items: [
      { productName: "Kit Banho Completo", desired: 1, priority: "NORMAL" },
      { productName: "Ninho Redutor", variantSku: "NIN-001-V1", desired: 1, priority: "DESIRED" },
      { productName: "Kit Higiene Completo", desired: 2, priority: "NORMAL" },
      { productName: "Mordedor", variantSku: "ACE-003-V1", desired: 3, priority: "NORMAL" },
    ],
    sales: [],
  },
];

async function seedGiftLists(
  plans: ListPlan[],
  stores: { id: string }[],
  staff: { admin: { id: string }; managers: { id: string }[]; sellers: { id: string }[] },
  parentsByName: Map<string, { customerId: string; parentId: string }>,
  productsByName: Map<string, { id: string; price: number; variants: { id: string; sku: string }[] }>,
) {
  console.log("Criando listas de enxoval, itens e vendas de demonstração...");

  for (const plan of plans) {
    const baby = await prisma.baby.create({
      data: {
        name: plan.babyName,
        nameUndefined: plan.nameUndefined,
        sex: plan.sex,
        theme: plan.theme ?? null,
        message: plan.message ?? null,
        expectedBirthDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        showerDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
    });

    const store = stores[plan.storeIndex];
    const consultant = staff.sellers[plan.consultantIndex] ?? staff.sellers[0];
    const slug = slugify(plan.title);

    const giftList = await prisma.giftList.create({
      data: {
        publicId: publicId(plan.babyName),
        slug,
        title: plan.title,
        babyId: baby.id,
        storeId: store.id,
        consultantId: consultant.id,
        status: plan.status,
        visibility: "PUBLIC_LINK",
        showPublicProgress: plan.showPublicProgress ?? false,
        showGiftValuesToParents: plan.showGiftValuesToParents ?? false,
        createdById: staff.admin.id,
        parents: {
          create: plan.parents.map((p) => {
            const parent = parentsByName.get(p.customerName);
            if (!parent) throw new Error(`Cliente não encontrado: ${p.customerName}`);
            return { parentId: parent.parentId, relationship: p.relationship, isPrimary: p.isPrimary };
          }),
        },
      },
    });

    const itemsByKey = new Map<string, { id: string; productId: string; variantId: string | null }>();
    for (const itemPlan of plan.items) {
      const product = productsByName.get(itemPlan.productName);
      if (!product) throw new Error(`Produto não encontrado: ${itemPlan.productName}`);
      const variant = itemPlan.variantSku
        ? product.variants.find((v) => v.sku === itemPlan.variantSku)
        : undefined;

      const item = await prisma.giftListItem.create({
        data: {
          giftListId: giftList.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          desiredQuantity: itemPlan.desired,
          priority: itemPlan.priority,
        },
      });
      itemsByKey.set(`${itemPlan.productName}::${itemPlan.variantSku ?? ""}`, {
        id: item.id,
        productId: product.id,
        variantId: variant?.id ?? null,
      });
    }

    for (const sale of plan.sales) {
      const key = `${sale.itemProductName}::${sale.itemVariantSku ?? ""}`;
      const item = itemsByKey.get(key);
      const product = productsByName.get(sale.itemProductName);
      if (!item || !product) throw new Error(`Item de venda não encontrado: ${key}`);

      const buyer = await prisma.buyer.create({
        data: { name: sale.buyerName, phone: sale.buyerPhone ?? null },
      });

      const unitPrice = product.price;
      const total = unitPrice * sale.quantity;

      const order = await prisma.order.create({
        data: {
          giftListId: giftList.id,
          buyerId: buyer.id,
          channel: sale.channel,
          storeId: sale.channel === "IN_STORE" ? store.id : null,
          listConsultantId: consultant.id,
          saleSellerId: sale.channel === "IN_STORE" ? consultant.id : null,
          subtotal: total,
          total,
          paymentStatus: sale.cancelled ? "CANCELLED" : "APPROVED",
          fulfillmentStatus: "PENDING",
          channelSource: sale.channel === "IN_STORE" ? "pdv" : "web",
          hideBuyerFromParents: sale.hideBuyerFromParents ?? false,
          buyerMessage: sale.message ?? null,
          cancelledAt: sale.cancelled ? new Date() : null,
          cancelReason: sale.cancelled ? sale.cancelReason : null,
          cancelledById: sale.cancelled ? staff.admin.id : null,
          items: {
            create: {
              giftListItemId: item.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: sale.quantity,
              unitPrice,
              total,
            },
          },
          payments: {
            create: {
              method: sale.channel === "IN_STORE" ? "PIX" : "CREDIT_CARD",
              status: sale.cancelled ? "CANCELLED" : "APPROVED",
              amount: total,
              paidAt: sale.cancelled ? null : new Date(),
              storeId: sale.channel === "IN_STORE" ? store.id : null,
            },
          },
          ...(sale.message
            ? { giftMessage: { create: { giftListId: giftList.id, message: sale.message, isAnonymous: sale.hideBuyerFromParents ?? false } } }
            : {}),
        },
      });
      void order;

      if (!sale.cancelled) {
        await prisma.giftListItem.update({
          where: { id: item.id },
          data: { purchasedQuantity: { increment: sale.quantity } },
        });
        if (item.variantId) {
          await prisma.inventory.updateMany({
            where: { storeId: store.id, productVariantId: item.variantId },
            data: { physicalQuantity: { decrement: sale.quantity } },
          });
        }
      }
    }
  }
}

async function main() {
  await resetDatabase();

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const { stores, admin, managers, sellers } = await seedStoresAndStaff(passwordHash);
  await seedPermissions();
  await seedBenefitTiers();
  await seedSystemSettings();
  const categoryMap = await seedCategories();
  const productsByName = await seedProducts(
    categoryMap,
    stores.map((s) => s.id),
  );
  const parentsByName = await seedCustomers(passwordHash);
  await seedGiftLists(LIST_PLANS, stores, { admin, managers, sellers }, parentsByName, productsByName);

  console.log("\nSeed concluído!\n");
  console.log("Login do painel administrativo:");
  console.log(`  Admin:    admin@pontodascriancas.com.br / ${DEMO_PASSWORD}`);
  console.log(`  Gerente:  gerente.iguatemi@pontodascriancas.com.br / ${DEMO_PASSWORD}`);
  console.log(`  Vendedor: vendedor1@pontodascriancas.com.br / ${DEMO_PASSWORD}`);
  console.log("\nLogin do portal dos pais (telefone ou e-mail + senha):");
  console.log(`  Mariana Souza — (85) 99999-0001 / ${DEMO_PASSWORD}`);
  console.log("\nListas públicas:");
  for (const plan of LIST_PLANS) {
    console.log(`  /lista/${slugify(plan.title)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
