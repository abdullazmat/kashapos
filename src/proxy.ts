import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT } from "jose";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  LEGACY_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type JWTPayload,
  createAccessToken,
  verifyJwt,
} from "@/lib/auth-tokens";
import { checkRateLimit } from "@/lib/rate-limit";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET must be configured in the environment");
  }
  return new TextEncoder().encode(secret);
}

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/v1/auth/sign-in",
  "/api/v1/auth/sign-up",
  "/api/seed",
  "/api/v1/seed",
  "/admin-login",
  "/api/admin/setup",
  "/api/admin/auth/sign-in",
  "/api/integrations/silicon-pay/callback",
  "/api/integrations/silicon-pay/subscription-callback",
  "/api/subscription/plans",
];

function getClientIp(request: NextRequest) {
  const xForwardedFor = request.headers.get("x-forwarded-for") || "";
  const xRealIp = request.headers.get("x-real-ip") || "";
  return xForwardedFor.split(",")[0]?.trim() || xRealIp || "unknown";
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");

  if (process.env.NODE_ENV !== "production") {
    return response;
  }

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  return response;
}

function withRequestHeaders(
  request: NextRequest,
  requestHeaders?: Headers,
  rewritePathname?: string,
) {
  if (!rewritePathname) {
    return applySecurityHeaders(
      NextResponse.next({
        request: requestHeaders ? { headers: requestHeaders } : undefined,
      }),
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = rewritePathname;

  return applySecurityHeaders(
    NextResponse.rewrite(url, {
      request: requestHeaders ? { headers: requestHeaders } : undefined,
    }),
  );
}

export async function proxy(request: NextRequest) {
  const originalPathname = request.nextUrl.pathname;
  const isV1Route = originalPathname.startsWith("/api/v1/");
  const pathname = originalPathname.startsWith("/api/v1/")
    ? originalPathname.replace("/api/v1", "/api")
    : originalPathname;
  const rewritePathname = originalPathname === pathname ? undefined : pathname;

  const ip = getClientIp(request);
  const baseRequestHeaders = new Headers(request.headers);
  baseRequestHeaders.set("x-request-method", request.method);
  baseRequestHeaders.set("x-request-path", pathname);
  baseRequestHeaders.set("x-client-ip", ip);
  baseRequestHeaders.set("x-api-version", isV1Route ? "1" : "0");

  if (pathname === "/api/auth/sign-in") {
    const loginLimit = checkRateLimit({
      key: `login:${ip}`,
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!loginLimit.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many login attempts. Try again shortly." },
          {
            status: 429,
            headers: { "Retry-After": String(loginLimit.retryAfterSeconds) },
          },
        ),
      );
    }
  }

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => originalPathname === p || pathname === p) ||
    originalPathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    originalPathname.includes(".")
  ) {
    return withRequestHeaders(request, baseRequestHeaders, rewritePathname);
  }

  const accessToken =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    request.cookies.get(LEGACY_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const accessPayload = accessToken ? await verifyJwt(accessToken) : null;
  let authPayload = accessPayload;
  let rotatedAccessToken: string | null = null;

  if (!authPayload && refreshToken) {
    const refreshPayload = await verifyJwt(refreshToken);
    if (refreshPayload) {
      authPayload = refreshPayload;
      rotatedAccessToken = await createAccessToken(refreshPayload);
    }
  }

  if (!authPayload) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/sign-in", request.url)),
    );
  }

  const requestHeaders = new Headers(baseRequestHeaders);
  requestHeaders.set("x-user-id", authPayload.userId);
  requestHeaders.set("x-tenant-id", authPayload.tenantId);
  requestHeaders.set("x-user-role", authPayload.role);
  requestHeaders.set("x-user-email", authPayload.email || "");
  requestHeaders.set("x-user-name", authPayload.name);
  if (authPayload.branchId) {
    requestHeaders.set("x-branch-id", authPayload.branchId);
  }

  if (pathname.startsWith("/api/")) {
    const tenantLimit = checkRateLimit({
      key: `api:${authPayload.tenantId}`,
      limit: 100,
      windowMs: 60 * 1000,
    });

    if (!tenantLimit.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: { "Retry-After": String(tenantLimit.retryAfterSeconds) },
          },
        ),
      );
    }
  }

  const response = withRequestHeaders(request, requestHeaders, rewritePathname);

  if (rotatedAccessToken) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
      path: "/",
    };
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      rotatedAccessToken,
      cookieOptions,
    );
    response.cookies.set(
      LEGACY_TOKEN_COOKIE,
      rotatedAccessToken,
      cookieOptions,
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
