import { formatNumber, formatPercent } from "@/utils/format";
import styles from "./ConfusionMatrix.module.css";

/**
 * ConfusionMatrix — visual matriks kebingungan 2x2.
 *
 * Konvensi (sesuai sklearn): baris = aktual, kolom = prediksi,
 * urutan label indeks 0 = "Tidak Layak", indeks 1 = "Layak".
 *
 * Props: matrix = [[TN, FP], [FN, TP]]
 */
export default function ConfusionMatrix({ matrix }) {
  const [[tn, fp], [fn, tp]] = matrix;
  const total = tn + fp + fn + tp;
  const pct = (n) => formatPercent(n / total);

  const cell = (value, type, caption) => (
    <div className={`${styles.cell} ${styles[type]}`}>
      <span className={styles.cellCaption}>{caption}</span>
      <span className={`${styles.cellValue} num`}>{formatNumber(value)}</span>
      <span className={styles.cellPct}>{pct(value)}</span>
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {/* sudut kiri-atas kosong */}
        <div className={styles.corner} />
        <div className={styles.axisTop}>
          <span className={styles.axisTitle}>Prediksi</span>
          <div className={styles.axisLabels}>
            <span>Tidak Layak</span>
            <span>Layak</span>
          </div>
        </div>

        <div className={styles.axisLeft}>
          <span className={styles.axisTitle}>Aktual</span>
          <div className={styles.axisLabels}>
            <span>Tidak Layak</span>
            <span>Layak</span>
          </div>
        </div>

        <div className={styles.cells}>
          {cell(tn, "correct", "Benar Negatif (TN)")}
          {cell(fp, "wrong", "Salah Positif (FP)")}
          {cell(fn, "wrong", "Salah Negatif (FN)")}
          {cell(tp, "correct", "Benar Positif (TP)")}
        </div>
      </div>

      <p className={styles.note}>
        Dari {formatNumber(total)} data uji: <strong>{formatNumber(tp + tn)}</strong> diprediksi
        benar, <strong>{formatNumber(fp + fn)}</strong> keliru.
      </p>
    </div>
  );
}
