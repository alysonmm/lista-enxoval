import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definido. Configure .env (ver DEPLOYMENT.md) antes de rodar os testes — eles usam um banco Postgres real.",
  );
}
