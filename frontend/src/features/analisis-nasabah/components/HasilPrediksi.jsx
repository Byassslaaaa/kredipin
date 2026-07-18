import { motion, useReducedMotion } from "framer-motion";
import { Alert, Card, EmptyState, ProgressBar, Skeleton } from "@/components/ui";
import Icon from "@/components/ui/Icon";
import FaktorList from "@/components/common/FaktorList";
import KeputusanAnalis from "./KeputusanAnalis";
import { formatDateTime, formatPercent } from "@/utils/format";
import { isMurniXgboost } from "@/utils/prediction";
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
        icon="x"
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
 * HasilPrediksi - laporan penilaian kelayakan kredit untuk satu nasabah,
 * disusun sebagai satu dokumen dengan hierarki visual yang jelas.
 */
const EASE = [0.32, 0.72, 0, 1];

export default function HasilPrediksi({ data, loading, error }) {
  // Dipanggil sebelum early-return agar urutan hook tetap konsisten.
  const kurangiGerak = useReducedMotion();

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel error={error} />;
  if (!data) return <EmptyPanel />;

  const layak = data.keputusan === "Layak";
  const probPct = data.probabilitas_layak * 100;
  const thrPct = data.threshold * 100;
  const murni = isMurniXgboost(data.threshold);

  // Bagian laporan masuk bertahap: verdict lebih dulu, lalu angka, faktor,
  // dan disclaimer - mengikuti urutan seorang analis membaca hasil.
  const wadah = {
    hidden: {},
    show: { transition: { staggerChildren: kurangiGerak ? 0 : 0.09, delayChildren: 0.04 } },
  };
  const bagian = {
    hidden: kurangiGerak ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  };

  return (
    <motion.div
      variants={wadah}
      initial="hidden"
      animate="show"
      // Kunci per-prediksi: animasi diputar ulang tiap hasil baru datang,
      // memberi umpan balik bahwa panel benar-benar diperbarui.
      key={data.id_riwayat ?? data.waktu}
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
        <motion.div
          variants={bagian}
          className={`${styles.verdict} ${layak ? styles.verdictLayak : styles.verdictTolak}`}
        >
          <motion.span
            className={styles.verdictIcon}
            aria-hidden="true"
            // Ikon keputusan "mendarat" dengan pegas - penanda hasil sudah final.
            initial={kurangiGerak ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
          >
            <Icon name={layak ? "check" : "x"} size={26} />
          </motion.span>
          <div className={styles.verdictText}>
            <span className={styles.verdictLabel}>Keputusan Model</span>
            <span className={styles.verdictValue}>{data.keputusan}</span>
          </div>
          <div className={styles.verdictProb}>
            <span className={styles.verdictProbValue}>{formatPercent(data.probabilitas_layak)}</span>
            <span className={styles.verdictProbCaption}>probabilitas layak</span>
          </div>
        </motion.div>

        {/* Probabilitas + ambang */}
        <motion.div variants={bagian} className={styles.section}>
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
              <span className={styles.metricLabel}>Ambang Keputusan</span>
              <span className={`${styles.metricValue} num`}>{formatPercent(data.threshold)}</span>
            </div>
          </div>

          {/* Keterangan kemurnian model */}
          <div className={`${styles.modelNote} ${murni ? styles.modelNoteMurni : styles.modelNoteAmbang}`}>
            <Icon name={murni ? "check" : "alert-triangle"} size={15} />
            <p>
              {murni ? (
                <>
                  Keputusan <strong>murni XGBoost</strong> (patokan native 50%), tanpa ambang batas
                  kustom.
                </>
              ) : (
                <>
                  Keputusan ini <strong>tidak murni XGBoost</strong> - memakai ambang batas kustom{" "}
                  {Math.round(thrPct)}% (bukan patokan native 50%).
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* Faktor */}
        <motion.div variants={bagian} className={styles.section}>
          <div className={styles.sectionHead}>
            <h4 className={styles.sectionTitle}>Faktor Penilaian Utama</h4>
            <span className={styles.sectionHint}>Kontribusi terbesar pada keputusan ini (SHAP)</span>
          </div>
          <FaktorList faktor={data.faktor} />
        </motion.div>

        {/* Keputusan akhir analis - model merekomendasikan, manusia memutuskan. */}
        {data.id_riwayat != null && (
          <motion.div variants={bagian}>
            <KeputusanAnalis riwayatId={data.id_riwayat} keputusanModel={data.keputusan} />
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div variants={bagian} className={styles.disclaimer}>
          <Icon name="info" size={15} className={styles.disclaimerIcon} />
          <p>{data.disclaimer}</p>
        </motion.div>
      </Card>
    </motion.div>
  );
}
