/**
 * Atribui uma foto padrão (ícone por categoria em public/placeholders) a
 * todo produto que ainda não tem nenhuma imagem — útil para produtos criados
 * antes do upload de imagem existir. Nunca sobrescreve produtos que já têm
 * foto (enviada ou herdada do seed). Continuam editáveis normalmente depois
 * (Produtos → editar → trocar imagem).
 *
 * Uso: npx tsx prisma/assign-default-images.ts
 * (lê DATABASE_URL do .env automaticamente; prefixe DATABASE_URL=... na
 * frente do comando para rodar contra outro banco, ex.: produção)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

const CATEGORY_PLACEHOLDER_SLUGS = new Set([
  "roupas",
  "saida-de-maternidade",
  "banho",
  "quarto",
  "passeio",
  "alimentacao",
  "higiene",
  "bolsas",
  "ninhos",
  "mantas",
  "acessorios",
  "moveis",
  "decoracao",
]);

function defaultProductImage(categoryName: string): string {
  const slug = slugify(categoryName);
  return `/placeholders/${CATEGORY_PLACEHOLDER_SLUGS.has(slug) ? slug : "generico"}.svg`;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { images: { isEmpty: true } },
    select: { id: true, category: { select: { name: true } } },
  });

  if (products.length === 0) {
    console.log("Nenhum produto sem imagem — nada a fazer.");
    return;
  }

  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { images: [defaultProductImage(product.category.name)] },
    });
  }

  console.log(`Foto padrão atribuída a ${products.length} produto(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
