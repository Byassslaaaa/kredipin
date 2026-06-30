import { useId } from "react";
import FieldWrapper from "./FieldWrapper";
import styles from "./form.module.css";

/**
 * RadioGroup — kumpulan pilihan radio yang distyle sebagai kartu.
 *
 * Props:
 * - options: Array<{ value, label }> atau Array<string>
 * - value, onChange(value), name, label, required, hint, error
 * - inline: tata letak horizontal
 */
function normalizeOptions(options = []) {
  return options.map((opt) =>
    typeof opt === "object" ? opt : { value: opt, label: String(opt) },
  );
}

export default function RadioGroup({
  name,
  label,
  value,
  onChange,
  options = [],
  required = false,
  hint,
  error,
  inline = false,
  className = "",
}) {
  const autoId = useId();
  const groupId = name || autoId;
  const opts = normalizeOptions(options);

  return (
    <FieldWrapper
      id={groupId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
      labelAs="span"
    >
      <div
        className={`${styles.radioGroup} ${inline ? styles.radioGroupInline : ""}`}
        role="radiogroup"
        aria-label={label}
      >
        {opts.map((opt) => {
          const checked = String(value) === String(opt.value);
          return (
            <label
              key={opt.value}
              className={`${styles.radio} ${checked ? styles.radioChecked : ""}`}
            >
              <input
                type="radio"
                className={styles.radioInput}
                name={groupId}
                value={opt.value}
                checked={checked}
                onChange={() => onChange?.(opt.value)}
              />
              <span className={styles.radioDot} aria-hidden="true" />
              <span className={styles.radioLabel}>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </FieldWrapper>
  );
}
