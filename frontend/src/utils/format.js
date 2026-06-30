/**
 * Helper format angka & teks untuk UI (locale id-ID).
 * Nilai uang seluruhnya dalam IDR (sesuai kontrak API).
 */

const idID = "id-ID";

/** Format angka biasa dengan pemisah ribuan. */
export function formatNumber(value, opts = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(idID, opts).format(Number(value));
}

/** Format nominal Rupiah. Mode "compact" untuk angka besar (mis. Rp1,2 M). */
export function formatIDR(value, { compact = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (compact) {
    return new Intl.NumberFormat(idID, {
      style: "currency",
      currency: "IDR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  }
  return new Intl.NumberFormat(idID, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format proporsi/persen.
 * - value 0..1 (default fromFraction=true) -> dikali 100.
 * - value 0..100 -> set fromFraction=false.
 */
export function formatPercent(value, { decimals = 1, fromFraction = true } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const pct = fromFraction ? Number(value) * 100 : Number(value);
  return `${pct.toLocaleString(idID, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/** Bulatkan ke n desimal sebagai number (tanpa simbol). */
export function round(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const f = 10 ** decimals;
  return Math.round(Number(value) * f) / f;
}

/** Format tanggal-waktu ISO menjadi teks lokal yang ramah. */
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(idID, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Potong teks panjang dengan elipsis. */
export function truncate(text, max = 40) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
