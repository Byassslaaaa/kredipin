import styles from "./Spinner.module.css";

/**
 * Spinner — indikator loading lingkaran. Memakai currentColor sehingga
 * mengikuti warna konteksnya (mis. di dalam Button primary -> putih).
 */
export default function Spinner({ size = 20, label, className = "" }) {
  return (
    <span className={`${styles.wrap} ${className}`} role="status">
      <svg
        className={styles.spinner}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className={styles.track}
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={styles.head}
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className={styles.label}>{label}</span> : <span className="sr-only">Memuat…</span>}
    </span>
  );
}
