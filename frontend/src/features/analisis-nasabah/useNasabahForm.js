import { useCallback, useMemo, useState } from "react";
import {
  EXAMPLE_VALUES,
  FEATURE_FIELDS,
  FEATURE_KEYS,
  buildPayload,
  validateField,
} from "@/constants/featureSchema";
import { computeRatios } from "@/utils/ratios";

const EMPTY_VALUES = FEATURE_KEYS.reduce((acc, key) => {
  acc[key] = "";
  return acc;
}, {});

/**
 * useNasabahForm — kelola state form "Analisis Nasabah Baru".
 *
 * Menyediakan nilai, error, dan aksi (set, isi contoh,
 * validasi, reset, bangun payload). Validasi berdasarkan featureSchema (SSOT).
 */
export default function useNasabahForm() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});

  // Field dasar yang menentukan ketiga rasio turunan.
  const setField = useCallback((name, value) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      // Rasio adalah TURUNAN: hitung ulang otomatis begitu field dasarnya
      // berubah, tanpa efek terpisah (menghindari render-loop). Analis tidak
      // mengetik rasio sendiri, sehingga yang tampil selalu = yang dipakai model.
      if (name === "pendapatan_tahunan" || name === "hutang_saat_ini" || name === "jumlah_pinjaman") {
        Object.assign(next, computeRatios(next));
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const nx = { ...prev };
      delete nx[name];
      return nx;
    });
  }, []);

  const fillExample = useCallback(() => {
    const isi = { ...EXAMPLE_VALUES };
    Object.assign(isi, computeRatios(isi));
    setValues(isi);
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY_VALUES);
    setErrors({});
  }, []);

  /** Validasi semua field. @returns {boolean} valid */
  const validate = useCallback(() => {
    const nextErrors = {};
    for (const f of FEATURE_FIELDS) {
      if (f.derived) continue; // rasio: turunan, tidak divalidasi manual
      const msg = validateField(f.name, values[f.name]);
      if (msg) nextErrors[f.name] = msg;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values]);

  /**
   * Validasi hanya field pada satu grup — dipakai wizard agar pengguna tidak
   * dihujani error dari langkah yang belum ia isi.
   * @returns {boolean} valid
   */
  const validateGroup = useCallback(
    (groupId) => {
      const keys = FEATURE_FIELDS
        .filter((f) => f.group === groupId && !f.derived)
        .map((f) => f.name);
      const pesan = {};
      for (const key of keys) {
        const msg = validateField(key, values[key]);
        if (msg) pesan[key] = msg;
      }
      setErrors((prev) => {
        const next = { ...prev };
        // Hanya sentuh field milik grup ini: tandai yang salah, bersihkan yang
        // sudah benar. Error grup lain dibiarkan apa adanya.
        for (const key of keys) {
          if (pesan[key]) next[key] = pesan[key];
          else delete next[key];
        }
        return next;
      });
      return Object.keys(pesan).length === 0;
    },
    [values],
  );

  /** Jumlah field terisi pada satu grup — untuk indikator progres wizard. */
  const groupFilled = useCallback(
    (groupId) => {
      const keys = FEATURE_FIELDS.filter((f) => f.group === groupId).map((f) => f.name);
      const terisi = keys.filter((k) => values[k] !== "" && values[k] != null).length;
      return { terisi, total: keys.length };
    },
    [values],
  );

  const getPayload = useCallback(() => buildPayload(values), [values]);

  const isDirty = useMemo(
    () => FEATURE_KEYS.some((key) => values[key] !== "" && values[key] != null),
    [values],
  );

  return {
    values,
    errors,
    setField,
    fillExample,
    reset,
    validate,
    validateGroup,
    groupFilled,
    getPayload,
    isDirty,
  };
}
