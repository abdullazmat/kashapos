import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import NotificationRead from "@/models/NotificationRead";
import PurchaseOrder from "@/models/PurchaseOrder";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import "@/models/Vendor";
import "@/models/Product";

type NotificationType = "warning" | "success" | "info";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  href: string;
  read: boolean;
};

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function branchScope(branchId?: string) {
  return branchId ? { branchId: toObjectId(branchId) } : {};
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const now = new Date();
    const tenantObjectId = toObjectId(auth.tenantId);
    const scopedBranch = branchScope(auth.branchId);

    const [
      lowStockRows,
      recentSales,
      recentCustomers,
      purchaseUpdates,
      overdueInvoices,
      outstandingVendorPayments,
    ] = await Promise.all([
      Stock.find({
        tenantId: tenantObjectId,
        ...scopedBranch,
        $expr: { $lte: ["$quantity", "$reorderLevel"] },
      })
        .populate("productId", "name")
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(),
      Sale.find({
        tenantId: tenantObjectId,
        ...scopedBranch,
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Customer.find({ tenantId: tenantObjectId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      PurchaseOrder.find({
        tenantId: tenantObjectId,
        ...scopedBranch,
        status: { $in: ["partial", "received"] },
      })
        .populate("vendorId", "name")
        .sort({ updatedAt: -1 })
        .limit(2)
        .lean(),
      Invoice.find({
        tenantId: tenantObjectId,
        status: { $nin: ["paid", "cancelled"] },
        balance: { $gt: 0 },
        dueDate: { $exists: true, $lt: now },
      })
        .populate("customerId", "name")
        .sort({ dueDate: 1 })
        .limit(3)
        .lean(),
      PurchaseOrder.find({
        tenantId: tenantObjectId,
        ...scopedBranch,
        status: { $in: ["partial", "received"] },
        paymentStatus: { $in: ["unpaid", "partial"] },
      })
        .populate("vendorId", "name")
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const lowStockNotifications: NotificationItem[] = lowStockRows.map(
      (row) => ({
        id: `stock-low-${String(row._id)}`,
        type: "warning",
        title: "Low Stock Alert",
        message: `${(row.productId as { name?: string })?.name || "Item"} is below reorder level (${row.quantity} remaining)`,
        createdAt: new Date(row.updatedAt).toISOString(),
        href: "/dashboard/stock",
        read: false,
      }),
    );

    const saleNotifications: NotificationItem[] = recentSales.map((sale) => ({
      id: `sale-completed-${String(sale._id)}`,
      type: "success",
      title: "Sale Completed",
      message: `Order ${sale.orderNumber} completed for ${Number(sale.total).toLocaleString()}`,
      createdAt: new Date(sale.createdAt).toISOString(),
      href: "/dashboard/sales",
      read: false,
    }));

    const customerNotifications: NotificationItem[] = recentCustomers.map(
      (customer) => ({
        id: `customer-new-${String(customer._id)}`,
        type: "info",
        title: "New Customer",
        message: `${customer.name} was added to your customer list`,
        createdAt: new Date(customer.createdAt).toISOString(),
        href: "/dashboard/customers",
        read: false,
      }),
    );

    const purchaseNotifications: NotificationItem[] = purchaseUpdates.map(
      (order) => ({
        id: `purchase-status-${String(order._id)}`,
        type: "success",
        title:
          order.status === "received"
            ? "Purchase Received"
            : "Purchase Updated",
        message: `${order.orderNumber} from ${(order.vendorId as { name?: string })?.name || "vendor"} is now ${order.status}`,
        createdAt: new Date(order.updatedAt).toISOString(),
        href: "/dashboard/purchases",
        read: false,
      }),
    );

    const overdueInvoiceNotifications: NotificationItem[] = overdueInvoices.map(
      (invoice) => ({
        id: `invoice-overdue-${String(invoice._id)}`,
        type: "warning",
        title: "Invoice Overdue",
        message: `${invoice.invoiceNumber} for ${(invoice.customerId as { name?: string })?.name || "customer"} still has ${Number(invoice.balance || 0).toLocaleString()} outstanding`,
        createdAt: new Date(invoice.dueDate || invoice.updatedAt).toISOString(),
        href: "/dashboard/invoices",
        read: false,
      }),
    );

    const vendorPaymentNotifications: NotificationItem[] =
      outstandingVendorPayments.map((order) => ({
        id: `vendor-payment-${String(order._id)}`,
        type: "warning",
        title:
          order.paymentStatus === "unpaid"
            ? "Vendor Payment Outstanding"
            : "Partial Vendor Payment",
        message: `${order.orderNumber} for ${(order.vendorId as { name?: string })?.name || "vendor"} is still ${order.paymentStatus}`,
        createdAt: new Date(order.updatedAt).toISOString(),
        href: "/dashboard/purchases",
        read: false,
      }));

    const combined = [
      ...lowStockNotifications,
      ...saleNotifications,
      ...customerNotifications,
      ...purchaseNotifications,
      ...overdueInvoiceNotifications,
      ...vendorPaymentNotifications,
    ]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, limit);

    const readDocs = await NotificationRead.find({
      tenantId: tenantObjectId,
      userId: toObjectId(auth.userId),
      notificationId: { $in: combined.map((notification) => notification.id) },
    })
      .select("notificationId")
      .lean();

    const readIds = new Set(readDocs.map((doc) => doc.notificationId));

    return apiSuccess({
      notifications: combined.map((notification) => ({
        ...notification,
        read: readIds.has(notification.id),
      })),
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
      : [];

    if (ids.length === 0) {
      return apiSuccess({ updated: 0 });
    }

    const tenantObjectId = toObjectId(auth.tenantId);
    const userObjectId = toObjectId(auth.userId);
    const readAt = new Date();

    await NotificationRead.bulkWrite(
      ids.map((notificationId) => ({
        updateOne: {
          filter: {
            tenantId: tenantObjectId,
            userId: userObjectId,
            notificationId,
          },
          update: {
            $set: {
              tenantId: tenantObjectId,
              userId: userObjectId,
              notificationId,
              readAt,
            },
          },
          upsert: true,
        },
      })),
    );

    return apiSuccess({ updated: ids.length });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return apiError("Internal server error", 500);
  }
}
