import { useCallback, useMemo } from "react";
import { Alert, Card, EmptyState, Skeleton, StatCard } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { getChartColors } from "@/components/charts/chartTheme";
import ConfusionMatrix from "@/features/performa/components/ConfusionMatrix";
import useResource from "@/hooks/useResource";
import { getFeatureImportance, getModelInfo } from "@/services/dashboardService";
import { formatPercent } from "@/utils/format";
import styles from "./PerformaModel.module.css";

const METRICS = [
  { key: "accuracy", label: "Accuracy", tone: "primary", hint: "ketepatan keseluruhan" },
  { key: "precision", label: "Precision", tone: "success", hint: "dari prediksi Layak" },
  { key: "recall", label: "Recall", tone: "success", hint: "dari aktual Layak" },
  { key: "f1", label: "F1-Score", tone: "primary", hint: "harmonik P & R" },
  { key: "roc_auc", label: "ROC-AUC", tone: "success", hint: "daya diskriminasi" },
];

const HYPERPARAMS = [
  ["n_estimators", "Jumlah pohon"],
  ["max_depth", "Kedalaman maksimum"],
  ["learning_rate", "Learning rate"],
  ["subsample", "Subsample"],
  ["colsample_bytree", "Colsample bytree"],
  ["min_child_weight", "Min child weight"],
  ["reg_lambda", "Reg. lambda (L2)"],
  ["tree_method", "Tree method"],
];

function prettifyFeature(name) {
  const s = name.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PerformaModel() {
  const modelFetcher = useCallback((opts) => getModelInfo(opts), []);
  const fiFetcher = useCallback((opts) => getFeatureImportance(opts), []);
  const model = useResource(modelFetcher);
  const fi = useResource(fiFetcher);
  const colors = getChartColors();

  const topPerm = useMemo(() => (fi.data?.permutation || []).slice(0, 12), [fi.data]);
  const topGain = useMemo(() => (fi.data?.gain || []).slice(0, 12), [fi.data]);

  if (model.loading || fi.loading) {
    return (
      <div className={styles.page}>
        <div className={styles.kpiGrid}>
          {METRICS.map((m) => (
            <StatCard key={m.key} label={m.label} value="" loading icon="gauge" tone={m.tone} />
          ))}
        </div>
        <div className={styles.twoCol}>
          <Card><Skeleton variant="rect" height="260px" /></Card>
          <Card><Skeleton variant="rect" height="260px" /></Card>
        </div>
        <Card><Skeleton variant="rect" height="320px" /></Card>
      </div>
    );
  }

  if (model.error || !model.data) {
    return (
      <Card>
        <EmptyState
          icon="x-circle"
          tone="danger"
          title="Data performa tidak tersedia"
          description={`${model.error?.message || "Gagal memuat."} Jalankan "npm run prepare-data".`}
        />
      </Card>
    );
  }

  const info = model.data;
  const ev = info.evaluasi || {};
  const hp = info.hyperparameter || {};

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="info">
        Model <strong>{info.model}</strong> ({info.library}) dievaluasi pada test set{" "}
        {info.split ? `(${Math.round(info.split.test_size * 100)}% data, stratified)` : ""}. Metrik
        di bawah dihitung dari data uji yang tidak dilihat saat pelatihan.
      </Alert>

      <div className={styles.kpiGrid}>
        {METRICS.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={formatPercent(ev[m.key])}
            icon="gauge"
            tone={m.tone}
            hint={m.hint}
          />
        ))}
      </div>

      <div className={styles.twoCol}>
        <Card title="Confusion Matrix" subtitle="Hasil klasifikasi pada data uji" icon="bar-chart">
          {info.confusion_matrix ? (
            <ConfusionMatrix matrix={info.confusion_matrix} />
          ) : (
            <p className={styles.muted}>Matriks tidak tersedia.</p>
          )}
        </Card>

        <Card title="Interpretasi" subtitle="Makna metrik untuk konteks kredit" icon="info">
          <ul className={styles.interpret}>
            <li>
              <strong>Recall {formatPercent(ev.recall)}</strong> — dari seluruh pemohon yang
              sebenarnya Layak, sebagian besar berhasil dikenali (sedikit yang terlewat).
            </li>
            <li>
              <strong>Precision {formatPercent(ev.precision)}</strong> — dari yang diprediksi Layak,
              mayoritas memang Layak (risiko salah-setuju rendah).
            </li>
            <li>
              <strong>ROC-AUC {formatPercent(ev.roc_auc)}</strong> — model sangat baik membedakan
              Layak vs Tidak Layak pada berbagai ambang.
            </li>
            <li>
              <strong>Akurasi {formatPercent(ev.accuracy)}</strong> — proporsi keputusan yang benar
              secara keseluruhan.
            </li>
          </ul>
        </Card>
      </div>

      <Card
        title="Feature Importance — Permutation"
        subtitle="Rata-rata penurunan skor model saat nilai fitur diacak (lebih robust) — 12 teratas"
        icon="trending-up"
      >
        <BarChart
          labels={topPerm.map((f) => prettifyFeature(f.fitur))}
          datasets={[
            {
              label: "Permutation importance",
              data: topPerm.map((f) => f.importance),
              color: colors.primary,
            },
          ]}
          horizontal
          height={Math.max(280, topPerm.length * 34 + 40)}
          valueFormatter={(v) => v.toFixed(3)}
        />
      </Card>

      <Card
        title="Feature Importance — Gain (bawaan XGBoost)"
        subtitle="Kontribusi rata-rata pada pemecahan pohon, per kolom — 12 teratas"
        icon="bar-chart"
      >
        <BarChart
          labels={topGain.map((f) => prettifyFeature(f.fitur))}
          datasets={[
            {
              label: "Gain importance",
              data: topGain.map((f) => f.importance),
              color: colors.success,
            },
          ]}
          horizontal
          height={Math.max(280, topGain.length * 34 + 40)}
          valueFormatter={(v) => formatPercent(v)}
        />
      </Card>

      <div className={styles.twoCol}>
        <Card title="Hyperparameter" subtitle="Konfigurasi XGBoost" icon="gauge">
          <dl className={styles.params}>
            {HYPERPARAMS.map(([key, label]) => (
              <div key={key} className={styles.paramRow}>
                <dt className={styles.paramLabel}>{label}</dt>
                <dd className={`${styles.paramValue} num`}>{String(hp[key] ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Catatan Metodologi" subtitle="Untuk transparansi & Q&A" icon="shield-check">
          <ul className={styles.notes}>
            <li>
              Pemisahan data 80/20 secara <strong>stratified</strong> (random_state{" "}
              {info.split?.random_state ?? 42}); metrik dari data uji.
            </li>
            <li>
              Fitur sintetik <strong>tenor_bulan</strong> &amp; <strong>jaminan</strong> berperan
              sebagai <em>modifier sekunder</em> — peringkat importance sangat rendah (dilaporkan apa
              adanya, tanpa manipulasi).
            </li>
            <li>
              <strong>gagal_bayar_tercatat</strong> sangat diskriminatif pada dataset ini; pada data
              nyata hubungan biasanya tidak sebersih ini (didokumentasikan sebagai caveat).
            </li>
            <li>Seluruh nilai uang dalam IDR (kurs acuan 1 USD = Rp18.000).</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
