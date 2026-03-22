import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email?: string;
  role: string;
  branchId?: string;
  name: string;
}

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const LEGACY_TOKEN_COOKIE = "token";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kashapos-secret-key-change-in-production",
);

export async function createAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, tokenType: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, tokenType: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyJwt(
  token: string,
): Promise<(JWTPayload & { tokenType?: string }) | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload & { tokenType?: string };
  } catch {
    return null;
  }
}
