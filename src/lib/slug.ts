import { prisma } from "@/lib/prisma";

const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/** Gera um slug único para /lista/{slug}, adicionando sufixo aleatório em caso de colisão. */
export async function generateUniqueGiftListSlug(title: string): Promise<string> {
  const base = slugify(title) || "lista";
  let candidate = base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await prisma.giftList.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${randomSuffix(4)}`;
  }
  throw new Error("Não foi possível gerar um slug único para a lista.");
}

/** Código curto usado na busca interna (seção 32), ex.: "HEL-4F2A". */
export function generatePublicId(babyName?: string | null): string {
  const cleaned = (babyName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const prefix = cleaned.slice(0, 3) || "LST";
  return `${prefix}-${randomSuffix(4).toUpperCase()}`;
}
