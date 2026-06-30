import { useId } from "react";
import FieldWrapper from "./FieldWrapper";
import styles from "./form.module.css";

/**
 * TextField — input teks/angka dengan label, hint, error, dan prefix/suffix.
 *
 * Props utama: label, value, onChange, type ("text" | "number"), required,
 * hint, error, prefix, suffix, placeholder, min, max, step, disabled.
 */
export default function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  hint,
  error,
  prefix,
  suffix,
  placeholder,
  disabled = false,
  inputMode,
  className = "",
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className={`${styles.control} ${error ? styles.controlError : ""}`}>
        {prefix && <span className={`${styles.affix} ${styles.prefix}`}>{prefix}</span>}
        <input
          id={fieldId}
          className={styles.input}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...rest}
        />
        {suffix && <span className={`${styles.affix} ${styles.suffix}`}>{suffix}</span>}
      </div>
    </FieldWrapper>
  );
}
