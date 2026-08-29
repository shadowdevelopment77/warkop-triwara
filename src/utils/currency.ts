// ═══════════════════════════════════════════════
// Triwara POS — Currency & Number Formatting Utility
// ═══════════════════════════════════════════════

/**
 * Formats a number to Indonesian Rupiah currency string (e.g. Rp 25.000)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates 2-letter badge code from product name (e.g., "Americano" -> "AC", "Caffe Latte" -> "CL")
 */
export function generateCodeBadge(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (name.length >= 2) {
    return name.substring(0, 2).toUpperCase();
  }
  return name.toUpperCase() || 'TR';
}
