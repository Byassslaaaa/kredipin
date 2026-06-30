import Icon from "@/components/ui/Icon";
import styles from "./Stepper.module.css";

/**
 * Stepper — indikator langkah horizontal untuk alur kerja bertahap.
 *
 * Props:
 * - steps: string[] (label tiap langkah)
 * - current: number (indeks langkah aktif, 0-based; langkah sebelumnya = selesai)
 */
export default function Stepper({ steps = [], current = 0 }) {
  return (
    <ol className={styles.stepper}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={label} className={`${styles.step} ${styles[state]}`}>
            <span className={styles.marker} aria-hidden="true">
              {state === "done" ? <Icon name="check-circle" size={18} /> : <span>{i + 1}</span>}
            </span>
            <span className={styles.label}>{label}</span>
            {i < steps.length - 1 && <span className={styles.line} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
