import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import styles from "./Button.module.css";

/**
 * Button — tombol serbaguna.
 *
 * Props:
 * - variant: "primary" | "secondary" | "ghost" | "danger" | "success"
 * - size: "sm" | "md" | "lg"
 * - loading: tampilkan spinner & nonaktifkan (loading-buttons UX)
 * - iconLeft / iconRight: nama ikon <Icon />
 * - fullWidth: lebar penuh
 *
 * Catatan: pakai handler onClick (CLAUDE.md melarang <form> HTML pada React).
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  type = "button",
  className = "",
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={16} className={styles.spinner} />}
      {!loading && iconLeft && <Icon name={iconLeft} size={size === "sm" ? 16 : 18} />}
      {children && <span className={styles.label}>{children}</span>}
      {!loading && iconRight && <Icon name={iconRight} size={size === "sm" ? 16 : 18} />}
    </button>
  );
}
