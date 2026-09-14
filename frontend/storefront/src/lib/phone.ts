/** Normalize Indian mobile numbers to +91… for OTP APIs */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 10 && trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return trimmed.startsWith("+") ? `+${digits}` : digits ? `+${digits}` : trimmed;
}

export function isValidPhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  return /^\+[1-9]\d{9,14}$/.test(normalized);
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone);
  if (n.startsWith("+91") && n.length === 13) {
    return `+91 ${n.slice(3, 8)} ${n.slice(8)}`;
  }
  return n;
}
