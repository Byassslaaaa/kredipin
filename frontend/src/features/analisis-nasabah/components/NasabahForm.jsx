import { Button, Card, Icon } from "@/components/ui";
import { RadioGroup, Select, TextField } from "@/components/ui/form";
import { FEATURE_FIELDS, FEATURE_GROUPS } from "@/constants/featureSchema";
import { formatIDR } from "@/utils/format";
import ThresholdControl from "@/components/common/ThresholdControl";
import styles from "./NasabahForm.module.css";

/** Render satu kontrol form sesuai tipe fitur. */
function FieldControl({ field, value, error, onChange }) {
  if (field.type === "select") {
    const label = field.unit ? `${field.label} (${field.unit})` : field.label;
    return (
      <Select
        label={label}
        value={value}
        options={field.options}
        placeholder={`Pilih ${field.label.toLowerCase()}`}
        error={error}
        hint={field.help}
        required
        onChange={(e) => onChange(field.name, e.target.value)}
      />
    );
  }

  if (field.type === "radio") {
    return (
      <RadioGroup
        label={field.label}
        value={value}
        options={field.options}
        error={error}
        required
        inline
        onChange={(v) => onChange(field.name, v)}
      />
    );
  }

  // number (int / float)
  const moneyPreview =
    field.money && value !== "" && value != null ? formatIDR(value) : null;

  return (
    <TextField
      type="number"
      label={field.label}
      value={value}
      prefix={field.money ? "Rp" : undefined}
      suffix={!field.money && field.unit ? field.unit : undefined}
      placeholder={field.money ? "0" : `${field.min}–${field.max}`}
      min={field.min}
      max={field.max}
      step={field.step}
      error={error}
      hint={moneyPreview || field.help}
      required
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  );
}

/**
 * NasabahForm — form pengisian 20 fitur model untuk prediksi satu nasabah.
 * TIDAK memakai elemen <form> HTML; submit lewat handler onClick (CLAUDE.md).
 */
export default function NasabahForm({
  values,
  errors,
  setField,
  onSubmit,
  onFillExample,
  onAutoRatios,
  onReset,
  threshold,
  onThresholdChange,
  loading,
}) {
  const fieldsByGroup = (groupId) =>
    FEATURE_FIELDS.filter((f) => f.group === groupId);

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className={styles.formWrap}>
      <Card padding="none">
        <div className={styles.toolbar}>
          <div className={styles.toolbarText}>
            <h3 className={styles.toolbarTitle}>Data Pengajuan Nasabah</h3>
            <p className={styles.toolbarSub}>Lengkapi seluruh field (nilai uang dalam Rupiah).</p>
          </div>
          <div className={styles.toolbarActions}>
            <Button variant="ghost" size="sm" iconLeft="file-text" onClick={onFillExample} type="button">
              Isi Contoh
            </Button>
            <Button variant="ghost" size="sm" iconLeft="refresh" onClick={onReset} type="button">
              Reset
            </Button>
          </div>
        </div>

        <div className={styles.groups}>
          {FEATURE_GROUPS.map((group) => (
            <section key={group.id} className={styles.group}>
              <div className={styles.groupHead}>
                <span className={styles.groupIcon} aria-hidden="true">
                  <Icon name={group.icon} size={16} />
                </span>
                <h4 className={styles.groupTitle}>{group.label}</h4>
                {group.id === "rasio" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft="gauge"
                    onClick={onAutoRatios}
                    type="button"
                    className={styles.autoBtn}
                  >
                    Hitung otomatis
                  </Button>
                )}
              </div>
              <div className={styles.grid}>
                {fieldsByGroup(group.id).map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    error={errors[field.name]}
                    onChange={setField}
                  />
                ))}
              </div>
            </section>
          ))}

          <section className={styles.group}>
            <div className={styles.groupHead}>
              <span className={styles.groupIcon} aria-hidden="true">
                <Icon name="gauge" size={16} />
              </span>
              <h4 className={styles.groupTitle}>Pengaturan Keputusan</h4>
            </div>
            <ThresholdControl value={threshold} onChange={onThresholdChange} />
          </section>
        </div>

        <div className={styles.footer}>
          {hasErrors && (
            <span className={styles.errorNote}>
              <Icon name="alert-triangle" size={15} />
              Lengkapi / perbaiki field yang ditandai.
            </span>
          )}
          <Button
            size="lg"
            iconLeft="trending-up"
            onClick={onSubmit}
            loading={loading}
            type="button"
            className={styles.submitBtn}
          >
            Prediksi Kelayakan
          </Button>
        </div>
      </Card>
    </div>
  );
}
