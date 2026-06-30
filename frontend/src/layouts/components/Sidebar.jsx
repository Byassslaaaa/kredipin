import { NavLink } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import { NAV_GROUPS } from "@/constants/navigation";
import { APP } from "@/constants/app";
import styles from "./Sidebar.module.css";

/**
 * Sidebar navigasi utama.
 * - Desktop: tampil permanen.
 * - Mobile: tampil sebagai drawer (dikontrol prop `open`), ditutup saat item diklik.
 */
export default function Sidebar({ open, onNavigate }) {
  return (
    <aside
      className={`${styles.sidebar} ${open ? styles.open : ""}`}
      aria-label="Navigasi utama"
    >
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <Icon name="shield-check" size={22} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>{APP.name}</span>
          <span className={styles.brandSub}>Loan Decision Support</span>
        </span>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>{group.label}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `${styles.link} ${isActive ? styles.active : ""}`
                    }
                  >
                    <Icon name={item.icon} size={18} className={styles.linkIcon} />
                    <span className={styles.linkLabel}>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.footerText}>v{APP.version} · DASD &amp; SIAB</p>
      </div>
    </aside>
  );
}
