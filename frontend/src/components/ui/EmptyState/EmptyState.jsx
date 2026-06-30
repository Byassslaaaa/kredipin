import Icon from "@/components/ui/Icon";
import styles from "./EmptyState.module.css";

/**
 * EmptyState — tampilan saat data kosong / error / belum ada aksi.
 *
 * Props:
 * - icon: nama ikon <Icon />
 * - title, description
 * - action: node (mis. <Button />)
 * - tone: "neutral" | "danger" (warna ikon)
 */
export default function EmptyState({
  icon = "info",
  title,
  description,
  action,
  tone = "neutral",
  className = "",
}) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <span className={`${styles.icon} ${styles[tone]}`} aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      {title && <p className={styles.title}>{title}</p>}
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
