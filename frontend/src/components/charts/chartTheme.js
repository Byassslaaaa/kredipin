import { useEffect, useState } from "react";

/**
 * chartTheme - jembatan antara design tokens (CSS variables) dan ApexCharts.
 *
 * Nilai fallback disamakan dengan tokens.css (palet Ink + semantik emerald/merah)
 * agar konsisten bila CSS belum termuat.
 */

function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Ambil palet & warna struktural chart dari tokens (sekali baca). */
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

/** True bila tema gelap sedang aktif. */
export function isDarkTheme() {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/**
 * useChartTheme - palet chart yang IKUT BERUBAH saat tema di-toggle.
 *
 * Chart berbasis canvas membaca warna sebagai nilai statis saat render, sehingga
 * pergantian tema tidak otomatis terlihat. Hook ini memantau atribut
 * `data-theme` pada <html> lewat MutationObserver lalu memicu render ulang.
 * (Hook useTheme tidak dipakai di sini karena state-nya lokal per pemanggil,
 * bukan context bersama.)
 */
export function useChartTheme() {
  const [tema, setTema] = useState(() => ({
    dark: isDarkTheme(),
    colors: getChartColors(),
  }));

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTema({ dark: isDarkTheme(), colors: getChartColors() });
    });
    observer.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return tema;
}

export const FONT_FAMILY = "Geist";

/**
 * Opsi dasar ApexCharts yang dipakai semua chart: tipografi, tooltip, animasi,
 * dan penonaktifan toolbar bawaan (kita tidak butuh zoom/export di dashboard ini).
 */
export function baseApexOptions(colors, dark) {
  return {
    chart: {
      fontFamily: FONT_FAMILY,
      foreColor: colors.text,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 420,
        animateGradually: { enabled: true, delay: 40 },
      },
    },
    theme: { mode: dark ? "dark" : "light" },
    grid: {
      borderColor: colors.grid,
      strokeDashArray: 4,
      padding: { left: 4, right: 4 },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      style: { fontSize: "12px", fontFamily: FONT_FAMILY },
    },
    legend: {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      markers: { size: 6, shape: "circle" },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    dataLabels: { enabled: false },
    states: {
      hover: { filter: { type: "lighten", value: 0.08 } },
      active: { filter: { type: "darken", value: 0.1 } },
    },
  };
}
