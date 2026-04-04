import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY || "";
  if (!raw) return null;

  try {
    if (/^[a-f0-9]{64}$/i.test(raw)) {
      return Buffer.from(raw, "hex");
    }

    const base64 = Buffer.from(raw, "base64");
    if (base64.length === 32) {
      return base64;
    }
  } catch {
    return null;
  }

  return null;
}

export function encryptAtRest(value: string): string {
  const key = getKey();
  if (!value) {
    return value;
  }
  if (!key) {
    throw new Error(
      "APP_ENCRYPTION_KEY is required to encrypt sensitive settings.",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");
  return `${ENCRYPTION_PREFIX}${payload}`;
}

export function decryptAtRest(value: string): string {
  const key = getKey();
  if (!key || !value || !value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  try {
    const payload = Buffer.from(
      value.slice(ENCRYPTION_PREFIX.length),
      "base64",
    );
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return value;
  }
}

export function isEncryptedAtRest(value: string | undefined): boolean {
  return Boolean(value && value.startsWith(ENCRYPTION_PREFIX));
}
