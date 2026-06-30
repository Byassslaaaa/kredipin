import { useCallback, useMemo, useState } from "react";
import {
  EXAMPLE_VALUES,
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
 * Menyediakan nilai, error, dan aksi (set, isi contoh, auto-hitung rasio,
 * validasi, reset, bangun payload). Validasi berdasarkan featureSchema (SSOT).
 */
export default function useNasabahForm() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const fillExample = useCallback(() => {
    setValues({ ...EXAMPLE_VALUES });
    setErrors({});
  }, []);

  const autoCalcRatios = useCallback(() => {
    setValues((prev) => ({ ...prev, ...computeRatios(prev) }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.rasio_hutang_terhadap_pendapatan;
      delete next.rasio_pinjaman_terhadap_pendapatan;
      delete next.rasio_pembayaran_terhadap_pendapatan;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY_VALUES);
    setErrors({});
  }, []);

  /** Validasi semua field. @returns {boolean} valid */
  const validate = useCallback(() => {
    const nextErrors = {};
    for (const key of FEATURE_KEYS) {
      const msg = validateField(key, values[key]);
      if (msg) nextErrors[key] = msg;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values]);

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
    autoCalcRatios,
    reset,
    validate,
    getPayload,
    isDirty,
  };
}
