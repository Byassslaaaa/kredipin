import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Card, Icon, Stepper } from "@/components/ui";
import { RadioGroup, Select, TextField } from "@/components/ui/form";
import { FEATURE_FIELDS, FEATURE_GROUPS } from "@/constants/featureSchema";
import { formatIDR } from "@/utils/format";
import ThresholdControl from "@/components/common/ThresholdControl";
import styles from "./NasabahForm.module.css";

/** Label ringkas untuk indikator langkah (label penuh terlalu panjang). */
const LABEL_LANGKAH = {
  demografi: "Pribadi",
  keuangan: "Keuangan",
  kredit: "Kredit",
  pinjaman: "Pinjaman",
  rasio: "Rasio",
};

const EASE = [0.32, 0.72, 0, 1];

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

  const moneyPreview = field.money && value !== "" && value != null ? formatIDR(value) : null;

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
 * NasabahForm — wizard bertahap pengisian 20 fitur model.
 *
 * Alur dipecah mengikuti pengelompokan fitur (5 langkah) agar tidak menyodorkan
 * 20 field sekaligus. Validasi dijalankan PER LANGKAH sehingga pengguna hanya
 * melihat error dari bagian yang sedang ia isi.
 *
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
  validateGroup,
  groupFilled,
  threshold,
  onThresholdChange,
  ambangAktif,
  onAmbangToggle,
  loading,
}) {
  const kurangiGerak = useReducedMotion();
  const [langkah, setLangkah] = useState(0);
  // Arah transisi: +1 maju, -1 mundur — agar slide-nya terasa logis.
  const [arah, setArah] = useState(1);

  const grup = FEATURE_GROUPS[langkah];
  const terakhir = langkah === FEATURE_GROUPS.length - 1;
  const fields = FEATURE_FIELDS.filter((f) => f.group === grup.id);
  const { terisi, total } = groupFilled(grup.id);

  const keLangkah = (tujuan, arahBaru) => {
    setArah(arahBaru);
    setLangkah(tujuan);
  };

  const maju = () => {
    // Hanya boleh lanjut bila langkah ini sudah valid.
    if (!validateGroup(grup.id)) return;
    if (terakhir) onSubmit();
    else keLangkah(langkah + 1, 1);
  };

  const mundur = () => {
    if (langkah > 0) keLangkah(langkah - 1, -1);
  };

  /** Lompat langsung lewat Stepper — hanya ke langkah yang sudah dilewati. */
  const lompat = (i) => {
    if (i < langkah) keLangkah(i, -1);
  };

  const varian = {
    masuk: (d) => (kurangiGerak ? { opacity: 1 } : { opacity: 0, x: d * 28 }),
    tampil: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE } },
    keluar: (d) => (kurangiGerak ? { opacity: 0 } : { opacity: 0, x: d * -28, transition: { duration: 0.2 } }),
  };

  return (
    <div className={styles.formWrap}>
      <Card padding="none">
        <div className={styles.toolbar}>
          <div className={styles.toolbarText}>
            <h3 className={styles.toolbarTitle}>Data Pengajuan Nasabah</h3>
            <p className={styles.toolbarSub}>
              Langkah {langkah + 1} dari {FEATURE_GROUPS.length} · nilai uang dalam Rupiah
            </p>
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

        {/* Indikator langkah — juga sebagai navigasi mundur */}
        <div className={styles.stepperWrap}>
          <Stepper
            steps={FEATURE_GROUPS.map((g) => LABEL_LANGKAH[g.id] || g.label)}
            current={langkah}
            onStepClick={lompat}
          />
        </div>

        {/* Isi langkah aktif */}
        <div className={styles.stepBody}>
          <AnimatePresence mode="wait" custom={arah} initial={false}>
            <motion.section
              key={grup.id}
              custom={arah}
              variants={varian}
              initial="masuk"
              animate="tampil"
              exit="keluar"
              className={styles.group}
            >
              <div className={styles.groupHead}>
                <span className={styles.groupIcon} aria-hidden="true">
                  <Icon name={grup.icon} size={16} />
                </span>
                <h4 className={styles.groupTitle}>{grup.label}</h4>
                <span className={styles.groupCount}>
                  {terisi}/{total} terisi
                </span>
                {grup.id === "rasio" && (
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
                {fields.map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    error={errors[field.name]}
                    onChange={setField}
                  />
                ))}
              </div>

              {/* Pengaturan ambang hanya di langkah terakhir, tepat sebelum submit */}
              {terakhir && (
                <div className={styles.ambang}>
                  <div className={styles.groupHead}>
                    <span className={styles.groupIcon} aria-hidden="true">
                      <Icon name="gauge" size={16} />
                    </span>
                    <h4 className={styles.groupTitle}>Pengaturan Keputusan</h4>
                  </div>
                  <ThresholdControl
                    value={threshold}
                    onChange={onThresholdChange}
                    enabled={ambangAktif}
                    onToggle={onAmbangToggle}
                  />
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>

        {/* Navigasi */}
        <div className={styles.footer}>
          <Button
            variant="secondary"
            iconLeft="chevron-right"
            onClick={mundur}
            type="button"
            disabled={langkah === 0}
            className={styles.backBtn}
          >
            Kembali
          </Button>

          <Button
            size="lg"
            iconRight={terakhir ? undefined : "chevron-right"}
            iconLeft={terakhir ? "trending-up" : undefined}
            onClick={maju}
            loading={terakhir && loading}
            type="button"
            className={styles.submitBtn}
          >
            {terakhir ? "Prediksi Kelayakan" : "Lanjut"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
