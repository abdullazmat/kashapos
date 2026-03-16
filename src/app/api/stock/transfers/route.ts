import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import Product from "@/models/Product";
import StockTransfer from "@/models/StockTransfer";
import StockAdjustment from "@/models/StockAdjustment";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

function transferPrefix(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `TRF-${yyyy}${mm}${dd}`;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const transfers = await StockTransfer.find({ tenantId: auth.tenantId })
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return apiSuccess({ transfers });
  } catch (error) {
    console.error("Stock transfers GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const body = (await request.json()) as Record<string, unknown>;
    const fromBranchId = String(body.fromBranchId || "");
    const toBranchId = String(body.toBranchId || "");
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity || 0);
    const transferDate = body.transferDate
      ? new Date(String(body.transferDate))
      : new Date();
    const transportedBy = String(body.transportedBy || "").trim();
    const receivedByName = String(body.receivedByName || "").trim();
    const notes = String(body.notes || "").trim();
    const requestedStatus = String(body.status || "in_transit").trim();
    const allowedStatuses = ["pending", "in_transit", "received", "cancelled"];
    const transferStatus = allowedStatuses.includes(requestedStatus)
      ? (requestedStatus as "pending" | "in_transit" | "received" | "cancelled")
      : ("in_transit" as const);

    if (!fromBranchId || !toBranchId || !productId || quantity <= 0) {
      return apiError(
        "fromBranchId, toBranchId, productId and quantity are required",
        400,
      );
    }

    if (fromBranchId === toBranchId) {
      return apiError(
        "Source and destination locations must be different",
        400,
      );
    }

    const sourceStock = await Stock.findOne({
      tenantId: auth.tenantId,
      branchId: fromBranchId,
      productId,
    });
    const currentQty = sourceStock?.quantity || 0;
    if (currentQty < quantity) {
      return apiError("Insufficient stock at source location", 400);
    }

    const product = await Product.findOne({
      _id: productId,
      tenantId: auth.tenantId,
    }).lean();
    if (!product) return apiError("Product not found", 404);

    const prefix = transferPrefix(new Date());
    const existingCount = await StockTransfer.countDocuments({
      tenantId: auth.tenantId,
      transferNumber: { $regex: `^${prefix}` },
    });
    const transferNumber = `${prefix}-${String(existingCount + 1).padStart(3, "0")}`;

    await Stock.findOneAndUpdate(
      { tenantId: auth.tenantId, branchId: fromBranchId, productId },
      { $inc: { quantity: -quantity } },
      { new: true },
    );

    await Stock.findOneAndUpdate(
      { tenantId: auth.tenantId, branchId: toBranchId, productId },
      {
        $setOnInsert: {
          tenantId: auth.tenantId,
          branchId: toBranchId,
          productId,
          quantity: 0,
        },
      },
      { upsert: true, new: true },
    );

    const transfer = await StockTransfer.create({
      tenantId: auth.tenantId,
      transferNumber,
      fromBranchId,
      toBranchId,
      items: [
        {
          productId,
          productName: product.name,
          quantity,
          receivedQuantity: 0,
        },
      ],
      status: transferStatus,
      transferDate,
      transportedBy,
      receivedByName,
      notes,
      createdBy: auth.userId,
    });

    await StockAdjustment.create({
      tenantId: auth.tenantId,
      productId,
      branchId: fromBranchId,
      toBranchId,
      type: "transfer_out",
      quantity,
      currentQty,
      newQty: currentQty - quantity,
      reason: notes || "Transfer out",
      reference: transferNumber,
      notes,
      performedBy: auth.userId,
      linkedTransferId: transfer._id,
    });

    return apiSuccess({ transfer }, 201);
  } catch (error) {
    console.error("Stock transfers POST error:", error);
    return apiError("Internal server error", 500);
  }
}
