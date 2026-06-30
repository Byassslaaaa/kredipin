import Icon from "@/components/ui/Icon";
import styles from "./Card.module.css";

/**
 * Card — kontainer permukaan serbaguna.
 *
 * Props:
 * - title / subtitle: header opsional
 * - icon: nama ikon di sebelah judul
 * - actions: node aksi di kanan header (mis. tombol)
 * - footer: node footer opsional
 * - padding: "none" | "sm" | "md" | "lg" (default md) untuk body
 * - hoverable / glass: variasi tampilan
 */
export default function Card({
  title,
  subtitle,
  icon,
  actions,
  footer,
  children,
  padding = "md",
  hoverable = false,
  glass = false,
  className = "",
  bodyClassName = "",
  ...rest
}) {
  const hasHeader = title || subtitle || actions || icon;
  const classes = [
    styles.card,
    hoverable ? styles.hoverable : "",
    glass ? styles.glass : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} {...rest}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.headingWrap}>
            {icon && (
              <span className={styles.icon} aria-hidden="true">
                <Icon name={icon} size={18} />
              </span>
            )}
            <div>
              {title && <h3 className={styles.title}>{title}</h3>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={`${styles.body} ${styles[`pad_${padding}`]} ${bodyClassName}`}>
        {children}
      </div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
}
