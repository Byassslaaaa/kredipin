import { formatPercent } from "@/utils/format";
import styles from "./ThresholdControl.module.css";

/**
 * ThresholdControl — atur ambang keputusan (0..1) yang dikirim per-request.
 * probabilitas_layak >= ambang -> "Layak". Default 0.5.
 * Dipakai pada Analisis Nasabah Baru & Import Data Nasabah.
 */
export default function ThresholdControl({ value, onChange, disabled = false }) {
  const pct = Math.round(value * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>Ambang Keputusan</span>
        <span className={styles.value}>{formatPercent(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        style={{ "--pct": `${pct}%` }}
        aria-label="Ambang keputusan"
        aria-valuetext={formatPercent(value)}
      />
      <p className={styles.hint}>
        Probabilitas ≥ ambang dinilai <strong>Layak</strong>. Naikkan untuk penilaian lebih
        ketat; turunkan untuk lebih longgar.
      </p>
    </div>
  );
}
