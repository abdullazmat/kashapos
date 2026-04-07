
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Remove all non-numeric characters, except leading +
  const cleaned = phone.replace(/(?!^\+)[^\d]/g, "");
  
  // Standard Ugandan normalization (Primary target)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+256" + cleaned.slice(1);
  }
  if (cleaned.startsWith("7") && cleaned.length === 9) {
    return "+256" + cleaned;
  }
  if (cleaned.startsWith("256") && cleaned.length === 12) {
    return "+" + cleaned;
  }
  
  // If it still has no +, assume it's a local number without leading zero or needs a plus
  if (!cleaned.startsWith("+")) {
     // If it's already a full international number but missing +, add it
     if (cleaned.length >= 10) return "+" + cleaned;
     // Otherwise assume it's a local number for +256
     return "+256" + cleaned;
  }
  
  return cleaned;
}

export function normalizeIdentifier(identifier: string): string {
  if (!identifier) return "";
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return normalizePhone(trimmed);
}
