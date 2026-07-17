import Icon from "@/components/ui/Icon";
import styles from "./Stepper.module.css";

/**
 * Stepper - indikator langkah horizontal untuk alur kerja bertahap.
 *
 * Props:
 * - steps: string[] (label tiap langkah)
 * - current: number (indeks langkah aktif, 0-based; langkah sebelumnya = selesai)
 * - onStepClick?: (index) => void - bila diberikan, langkah yang SUDAH selesai
 *   dapat diklik untuk kembali. Langkah yang belum dilalui tetap tidak bisa
 *   diklik agar pengguna tidak melompati validasi.
 */
export default function Stepper({ steps = [], current = 0, onStepClick }) {
  const bisaDiklik = typeof onStepClick === "function";

  return (
    <ol className={styles.stepper}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        const interaktif = bisaDiklik && state === "done";
        const Tag = interaktif ? "button" : "div";

        return (
          <li key={label} className={`${styles.step} ${styles[state]}`}>
            <Tag
              type={interaktif ? "button" : undefined}
              className={`${styles.trigger} ${interaktif ? styles.triggerAktif : ""}`}
              onClick={interaktif ? () => onStepClick(i) : undefined}
              aria-label={interaktif ? `Kembali ke langkah ${i + 1}: ${label}` : undefined}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className={styles.marker} aria-hidden="true">
                {state === "done" ? <Icon name="check" size={18} /> : <span>{i + 1}</span>}
              </span>
              <span className={styles.label}>{label}</span>
            </Tag>
            {i < steps.length - 1 && <span className={styles.line} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
