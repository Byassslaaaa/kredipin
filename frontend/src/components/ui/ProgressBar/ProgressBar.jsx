import styles from "./ProgressBar.module.css";

/**
 * ProgressBar — bar progres horizontal dengan penanda ambang (threshold) opsional.
 *
 * Props:
 * - value: 0..100 (persen)
 * - tone: "primary" | "success" | "danger" | "warning"
 * - threshold: 0..100 -> garis penanda ambang keputusan (mis. 50)
 * - thresholdLabel: teks pada penanda (mis. "Ambang 50%")
 * - size: "sm" | "md" | "lg"
 * - ariaLabel: label aksesibilitas
 */
export default function ProgressBar({
  value = 0,
  tone = "primary",
  threshold,
  thresholdLabel,
  size = "md",
  ariaLabel,
  className = "",
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const hasThreshold = threshold != null;
  const thr = hasThreshold ? Math.max(0, Math.min(100, Number(threshold))) : null;

  return (
    <div className={`${className}`}>
      <div
        className={`${styles.track} ${styles[size]}`}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={`${styles.fill} ${styles[tone]}`}
          style={{ width: `${clamped}%` }}
        />
        {hasThreshold && (
          <div
            className={styles.threshold}
            style={{ left: `${thr}%` }}
            title={thresholdLabel || `Ambang ${thr}%`}
          >
            <span className={styles.thresholdLine} />
          </div>
        )}
      </div>
      {hasThreshold && thresholdLabel && (
        <div className={styles.thresholdLabelRow}>
          <span className={styles.thresholdLabel} style={{ left: `${thr}%` }}>
            {thresholdLabel}
          </span>
        </div>
      )}
    </div>
  );
}
