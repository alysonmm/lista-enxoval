/**
 * Cria o primeiro usuário Administrador em um banco novo (produção), sem
 * rodar o seed de demonstração inteiro. Roda fora do Next.js (via tsx), então
 * usa bcryptjs direto em vez de @/lib/auth/password (que tem `server-only`).
 *
 * Uso: npx tsx prisma/create-admin.ts <email> <senha> [nome]
 * (lê DATABASE_URL do .env automaticamente; prefixe DATABASE_URL=... na
 * frente do comando para rodar contra outro banco, ex.: produção)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const SALT_ROUNDS = 12;
const prisma = new PrismaClient();

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Uso: npx tsx prisma/create-admin.ts <email> <senha> [nome]");
    process.exitCode = 1;
    return;
  }
  if (password.length < 6) {
    console.error("A senha deve ter pelo menos 6 caracteres.");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Já existe um funcionário com o e-mail ${email}.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: name ?? "Administrador", email, passwordHash, role: "ADMIN" },
  });
  console.log(`Administrador criado: ${user.email} (id ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
