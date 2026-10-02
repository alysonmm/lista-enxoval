import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas:
 * - X-Frame-Options / frame-ancestors: o site não pode ser carregado dentro
 *   de um iframe de outro site (evita clickjacking — enganar alguém logado
 *   no admin para clicar em "Excluir" sem ver).
 * - nosniff: o navegador respeita o tipo declarado do arquivo.
 * - Referrer-Policy: links para outros sites recebem só o domínio, nunca o
 *   caminho com parâmetros (ex.: ?pin= de listas protegidas).
 * - Permissions-Policy: câmera, microfone e localização desligados.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
