import { useEffect, useState } from "react";
import {
  getAnalitikBisnis,
  getAnalitikKpi,
  getSummary,
} from "@/services/dashboardService";

/**
 * useDashboardData — muat data untuk halaman Beranda secara paralel:
 * summary.json, analitik_kpi.json, analitik_bisnis.json.
 *
 * @returns { summary, kpi, bisnis, loading, error }
 */
export default function useDashboardData() {
  const [state, setState] = useState({
    summary: null,
    kpi: null,
    bisnis: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const opts = { signal: controller.signal };

    Promise.all([getSummary(opts), getAnalitikKpi(opts), getAnalitikBisnis(opts)])
      .then(([summary, kpi, bisnis]) => {
        setState({ summary, kpi, bisnis, loading: false, error: null });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error }));
      });

    return () => controller.abort();
  }, []);

  return state;
}
