import styles from "./form.module.css";

/**
 * FieldWrapper — kerangka konsisten untuk setiap kontrol form:
 * label (dengan tanda wajib), area kontrol, lalu hint atau pesan error.
 * Dipakai bersama oleh TextField, Select, dan RadioGroup (no duplicated code).
 */
export default function FieldWrapper({
  id,
  label,
  required = false,
  hint,
  error,
  className = "",
  labelAs = "label",
  children,
}) {
  const Label = labelAs;
  const describedId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <Label className={styles.label} htmlFor={labelAs === "label" ? id : undefined}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error ? (
        <p id={describedId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={describedId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
