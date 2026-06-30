import Icon from "@/components/ui/Icon";
import styles from "./Badge.module.css";

/**
 * Badge — label status ringkas.
 *
 * Props:
 * - variant: "neutral" | "primary" | "success" | "danger" | "warning" | "info"
 * - size: "sm" | "md"
 * - dot: titik penanda di depan
 * - icon: nama ikon <Icon /> di depan
 */
export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  icon,
  className = "",
}) {
  const classes = [styles.badge, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </span>
  );
}
