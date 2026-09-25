import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

/**
 * Armazenamento de imagens enviadas pelo admin (ex.: foto de produto).
 *
 * Em produção na Vercel, o filesystem é somente leitura fora de /tmp e não
 * persiste entre deploys/instâncias — por isso, quando existe um Blob store
 * conectado ao projeto (BLOB_READ_WRITE_TOKEN presente), a imagem vai para o
 * Vercel Blob. Sem esse token (dev local), grava em public/uploads.
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

  const filename = `${subfolder}/${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return blob.url;
  }

  const dir = path.join(UPLOAD_ROOT, subfolder);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, filename), buffer);
  return `/uploads/${filename}`;
}
