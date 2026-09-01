// ═══════════════════════════════════════════════
// Triwara POS — SHA-256 Hash Utility for PIN Security
// ═══════════════════════════════════════════════

/**
 * Computes SHA-256 hex string using standard Web Cryptography API
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes SHA-256 hex string of a PIN
 */
export async function hashPin(pin: string): Promise<string> {
  return sha256(pin);
}
