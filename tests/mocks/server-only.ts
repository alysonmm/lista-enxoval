// Stub para o pacote "server-only" nos testes: fora do bundler do Next.js,
// o pacote real lança um erro incondicionalmente (ele depende de uma
// condição de resolução específica do webpack/Turbopack que o Vitest não
// define). Isso é puramente sobre o ambiente de teste — a proteção real
// contra importar código server-only do cliente continua vindo do build
// do Next.js em produção.
export {};
