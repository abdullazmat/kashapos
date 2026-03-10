import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Return from "@/models/Return";
import Stock from "@/models/Stock";
import Branch from "@/models/Branch";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || "";

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (type) query.type = type;

    const [returns, total] = await Promise.all([
      Return.find(query)
        .populate("processedBy", "name")
        .populate("customerId", "name")
        .populate("vendorId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Return.countDocuments(query),
    ]);

    return apiSuccess({
      returns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Returns GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = await request.json();
    if (!body.type || !body.items || body.items.length === 0) {
      return apiError("Type and items are required", 400);
    }

    const branchId = auth.branchId
      ? auth.branchId
      : (
          await Branch.findOne({ tenantId: auth.tenantId, isMain: true })
            .select("_id")
            .lean()
        )?._id;

    if (!branchId) {
      return apiError("No branch is configured for this return", 400);
    }

    // Generate return number
    const count = await Return.countDocuments({ tenantId: auth.tenantId });
    const prefix = body.type === "sales_return" ? "SR" : "PR";
    const returnNumber = `${prefix}-${String(count + 1).padStart(5, "0")}`;

    const items = body.items.map(
      (item: {
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        reason?: string;
        [key: string]: unknown;
      }) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }),
    );

    const hasInvalidItems = items.some(
      (item: {
        productId?: string;
        productName?: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
      }) =>
        !item.productId ||
        !item.productName ||
        !item.sku ||
        item.quantity <= 0 ||
        item.unitPrice < 0,
    );

    if (hasInvalidItems) {
      return apiError(
        "Each return item must include a product, SKU, quantity, and valid price",
        400,
      );
    }

    const subtotal = items.reduce(
      (sum: number, item: { total: number }) => sum + item.total,
      0,
    );

    const returnDoc = await Return.create({
      tenantId: auth.tenantId,
      branchId,
      returnNumber,
      type: body.type,
      referenceNumber: body.referenceNumber || "",
      customerId: body.customerId || undefined,
      vendorId: body.vendorId || undefined,
      items,
      subtotal,
      total: subtotal,
      status: "pending",
      refundMethod: body.refundMethod || "cash",
      notes: body.notes || "",
      processedBy: auth.userId,
    });

    return apiSuccess(returnDoc, 201);
  } catch (error: unknown) {
    console.error("Returns POST error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) return apiError("ID and status required", 400);

    const returnDoc = await Return.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!returnDoc) return apiError("Return not found", 404);

    // If approving/completing a sales return, add stock back
    if (
      status === "completed" &&
      returnDoc.status !== "completed" &&
      returnDoc.type === "sales_return"
    ) {
      for (const item of returnDoc.items) {
        await Stock.findOneAndUpdate(
          {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            productId: item.productId,
          },
          { $inc: { quantity: item.quantity } },
          { upsert: true },
        );
      }
    }

    // If completing a purchase return, subtract stock
    if (
      status === "completed" &&
      returnDoc.status !== "completed" &&
      returnDoc.type === "purchase_return"
    ) {
      for (const item of returnDoc.items) {
        await Stock.findOneAndUpdate(
          {
            tenantId: auth.tenantId,
            branchId: auth.branchId,
            productId: item.productId,
          },
          { $inc: { quantity: -item.quantity } },
        );
      }
    }

    returnDoc.status = status;
    await returnDoc.save();

    return apiSuccess(returnDoc);
  } catch (error: unknown) {
    console.error("Returns PATCH error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
