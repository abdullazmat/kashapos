import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kashapos-secret-key-change-in-production",
);

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/seed",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-tenant-id", payload.tenantId as string);
    requestHeaders.set("x-user-role", payload.role as string);
    requestHeaders.set("x-user-email", payload.email as string);
    requestHeaders.set("x-user-name", payload.name as string);
    if (payload.branchId) {
      requestHeaders.set("x-branch-id", payload.branchId as string);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
