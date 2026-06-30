import {
  Alert,
  Badge,
  Button,
  Card,
  ProgressBar,
  SectionHeader,
  Table,
} from "@/components/ui";
import { useBatchPredict, useHealth, useHistory, usePredict } from "@/hooks";
import { buildPayload, EXAMPLE_VALUES } from "@/constants/featureSchema";
import { formatPercent, formatDateTime } from "@/utils/format";
import styles from "./UIShowcase.module.css";

/**
 * Halaman dev untuk smoke-test layer M3 (services + hooks) terhadap backend nyata.
 * Tidak masuk navigasi produksi. Membutuhkan backend berjalan di VITE_API_BASE_URL.
 */
export default function ApiDemo() {
  const health = useHealth();
  const single = usePredict();
  const history = useHistory({ limit: 5 });
  const batch = useBatchPredict();

  const sample = buildPayload(EXAMPLE_VALUES);
  const sample2 = { ...sample, skor_kredit: 520, gagal_bayar_tercatat: 3 };

  return (
    <div className={styles.page}>
      <SectionHeader
        title="API / Hooks Smoke Test (Dev)"
        description="Validasi service + custom hooks (M3) terhadap backend nyata."
      />

      <Card title="useHealth">
        {health.loading ? (
          <p>Memuat…</p>
        ) : health.error ? (
          <Alert variant="danger" title="Gagal">{health.error.message}</Alert>
        ) : (
          <pre className={styles.pre}>{JSON.stringify(health.data, null, 2)}</pre>
        )}
      </Card>

      <Card
        title="usePredict (prediksi tunggal)"
        actions={
          <Button loading={single.loading} onClick={() => single.predict(sample)}>
            Prediksi contoh
          </Button>
        }
      >
        {single.error && (
          <Alert variant="danger" title="Gagal">{single.error.message}</Alert>
        )}
        {single.data && (
          <div className={styles.stack}>
            <div className={styles.row}>
              <Badge variant={single.data.keputusan === "Layak" ? "success" : "danger"}>
                {single.data.keputusan}
              </Badge>
              <span>Probabilitas: {formatPercent(single.data.probabilitas_layak)}</span>
              <span>Confidence: {formatPercent(single.data.confidence)}</span>
            </div>
            <p className={styles.muted}>{single.data.faktor.length} faktor diterima.</p>
          </div>
        )}
      </Card>

      <Card
        title="useBatchPredict (2 baris contoh)"
        actions={
          <Button
            variant="secondary"
            loading={batch.status === "running"}
            onClick={() => batch.run([sample, sample2], { concurrency: 2 })}
          >
            Jalankan batch
          </Button>
        }
      >
        <div className={styles.stack}>
          <ProgressBar
            value={batch.progress.total ? (batch.progress.done / batch.progress.total) * 100 : 0}
            tone="primary"
          />
          <p className={styles.muted}>
            Status: {batch.status} · {batch.progress.done}/{batch.progress.total} (ok{" "}
            {batch.progress.ok}, gagal {batch.progress.failed})
          </p>
          {batch.summary && (
            <p className={styles.muted}>
              Ringkasan → Layak: {batch.summary.layak}, Tidak Layak:{" "}
              {batch.summary.tidakLayak}, Rata-rata prob:{" "}
              {formatPercent(batch.summary.avgProbabilitas)}
            </p>
          )}
        </div>
      </Card>

      <Card
        title="useHistory (5 terbaru)"
        padding="none"
        actions={
          <Button variant="ghost" iconLeft="refresh" onClick={() => history.refetch()}>
            Muat ulang
          </Button>
        }
      >
        <Table
          loading={history.loading}
          data={history.data}
          getRowKey={(r) => r.id}
          emptyTitle="Belum ada riwayat"
          columns={[
            { key: "id", header: "ID", mono: true },
            { key: "waktu", header: "Waktu", render: (r) => formatDateTime(r.waktu) },
            {
              key: "keputusan",
              header: "Keputusan",
              render: (r) => (
                <Badge variant={r.keputusan === "Layak" ? "success" : "danger"} size="sm">
                  {r.keputusan}
                </Badge>
              ),
            },
            {
              key: "probabilitas_layak",
              header: "Prob.",
              align: "right",
              mono: true,
              render: (r) => formatPercent(r.probabilitas_layak),
            },
          ]}
        />
      </Card>
    </div>
  );
}
