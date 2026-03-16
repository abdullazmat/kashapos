import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import {
  hashPin,
  validatePasswordPolicy,
  validatePinPolicy,
} from "@/lib/security";
import {
  normalizeUserCreatePayload,
  normalizeUserUpdatePayload,
} from "@/lib/user-route-payload";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const users = await User.find({ tenantId: auth.tenantId })
      .populate("branchId", "name")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      branchId,
      phone,
      nationalId,
      employmentType,
      startDate,
      loginPin,
      isActive,
      avatar,
    } = normalizeUserCreatePayload(body);

    if (!name || !email || !password) {
      return apiError("Name, email, and password are required", 400);
    }

    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
      return apiError(passwordPolicyError, 400);
    }

    if (loginPin) {
      const pinPolicyError = validatePinPolicy(loginPin);
      if (pinPolicyError) {
        return apiError(pinPolicyError, 400);
      }
    }

    const existing = await User.findOne({
      tenantId: auth.tenantId,
      email,
    });
    if (existing) {
      return apiError("A user with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);
    const hashedPin = loginPin ? await hashPin(loginPin) : undefined;
    const user = await User.create({
      tenantId: auth.tenantId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "cashier",
      branchId: branchId || undefined,
      phone: phone || undefined,
      nationalId: nationalId || undefined,
      employmentType: employmentType || undefined,
      startDate,
      loginPin: hashedPin,
      isActive: typeof isActive === "boolean" ? isActive : true,
      avatar: avatar || undefined,
    });

    await writeAuditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: "create",
      tableAffected: "users",
      recordId: String(user._id),
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId ? String(user.branchId) : null,
        isActive: user.isActive,
      },
      request,
    });

    const { password: _password, ...safeUser } = user.toObject();
    return apiSuccess(safeUser, 201);
  } catch (error: unknown) {
    console.error("Users POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("A user with this email already exists", 409);
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
    if (!id) return apiError("User ID is required", 400);

    if (id === auth.userId) {
      return apiError("You cannot delete your own account", 400);
    }

    const user = await User.findOneAndDelete({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!user) return apiError("User not found", 404);

    await writeAuditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: "delete",
      tableAffected: "users",
      recordId: id,
      oldValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId ? String(user.branchId) : null,
        isActive: user.isActive,
      },
      request,
    });

    return apiSuccess({ message: "User deleted" });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const normalized = normalizeUserUpdatePayload(body);

    if (!normalized.id) {
      return apiError("User ID is required", 400);
    }

    const user = await User.findOne({
      _id: normalized.id,
      tenantId: auth.tenantId,
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const previousUserSnapshot = {
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId ? String(user.branchId) : null,
      isActive: user.isActive,
      phone: user.phone || null,
      nationalId: user.nationalId || null,
      employmentType: user.employmentType || null,
      startDate: user.startDate ? user.startDate.toISOString() : null,
      avatar: user.avatar || null,
    };

    if (normalized.name) {
      user.name = normalized.name;
    }

    if (normalized.email) {
      const existing = await User.findOne({
        tenantId: auth.tenantId,
        email: normalized.email,
        _id: { $ne: normalized.id },
      });
      if (existing) {
        return apiError("A user with this email already exists", 409);
      }
      user.email = normalized.email;
    }

    if (normalized.password) {
      const passwordPolicyError = validatePasswordPolicy(normalized.password);
      if (passwordPolicyError) {
        return apiError(passwordPolicyError, 400);
      }
      user.password = await hashPassword(normalized.password);
    }

    if (normalized.role) {
      user.role = normalized.role;
    }

    if (normalized.clearBranchId) {
      user.branchId = undefined;
    } else if (normalized.branchId) {
      user.branchId = new mongoose.Types.ObjectId(normalized.branchId);
    }

    if (normalized.clearPhone) {
      user.phone = undefined;
    } else if (normalized.phone) {
      user.phone = normalized.phone;
    }

    if (normalized.clearNationalId) {
      user.nationalId = undefined;
    } else if (normalized.nationalId) {
      user.nationalId = normalized.nationalId;
    }

    if (normalized.clearEmploymentType) {
      user.employmentType = undefined;
    } else if (normalized.employmentType) {
      user.employmentType = normalized.employmentType;
    }

    if (normalized.clearStartDate) {
      user.startDate = undefined;
    } else if (normalized.startDate) {
      user.startDate = normalized.startDate;
    }

    if (normalized.clearLoginPin) {
      user.loginPin = undefined;
    } else if (normalized.loginPin) {
      const pinPolicyError = validatePinPolicy(normalized.loginPin);
      if (pinPolicyError) {
        return apiError(pinPolicyError, 400);
      }
      user.loginPin = await hashPin(normalized.loginPin);
    }

    if (typeof normalized.isActive === "boolean") {
      user.isActive = normalized.isActive;
    }

    if (normalized.clearAvatar) {
      user.avatar = undefined;
    } else if (normalized.avatar) {
      user.avatar = normalized.avatar;
    }

    await user.save();

    await writeAuditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: "update",
      tableAffected: "users",
      recordId: normalized.id,
      oldValue: previousUserSnapshot,
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId ? String(user.branchId) : null,
        isActive: user.isActive,
        phone: user.phone || null,
        nationalId: user.nationalId || null,
        employmentType: user.employmentType || null,
        startDate: user.startDate ? user.startDate.toISOString() : null,
        avatar: user.avatar || null,
      },
      request,
    });

    const { password: _password, ...safeUser } = user.toObject();
    return apiSuccess(safeUser);
  } catch (error: unknown) {
    console.error("Users PUT error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("A user with this email already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
