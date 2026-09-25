import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento local de imagens (dev/MVP). Grava em public/uploads e devolve
 * a URL pública correspondente. Ver DEPLOYMENT.md — produção deve usar um
 * StorageProvider compatível com S3 (fora do escopo desta fase).
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export class UploadError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function saveImageUpload(file: File, subfolder: string): Promise<string> {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) throw new UploadError("invalid_image_type");
  if (file.size > MAX_SIZE_BYTES) throw new UploadError("image_too_large");

  const dir = path.join(UPLOAD_ROOT, subfolder);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}
