import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
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
    const totalAmount = await Expense.aggregate([
      { $match: { tenantId: auth.tenantId } },
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
    const expense = await Expense.create({
      ...body,
      tenantId: auth.tenantId,
      branchId: auth.branchId,
      createdBy: auth.userId,
    });

    return apiSuccess(expense, 201);
  } catch (error) {
    console.error("Expenses POST error:", error);
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

    return apiSuccess({ message: "Expense deleted" });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
