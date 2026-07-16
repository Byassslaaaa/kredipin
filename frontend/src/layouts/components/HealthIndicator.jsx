import useHealth from "@/hooks/useHealth";
import Icon from "@/components/ui/Icon";
import styles from "./HealthIndicator.module.css";

/**
 * HealthIndicator — peringatan koneksi backend (GET /health).
 *
 * Sengaja TIDAK menampilkan apa pun saat layanan normal. Sistem produksi tidak
 * memamerkan lencana "Backend aktif" secara permanen — status sehat adalah
 * kondisi yang diharapkan, bukan informasi. Indikator hanya muncul ketika ada
 * masalah, sehingga kehadirannya benar-benar berarti.
 */
export default function HealthIndicator() {
  const { data, loading, error } = useHealth();

  // Diam saat memuat & saat sehat.
  if (loading) return null;
  if (!error && data?.status === "ok") return null;

  const putus = Boolean(error);

  return (
    <span
      className={`${styles.badge} ${putus ? styles.down : styles.degraded}`}
      role="status"
      title={
        putus
          ? "Tidak dapat terhubung ke server. Periksa koneksi atau status layanan."
          : "Sebagian layanan tidak tersedia."
      }
    >
      <Icon name={putus ? "x-circle" : "alert-triangle"} size={14} />
      <span className={styles.label}>{putus ? "Tidak terhubung" : "Layanan terbatas"}</span>
    </span>
  );
}
