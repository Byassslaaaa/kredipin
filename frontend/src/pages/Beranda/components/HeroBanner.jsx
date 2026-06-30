import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import { ROUTES } from "@/constants/navigation";
import styles from "./HeroBanner.module.css";

const ACTIONS = [
  {
    to: ROUTES.analisis,
    icon: "user-plus",
    title: "Analisis Nasabah Baru",
    desc: "Nilai kelayakan satu pengajuan secara interaktif.",
  },
  {
    to: ROUTES.importData,
    icon: "upload",
    title: "Import Data Nasabah",
    desc: "Proses banyak pengajuan sekaligus melalui berkas CSV.",
  },
];

/**
 * Quick actions — titik masuk dua alur kerja utama analis kredit.
 * Tampilan tenang (border-first, tanpa gradient), bukan banner marketing.
 */
export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <section aria-label="Aksi cepat" className={styles.grid}>
      {ACTIONS.map((a) => (
        <button key={a.to} type="button" className={styles.tile} onClick={() => navigate(a.to)}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name={a.icon} size={20} />
          </span>
          <span className={styles.body}>
            <span className={styles.title}>{a.title}</span>
            <span className={styles.desc}>{a.desc}</span>
          </span>
          <Icon name="chevron-right" size={18} className={styles.chevron} />
        </button>
      ))}
    </section>
  );
}
