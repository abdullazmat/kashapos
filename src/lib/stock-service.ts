import mongoose from "mongoose";
import Stock from "@/models/Stock";
import Product from "@/models/Product";

/**
 * Unified service to handle stock changes across the application.
 * Updates both the branch-specific Stock model and the product/variant catalog stock.
 */
export async function applyStockUpdate(
  tenantId: string,
  branchId: string,
  items: Array<{
    productId?: string | mongoose.Types.ObjectId;
    sku?: string;
    productName?: string;
    unit?: string;
    quantity: number; // Positive for additions (purchases), negative for deductions (sales)
    unitCost?: number; // Optional, updates costPrice if provided
  }>,
) {
  for (const item of items) {
    if (!item.productId && !item.sku && !item.productName) continue;
    if (item.quantity === 0) continue;

    const delta = item.quantity;
    
    // 1. Find the product and/or variant
    let product = null;
    if (item.sku) {
      product = await Product.findOne({
        tenantId,
        $or: [{ sku: item.sku }, { "variants.sku": item.sku }],
      });
    } else if (item.productId && mongoose.isValidObjectId(item.productId)) {
      product = await Product.findOne({ _id: item.productId, tenantId });
    } else if (item.productName) {
      // Fallback: search by name (case-insensitive)
      product = await Product.findOne({
        tenantId,
        name: { $regex: new RegExp(`^${item.productName.trim()}$`, "i") },
      });
    }

    if (!product) {
      // If still not found, and it's a purchase (delta > 0), auto-create the product!
      // This is necessary to satisfy the "Quantity drives through all modules" requirement.
      if (delta > 0 && item.productName) {
        const name = item.productName.trim();
        const stamp = Date.now().toString(36).toUpperCase();
        product = await Product.create({
          tenantId,
          name,
          slug: `${name.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-")}-${stamp}`,
          sku: item.sku || `PUR-${stamp}`,
          unit: item.unit || "piece",
          price: (item.unitCost || 0) * 1.5, // Default markup if unknown
          costPrice: item.unitCost || 0,
          trackStock: true,
          isActive: true,
        });
        console.log(`[StockService] Auto-created product: ${name}`);
      } else {
        console.warn(`[StockService] Skipping stock update for unknown product: SKU: ${item.sku}, Name: ${item.productName}`);
        continue;
      }
    }

    const targetProductId = product._id;

    // 2. Update Branch-Specific Stock (Stock model)
    // This model is the primary source for total quantity per branch
    await Stock.findOneAndUpdate(
      { tenantId, branchId, productId: targetProductId },
      {
        $inc: { quantity: delta },
        $setOnInsert: { reorderLevel: 10, reservedQuantity: 0 },
      },
      { upsert: true, new: true },
    );

    // 3. Update Product Catalog (Cost & Variant Stock)
    let productChanged = false;

    // Update cost price if specified (usually for purchases)
    if (item.unitCost && item.unitCost > 0) {
      if (product.sku === item.sku || !product.hasVariants) {
        product.costPrice = item.unitCost;
        productChanged = true;
      } else if (item.sku) {
        const variantIndex = product.variants.findIndex((v: { sku: string }) => v.sku === item.sku);
        if (variantIndex > -1) {
          product.variants[variantIndex].costPrice = item.unitCost;
          productChanged = true;
        }
      }
    }

    // Update variant-specific stock if it's a variant match
    if (product.hasVariants && item.sku) {
      const variantIndex = product.variants.findIndex((v: { sku: string }) => v.sku === item.sku);
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
