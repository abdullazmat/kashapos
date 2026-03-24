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

async function applyStockDeltas(tenantId: string, branchId: string, deltas: Map<string, number>, items: any[]) {
  const Product = (await import("@/models/Product")).default;
  const mongoose = (await import("mongoose")).default;

  for (const item of items) {
    if (!item.sku && !item.productId) continue;
    const delta = item.receivedQuantity > 0 ? item.receivedQuantity : item.quantity;
    if (delta <= 0) continue;

    let targetProductId = item.productId;
    let variantSku = item.sku;

    // 1. Find the product and/or variant by SKU if productId is missing or to confirm variant
    let product = null;
    if (item.sku) {
      product = await Product.findOne({
        tenantId,
        $or: [{ sku: item.sku }, { "variants.sku": item.sku }],
      });
    } else if (item.productId) {
      product = await Product.findOne({ _id: item.productId, tenantId });
    }

    if (!product) {
      console.warn(`Could not find product for SKU: ${item.sku} or ID: ${item.productId}`);
      continue;
    }

    targetProductId = product._id;

    // 2. Update stock levels (Stock model uses productId)
    await Stock.findOneAndUpdate(
      { tenantId, branchId, productId: targetProductId },
      {
        $inc: { quantity: delta },
        $setOnInsert: { reorderLevel: 10, reservedQuantity: 0 },
      },
      { upsert: true, new: true }
    );

    // 3. Update Product Catalog (Cost & Variant Stock)
    let productChanged = false;

    // Update cost price if specified
    if (item.unitCost > 0) {
      if (product.sku === item.sku || !product.hasVariants) {
        // Main product cost update
        product.costPrice = item.unitCost;
        productChanged = true;
      } else if (item.sku) {
        // Variant cost update
        const variantIndex = product.variants.findIndex(v => v.sku === item.sku);
        if (variantIndex > -1) {
          product.variants[variantIndex].costPrice = item.unitCost;
          productChanged = true;
        }
      }
    }

    // Update variant-specific stock if it's a variant match
    if (product.hasVariants && item.sku) {
      const variantIndex = product.variants.findIndex(v => v.sku === item.sku);
      if (variantIndex > -1) {
        product.variants[variantIndex].stock = (product.variants[variantIndex].stock || 0) + delta;
        productChanged = true;
      }
    }

    if (productChanged) {
      await product.save();
    }
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
        getReceivedQuantities(existingOrder.items),
        existingOrder.items
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
