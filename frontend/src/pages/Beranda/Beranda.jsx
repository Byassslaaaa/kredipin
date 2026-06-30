import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, ProgressBar, StatCard } from "@/components/ui";
import { DoughnutChart } from "@/components/charts";
import { getChartColors } from "@/components/charts/chartTheme";
import useDashboardData from "@/hooks/useDashboardData";
import useHealth from "@/hooks/useHealth";
import { ROUTES } from "@/constants/navigation";
import { formatNumber, formatPercent } from "@/utils/format";
import HeroBanner from "./components/HeroBanner";
import RiskProfileComparison from "./components/RiskProfileComparison";
import styles from "./Beranda.module.css";

const METRIC_LABELS = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1-Score",
  roc_auc: "ROC-AUC",
};

export default function Beranda() {
  const navigate = useNavigate();
  const { summary, kpi, bisnis, loading, error } = useDashboardData();
  const { data: health } = useHealth();

  const evalModel = summary?.evaluasi_model || {};
  const distribusi = summary?.distribusi_keputusan || {};
  const colors = getChartColors();

  return (
    <div className={styles.page}>
      <HeroBanner />

      {error && (
        <Alert variant="warning" title="Data analitik tidak tersedia">
          {error.message} Jalankan <code>npm run prepare-data</code> untuk menyiapkan data dashboard.
        </Alert>
      )}

      {/* KPI utama */}
      <p className={styles.sectionLabel}>Ringkasan portofolio</p>
      <div className={styles.kpiGrid}>
        <StatCard
          label="Total Data Pinjaman"
          value={loading ? "" : formatNumber(summary?.total_data)}
          icon="database"
          tone="primary"
          hint="baris data historis"
          loading={loading}
        />
        <StatCard
          label="Tingkat Kelayakan"
          value={loading ? "" : formatPercent(summary?.persentase_layak, { fromFraction: false })}
          icon="trending-up"
          tone="success"
          hint="proporsi pengajuan layak"
          loading={loading}
        />
        <StatCard
          label="Akurasi Model"
          value={loading ? "" : formatPercent(evalModel.accuracy)}
          icon="gauge"
          tone="primary"
          hint="XGBoost · test set"
          loading={loading}
        />
        <StatCard
          label="ROC-AUC"
          value={loading ? "" : formatPercent(evalModel.roc_auc)}
          icon="shield-check"
          tone="success"
          hint="kemampuan diskriminasi"
          loading={loading}
        />
      </div>

      {/* Distribusi + Performa */}
      <div className={styles.twoCol}>
        <Card
          title="Distribusi Keputusan"
          subtitle="Komposisi hasil pada data historis"
          icon="bar-chart"
        >
          {loading ? (
            <div className={styles.chartSkeleton} />
          ) : (
            <>
              <DoughnutChart
                labels={["Layak", "Tidak Layak"]}
                values={[distribusi.Layak || 0, distribusi["Tidak Layak"] || 0]}
                colors={[colors.success, colors.danger]}
                height={220}
                legend={false}
                centerLabel={{
                  value: formatNumber(summary?.total_data),
                  caption: "total nasabah",
                }}
              />
              <div className={styles.legend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotLayak}`} aria-hidden="true" />
                  <span className={styles.legendLabel}>Layak</span>
                  <span className={`${styles.legendValue} num`}>
                    {formatNumber(distribusi.Layak)} ·{" "}
                    {formatPercent((distribusi.Layak || 0) / (summary?.total_data || 1))}
                  </span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotTolak}`} aria-hidden="true" />
                  <span className={styles.legendLabel}>Tidak Layak</span>
                  <span className={`${styles.legendValue} num`}>
                    {formatNumber(distribusi["Tidak Layak"])} ·{" "}
                    {formatPercent((distribusi["Tidak Layak"] || 0) / (summary?.total_data || 1))}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card
          title="Performa Model"
          subtitle="Metrik evaluasi XGBoost pada test set"
          icon="gauge"
          actions={
            <Button
              variant="ghost"
              size="sm"
              iconRight="chevron-right"
              onClick={() => navigate(ROUTES.performa)}
            >
              Detail
            </Button>
          }
        >
          <div className={styles.metrics}>
            {Object.keys(METRIC_LABELS).map((key) => {
              const val = evalModel[key] || 0;
              return (
                <div key={key} className={styles.metricRow}>
                  <span className={styles.metricLabel}>{METRIC_LABELS[key]}</span>
                  <ProgressBar value={val * 100} tone="success" size="sm" className={styles.metricBar} />
                  <span className={`${styles.metricVal} num`}>
                    {loading ? "—" : formatPercent(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Profil risiko */}
      <Card
        title="Profil Risiko per Keputusan"
        subtitle="Rata-rata karakteristik nasabah Layak vs Tidak Layak"
        icon="users"
      >
        {loading ? (
          <div className={styles.chartSkeleton} />
        ) : (
          <RiskProfileComparison kpi={kpi} bisnis={bisnis} />
        )}
      </Card>

      {/* Status sistem */}
      <Card padding="sm">
        <div className={styles.statusBar}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Ambang keputusan</span>
            <span className={styles.statusValue}>
              {health?.threshold_aktif != null
                ? formatPercent(health.threshold_aktif)
                : formatPercent(summary?.ambang_keputusan ?? 0.5)}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Model</span>
            <span className={styles.statusValue}>
              {health?.model_dimuat ? "Dimuat" : summary ? "XGBoost" : "—"}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Versi API</span>
            <span className={styles.statusValue}>{health?.versi || "—"}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Kurs acuan</span>
            <span className={styles.statusValue}>
              1 USD = Rp{formatNumber(summary?.kurs_usd_idr ?? 18000)}
            </span>
          </div>
        </div>
      </Card>

      <Alert variant="info" icon="info">
        Seluruh hasil prediksi {`KrediPin`} bersifat <strong>alat bantu</strong> pengambilan
        keputusan berbasis model statistik — <strong>bukan keputusan akhir</strong>. Keputusan
        kredit final tetap berada pada analis/komite kredit.
      </Alert>
    </div>
  );
}
