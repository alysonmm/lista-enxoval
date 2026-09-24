import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET não configurado (ou muito curto). Defina uma string aleatória forte no .env.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as T;
  } catch {
    return null;
  }
}
