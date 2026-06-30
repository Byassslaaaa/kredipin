import Icon from "@/components/ui/Icon";
import styles from "./PlaceholderPage.module.css";

/**
 * PlaceholderPage — penanda halaman yang akan diimplementasikan pada
 * milestone berikutnya. Menjaga routing & navigasi tetap berfungsi sejak M1.
 */
export default function PlaceholderPage({ icon = "info", title, description, milestone }) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={icon} size={30} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.desc}>{description}</p>}
      {milestone && <span className={styles.tag}>{milestone}</span>}
    </div>
  );
}
