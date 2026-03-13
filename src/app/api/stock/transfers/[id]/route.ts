import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockTransfer from "@/models/StockTransfer";
import StockAdjustment from "@/models/StockAdjustment";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "").trim();

    const transfer = await StockTransfer.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!transfer) return apiError("Transfer not found", 404);

    const item = transfer.items[0];
    if (!item) return apiError("Transfer item missing", 400);

    if (action === "receive") {
      if (transfer.status === "received") {
        return apiError("Transfer already received", 400);
      }
      if (transfer.status === "cancelled") {
        return apiError("Cancelled transfer cannot be received", 400);
      }

      const destinationStock = await Stock.findOneAndUpdate(
        {
          tenantId: auth.tenantId,
          branchId: transfer.toBranchId,
          productId: item.productId,
        },
        {
          $inc: { quantity: item.quantity },
          $setOnInsert: {
            tenantId: auth.tenantId,
            branchId: transfer.toBranchId,
            productId: item.productId,
          },
        },
        { upsert: true, new: true },
      );

      transfer.status = "received";
      transfer.receivedBy = auth.userId as never;
      transfer.receivedByName = String(
        body.receivedByName || auth.name || "",
      ).trim();
      transfer.receivedAt = new Date();
      transfer.items = transfer.items.map((row) => ({
        ...row,
        receivedQuantity: row.quantity,
      })) as typeof transfer.items;
      await transfer.save();

      await StockAdjustment.create({
        tenantId: auth.tenantId,
        productId: item.productId,
        branchId: transfer.toBranchId,
        toBranchId: transfer.fromBranchId,
        type: "transfer_in",
        quantity: item.quantity,
        currentQty: destinationStock.quantity - item.quantity,
        newQty: destinationStock.quantity,
        reason: transfer.notes || "Transfer received",
        reference: transfer.transferNumber,
        notes: transfer.notes || "",
        performedBy: auth.userId,
        linkedTransferId: transfer._id,
      });

      return apiSuccess({ transfer });
    }

    if (action === "cancel") {
      if (transfer.status === "received") {
        return apiError("Received transfer cannot be cancelled", 400);
      }
      if (transfer.status === "cancelled") {
        return apiError("Transfer already cancelled", 400);
      }

      const sourceStock = await Stock.findOneAndUpdate(
        {
          tenantId: auth.tenantId,
          branchId: transfer.fromBranchId,
          productId: item.productId,
        },
        {
          $inc: { quantity: item.quantity },
          $setOnInsert: {
            tenantId: auth.tenantId,
            branchId: transfer.fromBranchId,
            productId: item.productId,
          },
        },
        { upsert: true, new: true },
      );

      transfer.status = "cancelled";
      await transfer.save();

      await StockAdjustment.create({
        tenantId: auth.tenantId,
        productId: item.productId,
        branchId: transfer.fromBranchId,
        toBranchId: transfer.toBranchId,
        type: "count_correction",
        quantity: item.quantity,
        currentQty: sourceStock.quantity - item.quantity,
        newQty: sourceStock.quantity,
        reason: "Transfer cancelled",
        reference: transfer.transferNumber,
        notes: transfer.notes || "",
        performedBy: auth.userId,
        linkedTransferId: transfer._id,
      });

      return apiSuccess({ transfer });
    }

    return apiError("Invalid action", 400);
  } catch (error) {
    console.error("Stock transfer PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}
