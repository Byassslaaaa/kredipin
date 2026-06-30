import styles from "./Skeleton.module.css";

/**
 * Skeleton — placeholder loading (mencegah content jumping).
 *
 * Props:
 * - variant: "text" | "rect" | "circle"
 * - width / height: ukuran (CSS value); default mengikuti variant
 * - count: jumlah baris (untuk variant text)
 */
export default function Skeleton({
  variant = "rect",
  width,
  height,
  radius,
  count = 1,
  className = "",
}) {
  const style = {
    width,
    height,
    borderRadius:
      radius ?? (variant === "circle" ? "50%" : variant === "text" ? "var(--radius-sm)" : "var(--radius-md)"),
  };

  if (variant === "text" && count > 1) {
    return (
      <span className={className} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={`${styles.skeleton} ${styles.text}`}
            style={{ width: i === count - 1 ? "70%" : width || "100%", height }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
