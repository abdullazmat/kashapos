import { NextRequest, NextResponse } from "next/server";
import dbConnect from "./db";
import { writeAuditLog } from "./audit";
import {
  getRequestContext,
  markRequestAuditLogged,
  setRequestContext,
} from "./request-context";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
  branchId?: string;
}

export function getAuthContext(request: NextRequest): AuthContext {
  const auth = {
    userId: request.headers.get("x-user-id") || "",
    tenantId: request.headers.get("x-tenant-id") || "",
    role:
      (request.headers.get("x-user-role") as AuthContext["role"]) || "cashier",
    email: request.headers.get("x-user-email") || "",
    name: request.headers.get("x-user-name") || "",
    branchId: request.headers.get("x-branch-id") || undefined,
  };

  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ipAddress =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip") ||
    undefined;

  setRequestContext({
    method: request.method,
    path:
      request.headers.get("x-request-path") ||
      new URL(request.url).pathname ||
      undefined,
    ipAddress,
    apiVersion: request.headers.get("x-api-version") || "0",
    auth,
  });

  return auth;
}

export function requireRole(...roles: string[]) {
  return (auth: AuthContext) => {
    if (!roles.includes(auth.role)) {
      return apiError("Insufficient permissions", 403);
    }
    return null;
  };
}

export async function withDb() {
  await dbConnect();
}

function isV1Request() {
  const context = getRequestContext();
  return context?.apiVersion === "1";
}

function normalizeContextFromHeaders() {
  const context = getRequestContext();
  return context;
}

function mapMethodToAction(
  method?: string,
): "create" | "update" | "delete" | null {
  const normalizedMethod = (method || "").toUpperCase();
  if (normalizedMethod === "POST") return "create";
  if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") {
    return "update";
  }
  if (normalizedMethod === "DELETE") return "delete";
  return null;
}

function normalizeTableName(path?: string) {
  const segments = (path || "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "api" && segment !== "v1");

  const resourceSegments = segments.filter(
    (segment) => !/^[a-fA-F0-9]{24}$/.test(segment),
  );

  if (!resourceSegments.length) {
    return "unknown";
  }

  return resourceSegments.slice(0, 2).join("_");
}

function inferRecordId(data: unknown, path?: string) {
  if (data && typeof data === "object") {
    const candidate = data as Record<string, unknown>;
    const nested =
      (candidate.sale as Record<string, unknown> | undefined)?._id ||
      (candidate.order as Record<string, unknown> | undefined)?._id ||
      (candidate.invoice as Record<string, unknown> | undefined)?._id;

    const value =
      candidate._id ||
      candidate.id ||
      candidate.recordId ||
      nested ||
      undefined;

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const segments = (path || "").split("/").filter(Boolean);
  const pathId = [...segments]
    .reverse()
    .find((segment) => /^[a-fA-F0-9]{24}$/.test(segment));
  return pathId || "n/a";
}

function scheduleWriteAudit(data: unknown, status: number) {
  if (status >= 400) return;

  const context = normalizeContextFromHeaders();
  const action = mapMethodToAction(context?.method);
  if (!action || !context || context.auditLogged) {
    return;
  }

  const tenantId = context.auth?.tenantId || "";
  const userId = context.auth?.userId || "";

  if (!tenantId || !userId) {
    return;
  }

  markRequestAuditLogged();

  const tableAffected = normalizeTableName(context.path);
  const recordId = inferRecordId(data, context.path);

  void (async () => {
    try {
      await dbConnect();
      await writeAuditLog({
        tenantId,
        userId,
        action,
        tableAffected,
        recordId,
        newValue:
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : undefined,
      });
    } catch (error) {
      console.error("Audit logging error:", error);
    }
  })();
}

export function apiError(message: string, status = 400, errors?: unknown[]) {
  if (!isV1Request()) {
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
      errors: errors && errors.length ? errors : [{ message }],
    },
    { status },
  );
}

export function apiSuccess(data: unknown, status = 200) {
  scheduleWriteAudit(data, status);

  if (!isV1Request()) {
    return NextResponse.json(data, { status });
  }

  if (Array.isArray(data)) {
    return NextResponse.json(
      {
        success: true,
        data,
        items: data,
      },
      { status },
    );
  }

  if (data && typeof data === "object") {
    return NextResponse.json(
      {
        ...(data as Record<string, unknown>),
        success: true,
        data,
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}
