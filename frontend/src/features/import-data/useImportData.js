import { useCallback, useState } from "react";
import useBatchPredict from "@/hooks/useBatchPredict";
import { parseCsvFile, validateParsed } from "@/utils/csv";

/**
 * useImportData — orchestrator fitur "Import Data Nasabah".
 *
 * Tahap: pilih file -> parse -> validasi (header & baris) -> jalankan batch
 * (mengulang POST /predict via useBatchPredict) -> hasil & unduhan.
 */
export default function useImportData() {
  const batch = useBatchPredict();
  const [fileName, setFileName] = useState("");
  const [stage, setStage] = useState("idle"); // idle | parsing | validated | error
  const [parseError, setParseError] = useState(null);
  const [validation, setValidation] = useState(null);
  const [threshold, setThreshold] = useState(0.5);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      batch.reset();
      setValidation(null);
      setParseError(null);
      setFileName(file.name);
      setStage("parsing");
      try {
        const parsed = await parseCsvFile(file);
        const result = validateParsed(parsed);
        setValidation(result);
        setStage("validated");
      } catch (err) {
        setParseError(err?.message || "Gagal membaca file CSV.");
        setStage("error");
      }
    },
    [batch],
  );

  const start = useCallback(
    (concurrency = 5) => {
      if (!validation?.validRows?.length) return;
      const payloads = validation.validRows.map((r) => r.payload);
      batch.run(payloads, { threshold, concurrency });
    },
    [validation, threshold, batch],
  );

  const reset = useCallback(() => {
    batch.reset();
    setFileName("");
    setStage("idle");
    setParseError(null);
    setValidation(null);
  }, [batch]);

  return {
    fileName,
    stage,
    parseError,
    validation,
    threshold,
    setThreshold,
    handleFile,
    start,
    reset,
    batch,
  };
}
