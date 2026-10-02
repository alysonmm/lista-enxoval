import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

/**
 * Para quem o token foi emitido. Os dois tipos de sessão são assinados com
 * o mesmo AUTH_SECRET, então a audiência (claim `aud`, conferida na
 * verificação) é o que impede que o token do portal dos pais seja aceito
 * como sessão de funcionário — ou vice-versa — só trocando o nome do cookie.
 */
export type SessionAudience = "staff" | "parent";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET não configurado (ou muito curto). Defina uma string aleatória forte no .env.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: Record<string, unknown>,
  audience: SessionAudience,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken<T>(token: string, audience: SessionAudience): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { audience, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}
