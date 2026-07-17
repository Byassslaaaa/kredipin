import { useCallback } from "react";
import { Alert, Card, EmptyState, Skeleton, StatCard } from "@/components/ui";
import { BarChart } from "@/components/charts";
import useResource from "@/hooks/useResource";
import { getMonitoring } from "@/services/dashboardService";
import { formatNumber, formatPercent } from "@/utils/format";
import styles from "./Monitoring.module.css";

/**
 * Monitoring - pemantauan operasional & sinyal drift (khusus admin).
 *
 * Sinyal utama: TINGKAT PENYIMPANGAN analis dari model. Ini proxy drift yang
 * paling dini dan murah - bila analis makin sering melawan rekomendasi, model
 * mulai tidak sesuai kenyataan lapangan, jauh sebelum label gagal-bayar
 * sebenarnya diketahui (yang baru muncul berbulan kemudian).
 */
export default function Monitoring() {
  const fetcher = useCallback(() => getMonitoring(30), []);
  const { data, loading, error } = useResource(fetcher);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.kpi}>
          {[1, 2, 3, 4].map((i) => <StatCard key={i} label="" value="" loading icon="gauge" />)}
        </div>
        <Card><Skeleton variant="rect" height="280px" /></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <EmptyState icon="x" tone="danger" title="Data pemantauan tidak tersedia"
          description={error?.message || "Gagal memuat."} />
      </Card>
    );
  }

  const simpang = data.tingkat_penyimpangan;
  // Ambang peringatan sederhana: >20% penilaian dilawan analis patut ditinjau.
  const waspada = simpang != null && simpang > 0.2;

  return (
    <div className={styles.page}>
      <Alert variant={waspada ? "warning" : "info"} icon={waspada ? "alert-triangle" : "info"}>
        {simpang == null ? (
          <>Belum ada penilaian yang diputus analis pada periode ini, sehingga sinyal penyimpangan belum dapat dihitung.</>
        ) : waspada ? (
          <>
            Tingkat penyimpangan <strong>{formatPercent(simpang)}</strong> tergolong tinggi. Analis
            sering melawan rekomendasi model - pertimbangkan meninjau ulang model atau ambang kebijakan.
          </>
        ) : (
          <>
            Tingkat penyimpangan <strong>{formatPercent(simpang)}</strong> dalam batas wajar. Keputusan
            analis sebagian besar sejalan dengan model.
          </>
        )}
      </Alert>

      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        Periode {data.periode_hari} hari terakhir
      </p>

      <div className={styles.kpi}>
        <StatCard label="Total Penilaian" value={formatNumber(data.total_penilaian)} icon="database" tone="primary" hint="pengajuan diproses" />
        <StatCard label="Sudah Diputus" value={formatNumber(data.sudah_diputus)} icon="check" tone="success" hint="oleh analis" />
        <StatCard label="Menyimpang dari Model" value={formatNumber(data.menyimpang)} icon="alert-triangle" tone={data.menyimpang ? "warning" : "neutral"} hint="keputusan berbeda" />
        <StatCard label="Tingkat Penyimpangan" value={simpang == null ? "-" : formatPercent(simpang)} icon="trending-up" tone={waspada ? "danger" : "primary"} hint="sinyal drift" />
      </div>

      <Card title="Volume Penilaian Harian" subtitle="Total vs jumlah yang menyimpang dari model" icon="bar-chart">
        {data.tren.length === 0 ? (
          <EmptyState icon="bar-chart" title="Belum ada data tren" description="Grafik muncul setelah ada penilaian." />
        ) : (
          <BarChart
            labels={data.tren.map((t) => t.tanggal.slice(5))}
            datasets={[
              { label: "Total", data: data.tren.map((t) => t.total), color: "var(--chart-6)" },
              { label: "Menyimpang", data: data.tren.map((t) => t.menyimpang), color: "var(--color-warning)" },
            ]}
            stacked={false}
            legend
            height={300}
          />
        )}
      </Card>
    </div>
  );
}
