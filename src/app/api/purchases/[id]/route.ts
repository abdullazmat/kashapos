import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Stock from "@/models/Stock";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

function getReceivedQuantities(items: any[]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    const quantity = item.receivedQuantity > 0 ? item.receivedQuantity : item.quantity;
    quantities.set(
      item.productId.toString(),
      (quantities.get(item.productId.toString()) || 0) + quantity
    );
  }
  return quantities;
}

async function applyStockDeltas(tenantId: string, branchId: string, deltas: Map<string, number>) {
  for (const [productId, delta] of deltas.entries()) {
    if (delta === 0) continue;
    await Stock.findOneAndUpdate(
      { tenantId, branchId, productId },
      {
        $inc: { quantity: delta },
        $setOnInsert: { reorderLevel: 10, reservedQuantity: 0 },
      },
      { upsert: true, new: true }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const order = await PurchaseOrder.findOne({
      _id: id,
      tenantId: auth.tenantId,
    }).populate("vendorId", "name").lean();

    if (!order) return apiError("Order not found", 404);
    return apiSuccess({ order });
  } catch (error) {
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const existingOrder = await PurchaseOrder.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });

    if (!existingOrder) return apiError("Order not found", 404);

    const oldStatus = existingOrder.status;
    
    // Only update if status is valid transition
    if (status === "received" && oldStatus !== "received") {
      // Transitioning to received: update stock
      await applyStockDeltas(
        auth.tenantId,
        existingOrder.branchId.toString(),
        getReceivedQuantities(existingOrder.items)
      );
    }

    Object.assign(existingOrder, body);
    await existingOrder.save();

    return apiSuccess({ order: existingOrder });
  } catch (error) {
    console.error("Purchase PUT error:", error);
    return apiError(error instanceof Error ? error.message : "Internal server error", 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    await PurchaseOrder.deleteOne({ _id: id, tenantId: auth.tenantId });
    return apiSuccess({ success: true });
  } catch (error) {
    return apiError("Internal server error", 500);
  }
}
