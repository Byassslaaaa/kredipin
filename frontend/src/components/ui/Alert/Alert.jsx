import Icon from "@/components/ui/Icon";
import styles from "./Alert.module.css";

const ICONS = {
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "x-circle",
};

/**
 * Alert — kotak pesan kontekstual (info, sukses, peringatan, bahaya).
 * Dipakai antara lain untuk menampilkan disclaimer prediksi & pesan error.
 *
 * Props:
 * - variant: "info" | "success" | "warning" | "danger"
 * - title: judul opsional
 * - icon: override nama ikon (default mengikuti variant); false untuk tanpa ikon
 * - onClose: bila ada, tampilkan tombol tutup
 */
export default function Alert({
  variant = "info",
  title,
  icon,
  onClose,
  children,
  className = "",
}) {
  const iconName = icon === false ? null : icon || ICONS[variant];

  return (
    <div className={`${styles.alert} ${styles[variant]} ${className}`} role="status">
      {iconName && (
        <span className={styles.icon} aria-hidden="true">
          <Icon name={iconName} size={20} />
        </span>
      )}
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Tutup pesan"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
