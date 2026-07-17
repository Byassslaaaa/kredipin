import { formatPercent } from "@/utils/format";
import styles from "./ThresholdControl.module.css";

/**
 * ThresholdControl - atur ambang keputusan (0..1) yang dikirim per-request.
 * probabilitas_layak >= ambang -> "Layak". Default 0.5.
 *
 * Opsional: bila `onToggle` diberikan, tampil sakelar untuk menyalakan/mematikan
 * ambang batas. Saat nonaktif, keputusan memakai model murni XGBoost (patokan
 * native 50%) dan slider disembunyikan. Tanpa `onToggle`, komponen berperilaku
 * seperti semula (dipakai pada Import Data Nasabah).
 */
export default function ThresholdControl({
  value,
  onChange,
  disabled = false,
  enabled = true,
  onToggle,
}) {
  const hasToggle = typeof onToggle === "function";
  const active = !hasToggle || enabled; // slider aktif?
  const sliderDisabled = disabled || !active;
  const pct = Math.round(value * 100);
  // Posisi isian slider relatif terhadap rentang efektif (0.2-0.9), bukan 0-1,
  // agar warna terisi sejajar dengan posisi thumb.
  const isian = Math.round(((value - 0.2) / (0.9 - 0.2)) * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>Ambang Keputusan</span>
        {hasToggle ? (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Aktifkan ambang batas keputusan"
            className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
            onClick={() => onToggle(!enabled)}
            disabled={disabled}
          >
            <span className={styles.track}>
              <span className={styles.thumb} />
            </span>
            <span className={styles.toggleLabel}>{enabled ? "Aktif" : "Nonaktif"}</span>
          </button>
        ) : (
          <span className={styles.value}>{formatPercent(value)}</span>
        )}
      </div>

      {active ? (
        <>
          {hasToggle && (
            <div className={styles.valueRow}>
              <span className={styles.value}>{formatPercent(value)}</span>
            </div>
          )}
          <input
            type="range"
            // Rentang mengikuti kebijakan backend (0.2-0.9): di luar itu ditolak
            // 422 karena ambang 0 meloloskan semua & 1 menolak semua (bypass model).
            min={0.2}
            max={0.9}
            step={0.01}
            value={value}
            disabled={sliderDisabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles.slider}
            style={{ "--pct": `${isian}%` }}
            aria-label="Ambang keputusan"
            aria-valuetext={formatPercent(value)}
          />
          <p className={styles.hint}>
            Probabilitas ≥ ambang dinilai <strong>Layak</strong>. Naikkan untuk penilaian lebih
            ketat; turunkan untuk lebih longgar.
          </p>
        </>
      ) : (
        <p className={styles.hint}>
          Ambang batas <strong>nonaktif</strong> - keputusan memakai model{" "}
          <strong>murni XGBoost</strong> (patokan native: probabilitas ≥ 50% dinilai Layak),
          tanpa ambang batas kustom.
        </p>
      )}
    </div>
  );
}
