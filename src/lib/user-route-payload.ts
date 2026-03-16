export interface NormalizedUserCreatePayload {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  branchId?: string;
  phone?: string;
  nationalId?: string;
  employmentType?: "full_time" | "part_time" | "contract";
  startDate?: Date;
  loginPin?: string;
  isActive?: boolean;
  avatar?: string;
}

export interface NormalizedUserUpdatePayload {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  branchId?: string;
  clearBranchId?: boolean;
  phone?: string;
  clearPhone?: boolean;
  nationalId?: string;
  clearNationalId?: boolean;
  employmentType?: "full_time" | "part_time" | "contract";
  clearEmploymentType?: boolean;
  startDate?: Date;
  clearStartDate?: boolean;
  loginPin?: string;
  clearLoginPin?: boolean;
  isActive?: boolean;
  avatar?: string;
  clearAvatar?: boolean;
}

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeEmploymentType = (
  value: unknown,
): "full_time" | "part_time" | "contract" | undefined => {
  const normalized = normalizeString(value);
  if (
    normalized === "full_time" ||
    normalized === "part_time" ||
    normalized === "contract"
  ) {
    return normalized;
  }
  return undefined;
};

export function normalizeUserCreatePayload(
  payload: Record<string, unknown>,
): NormalizedUserCreatePayload {
  const name = normalizeString(payload.name);
  const email = normalizeString(payload.email)?.toLowerCase();
  const password = normalizeString(payload.password);
  const role = normalizeString(payload.role);
  const branchId = normalizeString(payload.branchId);
  const phone = normalizeString(payload.phone);
  const nationalId = normalizeString(payload.nationalId);
  const employmentType = normalizeEmploymentType(payload.employmentType);
  const startDateValue = normalizeString(payload.startDate);
  const loginPin = normalizeString(payload.loginPin);
  const avatar = normalizeString(payload.avatar);

  return {
    name,
    email,
    password,
    role,
    branchId,
    phone,
    nationalId,
    employmentType,
    startDate: startDateValue ? new Date(startDateValue) : undefined,
    loginPin,
    isActive:
      typeof payload.isActive === "boolean" ? payload.isActive : undefined,
    avatar,
  };
}

export function normalizeUserUpdatePayload(
  payload: Record<string, unknown>,
): NormalizedUserUpdatePayload {
  const branchIdValue = payload.branchId;
  const phoneValue = payload.phone;
  const nationalIdValue = payload.nationalId;
  const employmentTypeValue = payload.employmentType;
  const startDateValue = payload.startDate;
  const loginPinValue = payload.loginPin;
  const avatarValue = payload.avatar;

  const normalizedBranchId = normalizeString(branchIdValue);
  const normalizedPhone = normalizeString(phoneValue);
  const normalizedNationalId = normalizeString(nationalIdValue);
  const normalizedEmploymentType = normalizeEmploymentType(employmentTypeValue);
  const normalizedLoginPin = normalizeString(loginPinValue);
  const normalizedAvatar = normalizeString(avatarValue);
  const normalizedStartDate = normalizeString(startDateValue);

  return {
    id: normalizeString(payload._id),
    name: normalizeString(payload.name),
    email: normalizeString(payload.email)?.toLowerCase(),
    password: normalizeString(payload.password),
    role: normalizeString(payload.role),
    branchId: normalizedBranchId,
    clearBranchId: branchIdValue === "" || branchIdValue === null,
    phone: normalizedPhone,
    clearPhone: phoneValue === "",
    nationalId: normalizedNationalId,
    clearNationalId: nationalIdValue === "",
    employmentType: normalizedEmploymentType,
    clearEmploymentType:
      employmentTypeValue === "" || employmentTypeValue === null,
    startDate: normalizedStartDate ? new Date(normalizedStartDate) : undefined,
    clearStartDate: startDateValue === "" || startDateValue === null,
    loginPin: normalizedLoginPin,
    clearLoginPin: loginPinValue === "",
    isActive:
      typeof payload.isActive === "boolean" ? payload.isActive : undefined,
    avatar: normalizedAvatar,
    clearAvatar: avatarValue === "",
  };
}
