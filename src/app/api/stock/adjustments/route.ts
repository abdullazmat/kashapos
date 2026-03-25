import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockAdjustment from "@/models/StockAdjustment";
import ActivityLog from "@/models/ActivityLog";
import Product from "@/models/Product";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const adjustments = await StockAdjustment.find({ tenantId: auth.tenantId })
      .populate("productId", "name sku")
      .populate("branchId", "name code")
      .populate("toBranchId", "name code")
      .populate("performedBy", "name")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return apiSuccess({ adjustments });
  } catch (error) {
    console.error("Stock adjustments GET error:", error);
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
    const branchId = String(body.branchId || "");
    const productId = String(body.productId || "");
    const adjustmentType = String(body.adjustmentType || "");
    const quantity = Number(body.quantity || 0);
    const reason = String(body.reason || "").trim();
    const reference = String(body.reference || "").trim();
    const notes = String(body.notes || "").trim();
    const approvedBy = String(body.approvedBy || "").trim();
    const adjustmentDate = body.adjustmentDate
      ? new Date(String(body.adjustmentDate))
      : new Date();

    if (!branchId || !productId || !adjustmentType || quantity <= 0) {
      return apiError(
        "branchId, productId, adjustmentType and quantity are required",
        400,
      );
    }

    if (adjustmentType === "transfer_out") {
      return apiError(
        "Use transfer endpoint for transfer_out adjustments",
        400,
      );
    }

    const stock = await Stock.findOne({
      tenantId: auth.tenantId,
      branchId,
      productId,
    });
    const currentQty = stock?.quantity || 0;

    let delta = 0;
    switch (adjustmentType) {
      case "stock_in":
      case "addition":
      case "transfer_in":
        delta = quantity;
        break;
      case "stock_out":
      case "subtraction":
      case "return_to_supplier":
      case "damage":
        delta = -quantity;
        break;
      case "count_correction": {
        const requestedNewQty = Number(body.newQty);
        if (!Number.isFinite(requestedNewQty) || requestedNewQty < 0) {
          return apiError("newQty is required for count correction", 400);
        }
        delta = requestedNewQty - currentQty;
        break;
      }
      case "correction":
        delta = Number(body.delta || 0);
        break;
      default:
        return apiError("Invalid adjustment type", 400);
    }

    if (currentQty + delta < 0) {
      return apiError("Adjustment would result in negative stock", 400);
    }

    const updated = await Stock.findOneAndUpdate(
      { tenantId: auth.tenantId, branchId, productId },
      {
        $inc: { quantity: delta },
        $setOnInsert: { tenantId: auth.tenantId, branchId, productId },
      },
      { upsert: true, new: true },
    );

    const adjustment = await StockAdjustment.create({
      tenantId: auth.tenantId,
      branchId,
      productId,
      type: adjustmentType,
      quantity,
      currentQty,
      newQty: updated.quantity,
      reason,
      reference: reference || undefined,
      notes,
      performedBy: auth.userId,
      approvedBy: approvedBy || undefined,
      adjustmentDate,
    });

    // Log to activity log
    const product = await Product.findById(productId).select("name").lean();
    await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "update",
      module: "stock",
      description: `Adjusted stock for ${product?.name || "item"}: ${delta > 0 ? "+" : ""}${delta} units (${adjustmentType})`,
      metadata: { productId, adjustmentId: adjustment._id, type: adjustmentType, delta },
    });

    return apiSuccess({ adjustment, newQty: updated.quantity }, 201);
  } catch (error) {
    console.error("Stock adjustments POST error:", error);
    return apiError("Internal server error", 500);
  }
}
