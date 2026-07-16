/**
 * chartTheme — jembatan antara design tokens (CSS variables) dan Chart.js (canvas).
 * Membaca nilai token saat runtime sehingga warna chart selaras tema aktif.
 *
 * Catatan: nilai fallback disamakan dengan tokens.css (palet Ink + semantik
 * emerald/merah) agar konsisten bila CSS belum termuat.
 */

function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Ambil palet & warna struktural chart dari tokens. */
export function getChartColors() {
  return {
    series: [
      cssVar("--chart-1", "#059669"),
      cssVar("--chart-2", "#dc2626"),
      cssVar("--chart-3", "#d97706"),
      cssVar("--chart-4", "#0e7490"),
      cssVar("--chart-5", "#7c3aed"),
      cssVar("--chart-6", "#71717a"),
    ],
    primary: cssVar("--color-primary", "#18181b"),
    success: cssVar("--color-accent", "#059669"),
    danger: cssVar("--color-danger", "#dc2626"),
    grid: cssVar("--chart-grid", "#e4e4e7"),
    axis: cssVar("--chart-axis", "#a1a1aa"),
    text: cssVar("--color-text-secondary", "#52525b"),
    surface: cssVar("--color-surface", "#ffffff"),
    border: cssVar("--color-border", "#e4e4e7"),
  };
}

/** Opsi tooltip yang konsisten (kartu kecil dengan border tipis). */
export function baseTooltip(colors) {
  return {
    backgroundColor: colors.surface,
    titleColor: cssVar("--color-text", "#09090b"),
    bodyColor: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    boxPadding: 6,
    titleFont: { family: "Geist", weight: "600", size: 13 },
    bodyFont: { family: "Geist", size: 13 },
    displayColors: true,
    usePointStyle: true,
  };
}

export const FONT_FAMILY = "Geist";
