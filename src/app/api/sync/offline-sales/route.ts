import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";
import ActivityLog from "@/models/ActivityLog";
import Stock from "@/models/Stock";
import OfflineSyncOperation from "@/models/OfflineSyncOperation";
import User from "@/models/User";

type OfflineOperation = {
  operationKey: string;
  type: "sale";
  clientTimestamp: string;
  payload: Record<string, unknown>;
};

type SaleItem = {
  productId: string;
  quantity: number;
};

function normalizeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeSaleItems(payload: Record<string, unknown>) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const normalized: SaleItem[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const productId = String(candidate.productId || "").trim();
    const quantity = Number(candidate.quantity || 0);

    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    normalized.push({ productId, quantity });
  }

  return normalized;
}

function buildStockKey(productId: string, branchId: string) {
  return `${productId}:${branchId}`;
}

async function detectOutOfStockConflicts(input: {
  tenantId: string;
  branchId: string;
  payload: Record<string, unknown>;
  pendingDeltas: Map<string, number>;
}) {
  const items = normalizeSaleItems(input.payload);
  const requiredByProduct = new Map<string, number>();

  for (const item of items) {
    requiredByProduct.set(
      item.productId,
      (requiredByProduct.get(item.productId) || 0) + item.quantity,
    );
  }

  const productIds = [...requiredByProduct.keys()];
  if (!productIds.length) {
    return [] as Array<Record<string, unknown>>;
  }

  const stockEntries = await Stock.find({
    tenantId: input.tenantId,
    branchId: input.branchId,
    productId: { $in: productIds },
  })
    .select("productId quantity reservedQuantity")
    .lean();

  const stockByProduct = new Map(
    stockEntries.map((entry) => [String(entry.productId), entry]),
  );

  const conflicts: Array<Record<string, unknown>> = [];

  for (const [productId, requiredQuantity] of requiredByProduct.entries()) {
    const stock = stockByProduct.get(productId);
    const baseQuantity = Number(stock?.quantity || 0);
    const reservedQuantity = Number(stock?.reservedQuantity || 0);
    const availableQuantity = Math.max(0, baseQuantity - reservedQuantity);
    const pendingDelta =
      input.pendingDeltas.get(buildStockKey(productId, input.branchId)) || 0;
    const effectiveAvailable = availableQuantity + pendingDelta;

    if (effectiveAvailable < requiredQuantity) {
      conflicts.push({
        productId,
        requiredQuantity,
        availableQuantity: effectiveAvailable,
        policy: "first-write-wins",
        code: "OUT_OF_STOCK_STALE_OPERATION",
      });
    }
  }

  return conflicts;
}

function applyPendingStockDelta(input: {
  branchId: string;
  payload: Record<string, unknown>;
  pendingDeltas: Map<string, number>;
}) {
  for (const item of normalizeSaleItems(input.payload)) {
    const key = buildStockKey(item.productId, input.branchId);
    input.pendingDeltas.set(
      key,
      (input.pendingDeltas.get(key) || 0) - item.quantity,
    );
  }
}

