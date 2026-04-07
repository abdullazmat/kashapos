import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseOrder, { IPurchaseOrderItem } from "@/models/PurchaseOrder";
import Stock from "@/models/Stock";
import ActivityLog from "@/models/ActivityLog";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { applyStockUpdate } from "@/lib/stock-service";

async function applyStockDeltas(
  tenantId: string,
  branchId: string,
  items: IPurchaseOrderItem[],
) {
  await applyStockUpdate(
    tenantId,
    branchId,
    items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      productName: i.productName,
      quantity: i.receivedQuantity > 0 ? i.receivedQuantity : i.quantity,
      unitCost: i.unitCost,
    })),
  );
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
    }).populate("vendorId", "name");

    if (!existingOrder) return apiError("Order not found", 404);

    const oldStatus = existingOrder.status;
    
    // Only update if status is valid transition
    if (status === "received" && oldStatus !== "received") {
      // Transitioning to received: update stock
      await applyStockDeltas(
        auth.tenantId,
        existingOrder.branchId.toString(),
        existingOrder.items,
      );

      // Log activity
      await ActivityLog.create({
        tenantId: auth.tenantId,
        userId: auth.userId,
        userName: auth.name || "Unknown",
        action: "update",
        module: "purchases",
        description: `Received purchase order ${existingOrder.orderNumber} from ${(existingOrder.vendorId as { name?: string })?.name || "supplier"}`,
        metadata: { orderId: existingOrder._id.toString(), numItems: existingOrder.items.length },
      });
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
