import { motion, useReducedMotion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import styles from "./FaktorList.module.css";

/**
 * FaktorList - menampilkan faktor pendukung keputusan (kontribusi SHAP).
 * Hijau = mendukung LAYAK, merah = mendukung TIDAK LAYAK. Panjang bar
 * proporsional terhadap |kontribusi| relatif faktor terbesar.
 *
 * Faktor masuk bertahap (stagger) dan bar tumbuh dari nol, sehingga urutan
 * pengaruh terbaca - bukan sekadar muncul serempak.
 *
 * Props: faktor = Array<{ fitur, nilai_input, kontribusi, arah }>
 */

const EASE = [0.32, 0.72, 0, 1];

export default function FaktorList({ faktor = [] }) {
  // Hormati preferensi sistem: matikan animasi bila pengguna memintanya.
  const kurangiGerak = useReducedMotion();

  if (!faktor.length) return null;
  const maxAbs = Math.max(...faktor.map((f) => Math.abs(f.kontribusi)), 1e-9);

  const wadah = {
    hidden: {},
    show: { transition: { staggerChildren: kurangiGerak ? 0 : 0.08 } },
  };

  const baris = {
    hidden: kurangiGerak ? { opacity: 1 } : { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
  };

  return (
    <motion.ul className={styles.list} variants={wadah} initial="hidden" animate="show">
      {faktor.map((f, i) => {
        const layak = f.arah === "mendukung LAYAK";
        const width = `${Math.max(6, (Math.abs(f.kontribusi) / maxAbs) * 100)}%`;
        return (
          <motion.li key={`${f.fitur}-${i}`} className={styles.item} variants={baris}>
            <div className={styles.top}>
              <span className={styles.fitur}>{f.fitur}</span>
              {f.nilai_input != null && <span className={styles.nilai}>{f.nilai_input}</span>}
            </div>
            <div className={styles.barRow}>
              <div className={styles.track}>
                <motion.div
                  className={`${styles.fill} ${layak ? styles.layak : styles.tolak}`}
                  initial={kurangiGerak ? false : { width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.55, ease: EASE, delay: 0.12 + i * 0.08 }}
                />
              </div>
              <span className={`${styles.arah} ${layak ? styles.arahLayak : styles.arahTolak}`}>
                <Icon name={layak ? "check" : "x"} size={14} />
                {layak ? "Layak" : "Tidak Layak"}
              </span>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
