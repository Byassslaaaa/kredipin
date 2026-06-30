/**
 * Utilitas CSV untuk fitur "Import Data Nasabah".
 *
 * Alur (CLAUDE.md §4): parse CSV -> validasi header & baris terhadap featureSchema
 * -> bangun payload -> (prediksi batch dilakukan hook dengan mengulang POST /predict).
 * Tidak ada endpoint batch baru.
 */
import Papa from "papaparse";
import {
  FEATURE_FIELDS,
  FEATURE_KEYS,
  buildPayload,
  validateField,
} from "@/constants/featureSchema";

/** Parse File CSV menjadi baris objek (header sebagai kunci). */
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => resolve(res),
      error: (err) => reject(err),
    });
  });
}

/**
 * Validasi hasil parse terhadap skema fitur.
 * @returns {{
 *   missingHeaders: string[],
 *   extraHeaders: string[],
 *   totalRows: number,
 *   validRows: Array<{ rowNumber, payload, raw }>,
 *   invalidRows: Array<{ rowNumber, errors: Record<string,string>, raw }>,
 * }}
 */
export function validateParsed(parseResult) {
  const fields = parseResult.meta?.fields?.map((f) => f.trim()) || [];
  const missingHeaders = FEATURE_KEYS.filter((k) => !fields.includes(k));
  const extraHeaders = fields.filter((f) => !FEATURE_KEYS.includes(f));

  const validRows = [];
  const invalidRows = [];

  if (missingHeaders.length === 0) {
    parseResult.data.forEach((raw, i) => {
      const rowNumber = i + 2; // +1 header, +1 indeks-1
      const errors = {};
      for (const key of FEATURE_KEYS) {
        const msg = validateField(key, raw[key]);
        if (msg) errors[key] = msg;
      }
      if (Object.keys(errors).length === 0) {
        validRows.push({ rowNumber, payload: buildPayload(raw), raw });
      } else {
        invalidRows.push({ rowNumber, errors, raw });
      }
    });
  }

  return {
    missingHeaders,
    extraHeaders,
    totalRows: parseResult.data.length,
    validRows,
    invalidRows,
  };
}

/** CSV template: header fitur + satu baris contoh. */
export function buildTemplateCsv() {
  const exampleRow = FEATURE_FIELDS.reduce((acc, f) => {
    acc[f.name] = f.example;
    return acc;
  }, {});
  return Papa.unparse({ fields: FEATURE_KEYS, data: [exampleRow] });
}

/**
 * CSV hasil prediksi: kolom input + keputusan + probabilitas_layak + confidence + status.
 * @param results hasil dari useBatchPredict (Array<{ input, ok, result, error }>)
 */
export function buildResultsCsv(results) {
  const fields = [...FEATURE_KEYS, "keputusan", "probabilitas_layak", "confidence", "status"];
  const data = results
    .filter(Boolean)
    .map((r) => {
      const base = {};
      for (const key of FEATURE_KEYS) base[key] = r.input?.[key];
      if (r.ok) {
        base.keputusan = r.result.keputusan;
        base.probabilitas_layak = r.result.probabilitas_layak;
        base.confidence = r.result.confidence;
        base.status = "BERHASIL";
      } else {
        base.keputusan = "";
        base.probabilitas_layak = "";
        base.confidence = "";
        base.status = `GAGAL: ${r.error?.message || "error"}`;
      }
      return base;
    });
  return Papa.unparse({ fields, data });
}

/** Unduh string sebagai file CSV (BOM agar Excel membaca UTF-8 dengan benar). */
export function downloadCsv(filename, content) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
