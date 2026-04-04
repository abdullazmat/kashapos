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

// Regular user timeouts
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Super admin timeouts (NIST/CIS standard for privileged accounts)
export const SUPER_ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes (industry standard)
export const SUPER_ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS = 2 * 60 * 60; // 2 hours (allows reasonable workflow)

// Helper function to get token expiration based on role
export function getAccessTokenExpiration(role?: string): string {
  return role === "super_admin" ? "15m" : "1h";
}

export function getAccessTokenMaxAge(role?: string): number {
  return role === "super_admin"
    ? SUPER_ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS
    : ACCESS_TOKEN_MAX_AGE_SECONDS;
}

export function getRefreshTokenExpiration(role?: string): string {
  return role === "super_admin" ? "2h" : "7d";
}

export function getRefreshTokenMaxAge(role?: string): number {
  return role === "super_admin"
    ? SUPER_ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS
    : REFRESH_TOKEN_MAX_AGE_SECONDS;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET must be configured in the environment");
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(payload: JWTPayload): Promise<string> {
  const expiration = getAccessTokenExpiration(payload.role);
  return new SignJWT({ ...payload, tokenType: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiration)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function createRefreshToken(payload: JWTPayload): Promise<string> {
  const expiration = getRefreshTokenExpiration(payload.role);
  return new SignJWT({ ...payload, tokenType: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiration)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyJwt(
  token: string,
): Promise<(JWTPayload & { tokenType?: string }) | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload & { tokenType?: string };
  } catch {
    return null;
  }
}
