import Icon from "@/components/ui/Icon";
import HealthIndicator from "./HealthIndicator";
import styles from "./Topbar.module.css";

/**
 * Topbar aplikasi.
 * Menampilkan tombol menu (mobile), judul halaman aktif, dan aksi global
 * (indikator status backend & toggle tema disiapkan untuk milestone berikutnya).
 */
export default function Topbar({ title, subtitle, onToggleSidebar, theme, onToggleTheme }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={onToggleSidebar}
          aria-label="Buka menu navigasi"
        >
          <Icon name="menu" size={22} />
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.right}>
        <HealthIndicator />
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
          title={theme === "dark" ? "Mode terang" : "Mode gelap"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
        </button>
      </div>
    </header>
  );
}
