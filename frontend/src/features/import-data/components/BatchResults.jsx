import { Alert, Button, Card, ProgressBar, StatCard, Table } from "@/components/ui";
import DecisionBadge from "@/components/common/DecisionBadge";
import { DoughnutChart } from "@/components/charts";
import { getChartColors } from "@/components/charts/chartTheme";
import { formatNumber, formatPercent } from "@/utils/format";
import styles from "./BatchResults.module.css";

/** Bagian progres saat batch berjalan. */
function RunningView({ progress, onCancel }) {
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  return (
    <Card title="Memproses Prediksi" icon="refresh">
      <div className={styles.runWrap}>
        <ProgressBar value={pct} tone="primary" size="lg" />
        <div className={styles.runMeta}>
          <span>
            {formatNumber(progress.done)} / {formatNumber(progress.total)} baris (
            {Math.round(pct)}%)
          </span>
          <span className={styles.runCounts}>
            <span className={styles.ok}>{formatNumber(progress.ok)} berhasil</span>
            {progress.failed > 0 && (
              <span className={styles.bad}>{formatNumber(progress.failed)} gagal</span>
            )}
          </span>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" iconLeft="x" onClick={onCancel}>
            Batalkan
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Bagian hasil akhir. */
function DoneView({ batch, onDownload, onReset }) {
  const { summary, results, progress, status } = batch;
  const colors = getChartColors();
  const totalOk = summary.layak + summary.tidakLayak;

  const preview = results
    .filter(Boolean)
    .slice(0, 10)
    .map((r) => ({
      no: r.index + 1,
      ok: r.ok,
      keputusan: r.ok ? r.result.keputusan : "Gagal",
      prob: r.ok ? r.result.probabilitas_layak : null,
    }));

  return (
    <div className={styles.doneWrap}>
      {status === "cancelled" && (
        <Alert variant="warning" icon="alert-triangle" title="Proses dibatalkan">
          Sebagian baris mungkin belum diprediksi. Ringkasan di bawah hanya mencakup yang selesai.
        </Alert>
      )}

      <div className={styles.kpis}>
        <StatCard label="Layak" value={formatNumber(summary.layak)} icon="check-circle" tone="success" />
        <StatCard
          label="Tidak Layak"
          value={formatNumber(summary.tidakLayak)}
          icon="x-circle"
          tone="danger"
        />
        <StatCard
          label="Rata-rata Probabilitas"
          value={formatPercent(summary.avgProbabilitas)}
          icon="gauge"
          tone="primary"
        />
        <StatCard
          label="Gagal"
          value={formatNumber(summary.gagal)}
          icon="alert-triangle"
          tone={summary.gagal ? "warning" : "neutral"}
        />
      </div>

      <div className={styles.twoCol}>
        <Card title="Distribusi Prediksi" icon="bar-chart">
          {totalOk > 0 ? (
            <DoughnutChart
              labels={["Layak", "Tidak Layak"]}
              values={[summary.layak, summary.tidakLayak]}
              colors={[colors.success, colors.danger]}
              height={240}
              centerLabel={{ value: formatNumber(totalOk), caption: "diprediksi" }}
              legend={false}
            />
          ) : (
            <p className={styles.muted}>Tidak ada hasil berhasil untuk ditampilkan.</p>
          )}
        </Card>

        <Card
          title="Pratinjau Hasil"
          subtitle={`Menampilkan ${preview.length} dari ${formatNumber(progress.done)} baris`}
          icon="database"
          actions={
            <Button size="sm" iconLeft="download" onClick={onDownload}>
              Unduh CSV
            </Button>
          }
          padding="none"
        >
          <Table
            columns={[
              { key: "no", header: "#", mono: true, width: "64px" },
              {
                key: "keputusan",
                header: "Keputusan",
                render: (r) =>
                  r.ok ? (
                    <DecisionBadge keputusan={r.keputusan} size="sm" />
                  ) : (
                    <span className={styles.failTag}>Gagal</span>
                  ),
              },
              {
                key: "prob",
                header: "Probabilitas",
                align: "right",
                mono: true,
                render: (r) => (r.prob != null ? formatPercent(r.prob) : "—"),
              },
            ]}
            data={preview}
            getRowKey={(r) => r.no}
          />
        </Card>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" iconLeft="refresh" onClick={onReset}>
          Impor file lain
        </Button>
        <Button iconLeft="download" onClick={onDownload}>
          Unduh Semua Hasil (CSV)
        </Button>
      </div>
    </div>
  );
}

/**
 * BatchResults — menampilkan progres saat berjalan, lalu ringkasan & hasil akhir.
 */
export default function BatchResults({ batch, onCancel, onDownload, onReset }) {
  if (batch.status === "running") {
    return <RunningView progress={batch.progress} onCancel={onCancel} />;
  }
  if ((batch.status === "done" || batch.status === "cancelled") && batch.summary) {
    return <DoneView batch={batch} onDownload={onDownload} onReset={onReset} />;
  }
  return null;
}
