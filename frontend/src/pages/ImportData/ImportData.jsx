import { Alert, Card, Stepper } from "@/components/ui";
import { useToast } from "@/components/ui";
import useImportData from "@/features/import-data/useImportData";
import UploadPanel from "@/features/import-data/components/UploadPanel";
import ValidationSummary from "@/features/import-data/components/ValidationSummary";
import BatchResults from "@/features/import-data/components/BatchResults";
import { buildResultsCsv, buildTemplateCsv, downloadCsv } from "@/utils/csv";
import styles from "./ImportData.module.css";

export default function ImportData() {
  const imp = useImportData();
  const toast = useToast();
  const running = imp.batch.status === "running";
  const showValidation = imp.stage === "validated" && imp.batch.status === "idle";

  const handleTemplate = () => {
    downloadCsv("template_kredipin.csv", buildTemplateCsv());
    toast.info("Template diunduh", "Isi sesuai kolom, lalu unggah kembali.");
  };

  const handleStart = () => {
    imp.start();
    toast.info("Memproses", "Prediksi batch dijalankan…");
  };

  const handleDownload = () => {
    if (!imp.batch.results.length) return;
    downloadCsv("hasil_prediksi_kredipin.csv", buildResultsCsv(imp.batch.results));
    toast.success("Hasil diunduh", "File CSV hasil prediksi tersimpan.");
  };

  const stepIndex =
    imp.batch.status === "done" || imp.batch.status === "cancelled"
      ? 3
      : imp.batch.status === "running"
        ? 2
        : imp.stage === "validated"
          ? 1
          : 0;

  return (
    <div className={styles.page}>
      <Card padding="md">
        <Stepper steps={["Unggah CSV", "Validasi", "Proses", "Hasil & Unduh"]} current={stepIndex} />
      </Card>

      <UploadPanel
        onFile={imp.handleFile}
        fileName={imp.fileName}
        onDownloadTemplate={handleTemplate}
        disabled={running}
      />

      {imp.stage === "parsing" && (
        <Alert variant="info" icon="refresh">
          Membaca &amp; memvalidasi file…
        </Alert>
      )}

      {imp.stage === "error" && (
        <Alert variant="danger" icon="x-circle" title="Gagal membaca file">
          {imp.parseError}
        </Alert>
      )}

      {showValidation && (
        <ValidationSummary
          validation={imp.validation}
          threshold={imp.threshold}
          onThresholdChange={imp.setThreshold}
          onStart={handleStart}
          onReset={imp.reset}
          canStart={!running}
        />
      )}

      <BatchResults
        batch={imp.batch}
        onCancel={imp.batch.cancel}
        onDownload={handleDownload}
        onReset={imp.reset}
      />

      {(imp.batch.status === "done" || imp.batch.status === "cancelled") && (
        <Alert variant="info" icon="info" title="Disclaimer">
          Hasil prediksi adalah alat bantu pengambilan keputusan berbasis model statistik,
          bukan keputusan akhir. Keputusan kredit final tetap berada pada analis/komite kredit.
        </Alert>
      )}
    </div>
  );
}
