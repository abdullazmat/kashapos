import { NextRequest, NextResponse } from "next/server";
import dbConnect from "./db";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: "admin" | "manager" | "cashier";
  email: string;
  name: string;
  branchId?: string;
}

export function getAuthContext(request: NextRequest): AuthContext {
  return {
    userId: request.headers.get("x-user-id") || "",
    tenantId: request.headers.get("x-tenant-id") || "",
    role:
      (request.headers.get("x-user-role") as AuthContext["role"]) || "cashier",
    email: request.headers.get("x-user-email") || "",
    name: request.headers.get("x-user-name") || "",
    branchId: request.headers.get("x-branch-id") || undefined,
  };
}

export function requireRole(...roles: AuthContext["role"][]) {
  return (auth: AuthContext) => {
    if (!roles.includes(auth.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
    return null;
  };
}

export async function withDb() {
  await dbConnect();
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
