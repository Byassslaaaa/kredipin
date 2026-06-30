import Icon from "@/components/ui/Icon";
import styles from "./StatCard.module.css";

/**
 * StatCard — kartu KPI (label, nilai utama, ikon, hint, tren opsional).
 *
 * Props:
 * - label: judul metrik
 * - value: nilai utama (string/number, sudah diformat oleh pemanggil)
 * - unit: satuan kecil setelah nilai (mis. "%")
 * - icon: nama ikon <Icon />
 * - tone: "primary" | "success" | "danger" | "warning" | "neutral" (warna aksen ikon)
 * - hint: teks kecil pendukung di bawah nilai
 * - trend: { value: string, direction: "up" | "down" }
 * - loading: tampilkan skeleton
 */
export default function StatCard({
  label,
  value,
  unit,
  icon,
  tone = "primary",
  hint,
  trend,
  loading = false,
  className = "",
}) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <span className={`${styles.icon} ${styles[tone]}`} aria-hidden="true">
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>

      {loading ? (
        <span className={styles.skeleton} aria-hidden="true" />
      ) : (
        <div className={styles.valueRow}>
          <span className={`${styles.value} num`}>{value}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
          {trend && (
            <span
              className={`${styles.trend} ${
                trend.direction === "down" ? styles.trendDown : styles.trendUp
              }`}
            >
              <Icon name="trending-up" size={14} />
              {trend.value}
            </span>
          )}
        </div>
      )}

      {hint && !loading && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
