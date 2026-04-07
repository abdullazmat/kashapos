import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import AuditLog from "@/models/AuditLog";

type AuditAction = "create" | "update" | "delete" | "system";

export async function writeAuditLog(input: {
  tenantId: string;
  userId?: string;
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

  const doc: Record<string, unknown> = {
    tenantId: mongoose.isValidObjectId(input.tenantId)
      ? new mongoose.Types.ObjectId(input.tenantId)
      : undefined,
    action: input.action,
    tableAffected: input.tableAffected,
    recordId: input.recordId,
    oldValue: input.oldValue,
    newValue: input.newValue,
    ipAddress,
  };

  if (input.userId && mongoose.isValidObjectId(input.userId)) {
    doc.userId = new mongoose.Types.ObjectId(input.userId);
  }

  await AuditLog.create(doc);
}
