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

