// ─── Client Vehicle Registration Helpers ───

/**
 * Normalizes vehicle registration: removes spaces, hyphens, and dots, uppercase.
 */
export function normalizeRegistration(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/[\s\-\.]/g, '').toUpperCase();
}

/**
 * Validates standard vehicle registration number format (e.g., KL 07 CA 1234, KL-38-E-4567, DL 01 A 9999).
 * Format check only — does NOT certify legal ownership or government registration.
 */
export function isValidRegistration(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const normalized = normalizeRegistration(raw);
  if (normalized.length < 5 || normalized.length > 12) return false;
  return /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(normalized);
}

/**
 * Formats a normalized registration into a readable plate format (e.g., "KL 07 CA 1234").
 */
export function formatRegistration(normalizedOrRaw: string): string {
  const norm = normalizeRegistration(normalizedOrRaw);
  const match = norm.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
  if (!match) return normalizedOrRaw.toUpperCase().trim();
  const [, state, rto, series, num] = match;
  return [state, rto.padStart(2, '0'), series, num].filter(Boolean).join(' ');
}
