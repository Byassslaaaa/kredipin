import Icon from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthContext";
import HealthIndicator from "./HealthIndicator";
import styles from "./Topbar.module.css";

/**
 * Topbar aplikasi.
 * Menampilkan tombol menu (mobile), judul halaman aktif, dan aksi global
 * (indikator status backend & toggle tema disiapkan untuk milestone berikutnya).
 */
export default function Topbar({ title, subtitle, onToggleSidebar, theme, onToggleTheme }) {
  const { user, logout } = useAuth();

  // Inisial dari nama untuk avatar - hindari memuat gambar demi dua huruf.
  const inisial = (user?.nama || user?.username || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

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

        {user && (
          <div className={styles.pengguna}>
            <span className={styles.avatar} aria-hidden="true">{inisial}</span>
            <span className={styles.penggunaTeks}>
              <span className={styles.penggunaNama}>{user.nama}</span>
              <span className={styles.penggunaPeran}>{user.peran}</span>
            </span>
          </div>
        )}

        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
          title={theme === "dark" ? "Mode terang" : "Mode gelap"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
        </button>

        {user && (
          <button
            type="button"
            className={styles.keluarBtn}
            onClick={logout}
            aria-label="Keluar dari sesi"
            title="Keluar dari sesi"
          >
            <Icon name="log-out" size={17} />
            <span className={styles.keluarLabel}>Keluar</span>
          </button>
        )}
      </div>
    </header>
  );
}
