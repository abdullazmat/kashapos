import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  LEGACY_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  createAccessToken,
  createRefreshToken,
  type JWTPayload,
  verifyJwt,
} from "@/lib/auth-tokens";

export type { JWTPayload };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return createAccessToken(payload);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  return verifyJwt(token);
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ||
    cookieStore.get(LEGACY_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const accessPayload = await verifyToken(accessToken);
    if (accessPayload) {
      return accessPayload;
    }
  }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const refreshPayload = await verifyToken(refreshToken);
  if (!refreshPayload) return null;

  // Silent access-token rotation when refresh token is still valid.
  const newAccessToken = await createAccessToken(refreshPayload);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  };
  cookieStore.set(ACCESS_TOKEN_COOKIE, newAccessToken, cookieOptions);
  cookieStore.set(LEGACY_TOKEN_COOKIE, newAccessToken, cookieOptions);

  return refreshPayload;
}

export async function setSession(
  payloadOrAccessToken: JWTPayload | string,
): Promise<void> {
  const cookieStore = await cookies();

  const payload =
    typeof payloadOrAccessToken === "string"
      ? await verifyToken(payloadOrAccessToken)
      : payloadOrAccessToken;

  if (!payload) {
    throw new Error("Cannot set session: invalid token payload");
  }

  const accessToken = await createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });

  // Backward compatibility with existing middleware/front-end checks.
  cookieStore.set(LEGACY_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(LEGACY_TOKEN_COOKIE);
}
