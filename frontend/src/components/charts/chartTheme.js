/**
 * chartTheme — jembatan antara design tokens (CSS variables) dan Chart.js (canvas).
 * Membaca nilai token saat runtime sehingga warna chart selaras tema aktif.
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
      cssVar("--chart-1", "#2563eb"),
      cssVar("--chart-2", "#10b981"),
      cssVar("--chart-3", "#f59e0b"),
      cssVar("--chart-4", "#8b5cf6"),
      cssVar("--chart-5", "#ef4444"),
      cssVar("--chart-6", "#06b6d4"),
    ],
    primary: cssVar("--color-primary", "#2563eb"),
    success: cssVar("--color-accent", "#059669"),
    danger: cssVar("--color-danger", "#dc2626"),
    grid: cssVar("--chart-grid", "#e2e8f0"),
    axis: cssVar("--chart-axis", "#94a3b8"),
    text: cssVar("--color-text-secondary", "#475569"),
    surface: cssVar("--color-surface", "#ffffff"),
    border: cssVar("--color-border", "#e2e8f0"),
  };
}

/** Opsi tooltip yang konsisten (kartu kecil dengan border tipis). */
export function baseTooltip(colors) {
  return {
    backgroundColor: colors.surface,
    titleColor: cssVar("--color-text", "#0f172a"),
    bodyColor: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    boxPadding: 6,
    titleFont: { family: "IBM Plex Sans", weight: "600", size: 13 },
    bodyFont: { family: "IBM Plex Sans", size: 13 },
    displayColors: true,
    usePointStyle: true,
  };
}

export const FONT_FAMILY = "IBM Plex Sans";
