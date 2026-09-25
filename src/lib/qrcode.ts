import "server-only";
import QRCode from "qrcode";

/** Gera um QR Code como data URL PNG, pronto para <img src> e download. */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 512 });
}

/**
 * Base pública da aplicação. APP_URL (configurada explicitamente, ex.: um
 * domínio próprio) tem prioridade; sem ela, cai para as URLs que a própria
 * Vercel injeta automaticamente em cada deploy, para que links/QR Code já
 * funcionem certos antes de qualquer configuração manual.
 */
function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getPublicListUrl(slug: string): string {
  return `${getAppBaseUrl().replace(/\/$/, "")}/lista/${slug}`;
}
