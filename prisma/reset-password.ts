/**
 * Redefine a senha de um funcionário existente por e-mail, e limpa
 * qualquer bloqueio de conta (tentativas inválidas, conta inativa/
 * excluída) — útil quando o acesso ao próprio painel está impossível.
 *
 * Uso: npx tsx prisma/reset-password.ts <email> <senha-nova>
 * (lê DATABASE_URL do .env automaticamente; prefixe DATABASE_URL=... na
 * frente do comando para rodar contra outro banco, ex.: produção)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const SALT_ROUNDS = 12;
const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Uso: npx tsx prisma/reset-password.ts <email> <senha-nova>");
    process.exitCode = 1;
    return;
  }
  if (password.length < 6) {
    console.error("A senha deve ter pelo menos 6 caracteres.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Nenhum funcionário encontrado com o e-mail ${email}.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      active: true,
      deletedAt: null,
    },
  });

  console.log(`Senha de ${email} redefinida. Bloqueio/inatividade removidos, se havia.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
