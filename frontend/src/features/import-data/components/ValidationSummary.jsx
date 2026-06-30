import { Alert, Badge, Button, Card, Table } from "@/components/ui";
import ThresholdControl from "@/components/common/ThresholdControl";
import styles from "./ValidationSummary.module.css";

/**
 * ValidationSummary — laporan hasil validasi CSV + kontrol untuk memulai batch.
 */
export default function ValidationSummary({
  validation,
  threshold,
  onThresholdChange,
  onStart,
  onReset,
  canStart,
}) {
  if (!validation) return null;

  const { missingHeaders, extraHeaders, totalRows, validRows, invalidRows } = validation;

  // Header tidak lengkap -> tidak bisa lanjut.
  if (missingHeaders.length > 0) {
    return (
      <Card title="Validasi CSV" icon="alert-triangle">
        <Alert variant="danger" title="Kolom wajib tidak ditemukan">
          File CSV kekurangan kolom berikut:
          <div className={styles.chips}>
            {missingHeaders.map((h) => (
              <code key={h} className={styles.chip}>
                {h}
              </code>
            ))}
          </div>
          Unduh template CSV untuk format yang benar, lalu unggah ulang.
        </Alert>
        <div className={styles.actions}>
          <Button variant="secondary" iconLeft="refresh" onClick={onReset}>
            Unggah ulang
          </Button>
        </div>
      </Card>
    );
  }

  const invalidPreview = invalidRows.slice(0, 8).map((r) => {
    const firstField = Object.keys(r.errors)[0];
    return {
      rowNumber: r.rowNumber,
      field: firstField,
      message: r.errors[firstField],
      jumlah: Object.keys(r.errors).length,
    };
  });

  return (
    <Card title="Hasil Validasi" icon="shield-check">
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalRows.toLocaleString("id-ID")}</span>
          <span className={styles.statLabel}>Total baris</span>
        </div>
        <div className={`${styles.stat} ${styles.ok}`}>
          <span className={styles.statValue}>{validRows.length.toLocaleString("id-ID")}</span>
          <span className={styles.statLabel}>Valid (akan diprediksi)</span>
        </div>
        <div className={`${styles.stat} ${invalidRows.length ? styles.bad : ""}`}>
          <span className={styles.statValue}>{invalidRows.length.toLocaleString("id-ID")}</span>
          <span className={styles.statLabel}>Tidak valid (dilewati)</span>
        </div>
      </div>

      {extraHeaders.length > 0 && (
        <Alert variant="info" icon="info" className={styles.spaced}>
          Kolom tambahan diabaikan: {extraHeaders.map((h) => `“${h}”`).join(", ")}.
        </Alert>
      )}

      {invalidRows.length > 0 && (
        <div className={styles.spaced}>
          <p className={styles.subhead}>
            Contoh baris tidak valid {invalidRows.length > 8 && `(8 dari ${invalidRows.length})`}
          </p>
          <Table
            columns={[
              { key: "rowNumber", header: "Baris", mono: true, width: "80px" },
              { key: "field", header: "Kolom" },
              { key: "message", header: "Masalah" },
              {
                key: "jumlah",
                header: "Total error",
                align: "center",
                render: (r) => <Badge variant="danger" size="sm">{r.jumlah}</Badge>,
              },
            ]}
            data={invalidPreview}
            getRowKey={(r) => r.rowNumber}
          />
        </div>
      )}

      {validRows.length > 0 ? (
        <div className={styles.runBlock}>
          <ThresholdControl value={threshold} onChange={onThresholdChange} />
          <div className={styles.actions}>
            <Button variant="ghost" iconLeft="refresh" onClick={onReset}>
              Ganti file
            </Button>
            <Button iconLeft="trending-up" onClick={() => onStart()} disabled={!canStart}>
              Mulai Prediksi ({validRows.length.toLocaleString("id-ID")} baris)
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="warning" icon="alert-triangle" className={styles.spaced}>
          Tidak ada baris valid untuk diprediksi. Perbaiki data lalu unggah ulang.
        </Alert>
      )}
    </Card>
  );
}
