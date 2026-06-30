import { useId } from "react";
import Icon from "@/components/ui/Icon";
import FieldWrapper from "./FieldWrapper";
import styles from "./form.module.css";

/**
 * Select — dropdown native yang distyle.
 *
 * Props:
 * - options: Array<{ value, label }> atau Array<string|number>
 * - value, onChange, label, required, hint, error, placeholder, disabled
 */
function normalizeOptions(options = []) {
  return options.map((opt) =>
    typeof opt === "object" ? opt : { value: opt, label: String(opt) },
  );
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  required = false,
  hint,
  error,
  placeholder,
  disabled = false,
  className = "",
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const opts = normalizeOptions(options);

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className={styles.selectWrap}>
        <select
          id={fieldId}
          className={`${styles.select} ${error ? styles.selectError : ""}`}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {opts.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevron-right" size={16} style={{ transform: "rotate(90deg)" }} />
        </span>
      </div>
    </FieldWrapper>
  );
}
