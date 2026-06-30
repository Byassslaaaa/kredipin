import useHealth from "@/hooks/useHealth";
import styles from "./HealthIndicator.module.css";

/**
 * HealthIndicator — lencana kecil status koneksi backend (GET /health).
 * Hijau = aktif, kuning = degraded, merah = tidak terhubung.
 */
export default function HealthIndicator() {
  const { data, loading, error } = useHealth();

  let tone = "loading";
  let label = "Menghubungkan…";

  if (!loading) {
    if (error) {
      tone = "down";
      label = "Backend tidak terhubung";
    } else if (data?.status === "ok") {
      tone = "ok";
      label = "Backend aktif";
    } else {
      tone = "degraded";
      label = "Layanan terbatas";
    }
  }

  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={label}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
