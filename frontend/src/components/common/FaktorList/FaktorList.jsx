import Icon from "@/components/ui/Icon";
import styles from "./FaktorList.module.css";

/**
 * FaktorList — menampilkan faktor pendukung keputusan (kontribusi SHAP).
 * Hijau = mendukung LAYAK, merah = mendukung TIDAK LAYAK. Panjang bar
 * proporsional terhadap |kontribusi| relatif faktor terbesar.
 *
 * Props: faktor = Array<{ fitur, nilai_input, kontribusi, arah }>
 */
export default function FaktorList({ faktor = [] }) {
  if (!faktor.length) return null;
  const maxAbs = Math.max(...faktor.map((f) => Math.abs(f.kontribusi)), 1e-9);

  return (
    <ul className={styles.list}>
      {faktor.map((f, i) => {
        const layak = f.arah === "mendukung LAYAK";
        const width = `${Math.max(6, (Math.abs(f.kontribusi) / maxAbs) * 100)}%`;
        return (
          <li key={`${f.fitur}-${i}`} className={styles.item}>
            <div className={styles.top}>
              <span className={styles.fitur}>{f.fitur}</span>
              {f.nilai_input != null && (
                <span className={styles.nilai}>{f.nilai_input}</span>
              )}
            </div>
            <div className={styles.barRow}>
              <div className={styles.track}>
                <div
                  className={`${styles.fill} ${layak ? styles.layak : styles.tolak}`}
                  style={{ width }}
                />
              </div>
              <span className={`${styles.arah} ${layak ? styles.arahLayak : styles.arahTolak}`}>
                <Icon name={layak ? "check-circle" : "x-circle"} size={14} />
                {layak ? "Layak" : "Tidak Layak"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
