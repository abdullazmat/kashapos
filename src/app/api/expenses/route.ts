import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import Branch from "@/models/Branch";
import ActivityLog from "@/models/ActivityLog";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (auth.branchId) {
      query.branchId = auth.branchId;
    }
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate)
        (query.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate)
        (query.date as Record<string, unknown>).$lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("createdBy", "name")
        .populate("vendorId", "name")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query),
    ]);

    // Calculate totals
    const totalMatch: Record<string, unknown> = { tenantId: auth.tenantId };
    if (auth.branchId) {
      totalMatch.branchId = auth.branchId;
    }

    const totalAmount = await Expense.aggregate([
      { $match: totalMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return apiSuccess({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalAmount: totalAmount[0]?.total || 0,
    });
  } catch (error) {
    console.error("Expenses GET error:", error);
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
    let resolvedBranchId = auth.branchId;

    // Some legacy users can have a session without branchId; fallback to main branch.
    if (!resolvedBranchId) {
      const fallbackBranch = await Branch.findOne({ tenantId: auth.tenantId })
        .sort({ isMain: -1, createdAt: 1 })
        .select("_id")
        .lean();

      if (!fallbackBranch?._id) {
        return apiError(
          "No branch found for tenant. Create a branch first.",
          400,
        );
      }

      resolvedBranchId = String(fallbackBranch._id);
    }

    const expense = await Expense.create({
      ...body,
      tenantId: auth.tenantId,
      branchId: resolvedBranchId,
      createdBy: auth.userId,
    });

    // Log activity
    await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "create",
      module: "expenses",
      description: `Recorded expense: ${expense.description} for ${expense.amount.toLocaleString()}`,
      metadata: { expenseId: expense._id, amount: expense.amount },
    });

    return apiSuccess(expense, 201);
  } catch (error) {
    console.error("Expenses POST error:", error);
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Expense ID required", 400);

    const expense = await Expense.findOneAndDelete({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!expense) return apiError("Expense not found", 404);

    // Log activity
    await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "delete",
      module: "expenses",
      description: `Deleted expense: ${expense.description} of ${expense.amount?.toLocaleString()}`,
      metadata: { expenseId: expense._id, amount: expense.amount },
    });

    return apiSuccess({ message: "Expense deleted" });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
