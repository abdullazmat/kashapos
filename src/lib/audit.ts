import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import AuditLog from "@/models/AuditLog";

type AuditAction = "create" | "update" | "delete";

export async function writeAuditLog(input: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  tableAffected: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  request?: NextRequest;
}) {
  const ipHeader = input.request?.headers.get("x-forwarded-for") || "";
  const ipAddress =
    ipHeader.split(",")[0]?.trim() ||
    input.request?.headers.get("x-real-ip") ||
    undefined;

  await AuditLog.create({
    tenantId: new mongoose.Types.ObjectId(input.tenantId),
    userId: new mongoose.Types.ObjectId(input.userId),
    action: input.action,
    tableAffected: input.tableAffected,
    recordId: input.recordId,
    oldValue: input.oldValue,
    newValue: input.newValue,
    ipAddress,
  });
}
