import "server-only";
import QRCode from "qrcode";

/** Gera um QR Code como data URL PNG, pronto para <img src> e download. */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 512 });
}

export function getPublicListUrl(slug: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/lista/${slug}`;
}
