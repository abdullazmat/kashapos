import bcrypt from "bcryptjs";

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol";
  }

  return null;
}

export function validatePinPolicy(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) {
    return "PIN must be exactly 4 digits";
  }

  return null;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(
  pin: string,
  hashedPin: string,
): Promise<boolean> {
  return bcrypt.compare(pin, hashedPin);
}