async function notifyManagersOnStockConflict(input: {
  tenantId: string;
  actorUserId: string;
  actorName: string;
  operationKey: string;
  branchId: string;
  conflicts: Array<Record<string, unknown>>;
}) {
  try {
    const managers = await User.find({
      tenantId: input.tenantId,
      isActive: true,
      role: { $in: ["admin", "manager", "store_manager"] },
    })
      .select("_id name email")
      .lean();

    if (!managers.length) {
      return;
    }

    const conflictSummary = input.conflicts
      .map((conflict) => {
        const productId = String(conflict.productId || "unknown");
        const required = Number(conflict.requiredQuantity || 0);
        const available = Number(conflict.availableQuantity || 0);
        return `${productId}: required ${required}, available ${available}`;
      })
      .join("; ");

    await ActivityLog.create({
      tenantId: input.tenantId,
      userId: input.actorUserId,
      userName: input.actorName || "System",
      action: "update",
      module: "stock",
      description: `Offline stock conflict detected for operation ${input.operationKey}`,
      metadata: {
        operationKey: input.operationKey,
        branchId: input.branchId,
        policy: "first-write-wins",
        conflicts: input.conflicts,
        notifiedManagerIds: managers.map((manager) => String(manager._id)),
      },
    });

    await Promise.allSettled(
      managers
        .filter(
          (manager) =>
            typeof manager.email === "string" && manager.email.trim(),
        )
        .map((manager) =>
          sendTenantEmail({
            tenantId: input.tenantId,
            to: String(manager.email),
            subject: "Offline stock conflict requires review",
            text: `Hello ${String(manager.name || "Manager")},\n\nAn offline sales operation was rejected due to stock conflict.\nOperation key: ${input.operationKey}\nBranch: ${input.branchId}\nPolicy: first-write-wins\nConflicts: ${conflictSummary}\n\nPlease review stock and reconciliation queues in the dashboard.`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Offline Stock Conflict</h2><p>Hello ${String(manager.name || "Manager")},</p><p>An offline sales operation was rejected due to stock conflict.</p><p><strong>Operation key:</strong> ${input.operationKey}<br/><strong>Branch:</strong> ${input.branchId}<br/><strong>Policy:</strong> first-write-wins</p><p><strong>Conflicts:</strong> ${conflictSummary}</p><p>Please review stock and reconciliation queues in the dashboard.</p></div>`,
          }),
        ),
    );
  } catch (error) {
    console.error("Manager stock conflict notification error:", error);
  }
}

async function replaySale(
  request: NextRequest,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/sales`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") || "",
      "x-api-version": request.headers.get("x-api-version") || "0",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseBody = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error =
      (typeof responseBody.error === "string" && responseBody.error) ||
      (typeof responseBody.message === "string" && responseBody.message) ||
      "Failed to replay sale";

    return { ok: false, error };
  }

  return { ok: true, data: responseBody };
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as Record<string, unknown>;
    const rawOperations = Array.isArray(body.operations)
      ? (body.operations as OfflineOperation[])
      : [];

    if (!rawOperations.length) {
      return apiError("No offline operations were provided", 400);
    }

    const operations = rawOperations
      .map((operation) => {
        const operationKey = String(operation?.operationKey || "").trim();
        const operationType = String(operation?.type || "").trim();
        const clientTimestamp = normalizeTimestamp(
          String(operation?.clientTimestamp || ""),
        );
        const payload =
          operation?.payload && typeof operation.payload === "object"
            ? operation.payload
            : null;

        if (
          !operationKey ||
          operationType !== "sale" ||
          !clientTimestamp ||
          !payload
        ) {
          return null;
        }

        return {
          operationKey,
          type: "sale" as const,
          clientTimestamp,
          payload,
        };
      })
      .filter(
        (operation): operation is NonNullable<typeof operation> => !!operation,
      )
      .sort((a, b) => {
        if (a.clientTimestamp !== b.clientTimestamp) {
          return a.clientTimestamp - b.clientTimestamp;
        }
        return a.operationKey.localeCompare(b.operationKey);
      });

    if (!operations.length) {
      return apiError("No valid offline sale operations were provided", 400);
    }

    const pendingDeltas = new Map<string, number>();
    const results: Array<Record<string, unknown>> = [];

    for (const operation of operations) {
      const existing = await OfflineSyncOperation.findOne({
        tenantId: auth.tenantId,
        operationKey: operation.operationKey,
      })
        .select("status result")
        .lean();

      if (existing) {
        results.push({
          operationKey: operation.operationKey,
          status: existing.status,
          idempotentReplay: true,
          ...(existing.result || {}),
        });
        continue;
      }

      const branchId = String(
        operation.payload.branchId || auth.branchId || "",
      ).trim();

      if (!branchId) {
        const result = {
          operationKey: operation.operationKey,
          status: "rejected",
          code: "MISSING_BRANCH",
          message: "No branch is configured for this offline sale",
        };

        await OfflineSyncOperation.create({
          tenantId: auth.tenantId,
          operationKey: operation.operationKey,
          operationType: operation.type,
          clientTimestamp: new Date(operation.clientTimestamp),
          status: "rejected",
          result,
        });

        results.push(result);
        continue;
      }

      const conflicts = await detectOutOfStockConflicts({
        tenantId: auth.tenantId,
        branchId,
        payload: operation.payload,
        pendingDeltas,
      });

      if (conflicts.length) {
        const result = {
          operationKey: operation.operationKey,
          status: "rejected",
          code: "STOCK_CONFLICT",
          message:
            "Offline sale was rejected by deterministic conflict policy (first-write-wins)",
          conflicts,
        };

        await OfflineSyncOperation.create({
          tenantId: auth.tenantId,
          operationKey: operation.operationKey,
          operationType: operation.type,
          clientTimestamp: new Date(operation.clientTimestamp),
          status: "rejected",
          result,
        });

        results.push(result);

        void notifyManagersOnStockConflict({
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          actorName: auth.name,
          operationKey: operation.operationKey,
          branchId,
          conflicts,
        });

        continue;
      }

      const replayResult = await replaySale(request, {
        ...operation.payload,
        branchId,
      });

      if (!replayResult.ok) {
        const result = {
          operationKey: operation.operationKey,
          status: "rejected",
          code: "REPLAY_FAILED",
          message: replayResult.error,
        };

        await OfflineSyncOperation.create({
          tenantId: auth.tenantId,
          operationKey: operation.operationKey,
          operationType: operation.type,
          clientTimestamp: new Date(operation.clientTimestamp),
          status: "rejected",
          result,
        });

        results.push(result);
        continue;
      }

      applyPendingStockDelta({
        branchId,
        payload: operation.payload,
        pendingDeltas,
      });

      const result = {
        operationKey: operation.operationKey,
        status: "applied",
        code: "SYNCED",
        replay: replayResult.data,
      };

      await OfflineSyncOperation.create({
        tenantId: auth.tenantId,
        operationKey: operation.operationKey,
        operationType: operation.type,
        clientTimestamp: new Date(operation.clientTimestamp),
        status: "applied",
        result,
      });

      results.push(result);
    }

    return apiSuccess(
      {
        syncedAt: new Date().toISOString(),
        results,
      },
      200,
    );
  } catch (error) {
    console.error("Offline sales sync error:", error);
    return apiError("Failed to sync offline sales", 500);
  }
}
