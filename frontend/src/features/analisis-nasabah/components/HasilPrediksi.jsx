import { motion } from "framer-motion";
import { Alert, Card, EmptyState, ProgressBar, Skeleton } from "@/components/ui";
import Icon from "@/components/ui/Icon";
import DecisionBadge from "@/components/common/DecisionBadge";
import FaktorList from "@/components/common/FaktorList";
import { formatDateTime, formatPercent } from "@/utils/format";
import { NATIVE_THRESHOLD, nativeDecision } from "@/utils/prediction";
import styles from "./HasilPrediksi.module.css";

function EmptyPanel() {
  return (
    <Card>
      <EmptyState
        icon="file-text"
        title="Laporan penilaian akan tampil di sini"
        description="Lengkapi data pengajuan di sebelah kiri, lalu jalankan penilaian kelayakan."
      />
    </Card>
  );
}

function LoadingPanel() {
  return (
    <Card padding="lg">
      <div className={styles.skeletonWrap}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rect" height="72px" />
        <Skeleton variant="rect" height="48px" />
        <Skeleton variant="text" count={4} />
      </div>
    </Card>
  );
}

function ErrorPanel({ error }) {
  return (
    <Card>
      <EmptyState
        icon="x-circle"
        tone="danger"
        title="Penilaian gagal diproses"
        description={error?.message || "Terjadi kesalahan saat memproses penilaian."}
      />
      {error?.isValidation && error?.detail && (
        <div className={styles.detailWrap}>
          <Alert variant="danger" title="Rincian validasi">
            <pre className={styles.detail}>{JSON.stringify(error.detail, null, 2)}</pre>
          </Alert>
        </div>
      )}
    </Card>
  );
}

/**
 * HasilPrediksi — laporan penilaian kelayakan kredit untuk satu nasabah,
 * disusun sebagai satu dokumen dengan hierarki visual yang jelas.
 */
export default function HasilPrediksi({ data, loading, error }) {
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel error={error} />;
  if (!data) return <EmptyPanel />;

  const layak = data.keputusan === "Layak";
  const probPct = data.probabilitas_layak * 100;
  const thrPct = data.threshold * 100;

  // Perbandingan: keputusan dengan ambang batas (yang dipilih analis) vs
  // keputusan XGBoost tanpa ambang batas (native, patokan 50%).
  const keputusanNative = nativeDecision(data.probabilitas_layak);
  const nativePct = NATIVE_THRESHOLD * 100;
  const sepakat = data.keputusan === keputusanNative;
  const relasiAmbang = data.probabilitas_layak >= data.threshold ? "≥" : "<";
  const relasiNative = data.probabilitas_layak >= NATIVE_THRESHOLD ? "≥" : "<";
  const ambangLebihKetat = data.threshold > NATIVE_THRESHOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card padding="none">
        {/* Header laporan */}
        <div className={styles.reportHead}>
          <div>
            <p className={styles.reportKicker}>Laporan Penilaian Kredit</p>
            <h3 className={styles.reportTitle}>
              {data.id_riwayat ? `Penilaian #${data.id_riwayat}` : "Hasil Penilaian"}
            </h3>
          </div>
          {data.waktu && <span className={styles.reportTime}>{formatDateTime(data.waktu)}</span>}
        </div>

        {/* Verdict band */}
        <div className={`${styles.verdict} ${layak ? styles.verdictLayak : styles.verdictTolak}`}>
          <span className={styles.verdictIcon} aria-hidden="true">
            <Icon name={layak ? "check-circle" : "x-circle"} size={26} />
          </span>
          <div className={styles.verdictText}>
            <span className={styles.verdictLabel}>Keputusan Sistem (Ambang {Math.round(thrPct)}%)</span>
            <span className={styles.verdictValue}>{data.keputusan}</span>
          </div>
          <div className={styles.verdictProb}>
            <span className={styles.verdictProbValue}>{formatPercent(data.probabilitas_layak)}</span>
            <span className={styles.verdictProbCaption}>probabilitas layak</span>
          </div>
        </div>

        {/* Probabilitas + ambang */}
        <div className={styles.section}>
          <ProgressBar
            value={probPct}
            tone={layak ? "success" : "danger"}
            threshold={thrPct}
            thresholdLabel={`Ambang ${Math.round(thrPct)}%`}
            size="lg"
            ariaLabel="Probabilitas layak terhadap ambang"
          />
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Probabilitas Layak</span>
              <span className={`${styles.metricValue} num`}>{formatPercent(data.probabilitas_layak)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Confidence</span>
              <span className={`${styles.metricValue} num`}>{formatPercent(data.confidence)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Ambang Keputusan</span>
              <span className={`${styles.metricValue} num`}>{formatPercent(data.threshold)}</span>
            </div>
          </div>
        </div>

        {/* Perbandingan keputusan: ambang batas vs XGBoost native */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h4 className={styles.sectionTitle}>Perbandingan Keputusan</h4>
            <span className={styles.sectionHint}>Ambang batas vs model XGBoost apa adanya</span>
          </div>

          <div className={styles.compareGrid}>
            <div
              className={`${styles.compareCard} ${
                data.keputusan === "Layak" ? styles.compareLayak : styles.compareTolak
              }`}
            >
              <div className={styles.compareTop}>
                <span className={styles.compareLabel}>Dengan Ambang Batas</span>
                <span className={styles.compareThr}>ambang {Math.round(thrPct)}%</span>
              </div>
              <DecisionBadge keputusan={data.keputusan} />
              <span className={`${styles.compareRule} num`}>
                {probPct.toFixed(1)}% {relasiAmbang} {Math.round(thrPct)}%
              </span>
            </div>

            <div
              className={`${styles.compareCard} ${
                keputusanNative === "Layak" ? styles.compareLayak : styles.compareTolak
              }`}
            >
              <div className={styles.compareTop}>
                <span className={styles.compareLabel}>XGBoost Tanpa Ambang</span>
                <span className={styles.compareThr}>native {nativePct}%</span>
              </div>
              <DecisionBadge keputusan={keputusanNative} />
              <span className={`${styles.compareRule} num`}>
                {probPct.toFixed(1)}% {relasiNative} {nativePct}%
              </span>
            </div>
          </div>

          <div className={`${styles.compareNote} ${sepakat ? styles.noteAgree : styles.noteDiffer}`}>
            <Icon name={sepakat ? "check-circle" : "alert-triangle"} size={15} />
            <p>
              {sepakat ? (
                <>
                  Ambang batas {Math.round(thrPct)}% menghasilkan keputusan yang <strong>sama</strong>{" "}
                  dengan model XGBoost tanpa ambang batas (patokan {nativePct}%).
                </>
              ) : (
                <>
                  Keputusan <strong>berbeda</strong> karena ambang batas diatur {Math.round(thrPct)}%
                  {ambangLebihKetat ? " (lebih ketat" : " (lebih longgar"} dari patokan native{" "}
                  {nativePct}%). Probabilitas {probPct.toFixed(1)}% berada di antara kedua ambang.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Faktor */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h4 className={styles.sectionTitle}>Faktor Penilaian Utama</h4>
            <span className={styles.sectionHint}>Kontribusi terbesar pada keputusan ini (SHAP)</span>
          </div>
          <FaktorList faktor={data.faktor} />
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          <Icon name="info" size={15} className={styles.disclaimerIcon} />
          <p>{data.disclaimer}</p>
        </div>
      </Card>
    </motion.div>
  );
}
