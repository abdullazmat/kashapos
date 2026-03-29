import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import PurchaseOrder from "@/models/PurchaseOrder";
import VendorPayment from "@/models/VendorPayment";
import ActivityLog from "@/models/ActivityLog";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = await request.json();
    const { vendorId, amount, method, reference, notes } = body;

    if (!vendorId || !amount) {
      return apiError("Vendor and amount are required", 400);
    }

    const vendor = await Vendor.findOne({ _id: vendorId, tenantId: auth.tenantId });
    if (!vendor) return apiError("Vendor not found", 404);

    let remainingToAllocate = Number(amount);
    const appliedTo = [];

    // Find outstanding POs (FIFO - First In, First Out)
    const outstandingPOs = await PurchaseOrder.find({
      vendorId,
      tenantId: auth.tenantId,
      paymentStatus: { $in: ["unpaid", "partial"] },
      status: { $ne: "cancelled" }
    }).sort({ createdAt: 1 });

    for (const po of outstandingPOs) {
      if (remainingToAllocate <= 0) break;

      const outstandingOnPO = po.total - po.amountPaid;
      const paymentForPO = Math.min(remainingToAllocate, outstandingOnPO);

      po.amountPaid += paymentForPO;
      if (po.amountPaid >= po.total) {
        po.paymentStatus = "paid";
      } else {
        po.paymentStatus = "partial";
      }

      await po.save();
      
      appliedTo.push({
        purchaseOrderId: po._id,
        amount: paymentForPO
      });

      remainingToAllocate -= paymentForPO;
    }

    // Record the payment
    const payment = await VendorPayment.create({
      tenantId: auth.tenantId,
      vendorId,
      amount: Number(amount),
      method,
      reference,
      notes,
      appliedTo,
      paymentDate: new Date()
    });

    // Update vendor total paid
    vendor.totalPaid = (vendor.totalPaid || 0) + Number(amount);
    await vendor.save();

    // Log activity
    await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "pay",
      module: "vendors",
      description: `Processed vendor payment of ${amount} for ${vendor.name}`,
      metadata: { paymentId: payment._id, vendorId: vendor._id },
    });

    return apiSuccess({
      payment,
      remainingUnallocated: remainingToAllocate
    });
  } catch (error) {
    console.error("Vendor Pay error:", error);
    return apiError("Internal server error", 500);
  }
}
