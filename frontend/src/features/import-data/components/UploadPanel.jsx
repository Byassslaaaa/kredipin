import { useRef, useState } from "react";
import { Button, Card, Icon } from "@/components/ui";
import styles from "./UploadPanel.module.css";

/**
 * UploadPanel — area unggah CSV (drag & drop atau pilih file) + unduh template.
 */
export default function UploadPanel({ onFile, fileName, onDownloadTemplate, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <Card
      title="Unggah Data Nasabah (CSV)"
      subtitle="Tiap baris akan diprediksi memakai model yang sama"
      icon="upload"
      actions={
        <Button variant="ghost" size="sm" iconLeft="download" onClick={onDownloadTemplate} type="button">
          Template CSV
        </Button>
      }
    >
      <div
        className={`${styles.zone} ${dragOver ? styles.over : ""} ${disabled ? styles.disabled : ""}`}
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
        aria-label="Unggah file CSV"
      >
        <span className={styles.icon} aria-hidden="true">
          <Icon name="upload" size={28} />
        </span>
        <p className={styles.title}>
          {fileName ? (
            <>
              <strong>{fileName}</strong> — klik untuk ganti file
            </>
          ) : (
            <>
              Tarik & lepas file CSV di sini, atau <strong>klik untuk memilih</strong>
            </>
          )}
        </p>
        <p className={styles.hint}>
          Header wajib sesuai template (20 kolom fitur). Nilai uang dalam Rupiah.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className={styles.input}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}
