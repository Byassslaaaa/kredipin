import { Link } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import { ROUTES } from "@/constants/navigation";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.code}>404</span>
      <h2 className={styles.title}>Halaman tidak ditemukan</h2>
      <p className={styles.desc}>
        Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
      </p>
      <Link to={ROUTES.beranda} className={styles.link}>
        <Icon name="home" size={18} />
        Kembali ke Beranda
      </Link>
    </div>
  );
}
