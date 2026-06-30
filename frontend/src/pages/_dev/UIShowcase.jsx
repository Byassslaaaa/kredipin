import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  RadioGroup,
  SectionHeader,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  Table,
  TextField,
  useToast,
} from "@/components/ui";
import styles from "./UIShowcase.module.css";

/**
 * Halaman dev untuk meninjau seluruh komponen UI (M2). Tidak masuk navigasi;
 * dipakai untuk QA visual & dokumentasi hidup design system.
 */
export default function UIShowcase() {
  const toast = useToast();
  const [text, setText] = useState("");
  const [money, setMoney] = useState("");
  const [produk, setProduk] = useState("");
  const [jaminan, setJaminan] = useState("Ada Jaminan");

  const tableData = [
    { id: 1, nama: "Pengajuan A", prob: 0.93, status: "Layak" },
    { id: 2, nama: "Pengajuan B", prob: 0.08, status: "Tidak Layak" },
  ];

  return (
    <div className={styles.page}>
      <SectionHeader
        title="UI Showcase (Dev)"
        description="Tinjauan komponen reusable M2. Halaman ini tidak masuk navigasi produksi."
        actions={<Button variant="secondary" iconLeft="refresh">Aksi</Button>}
      />

      <Card title="Buttons" subtitle="Varian, ukuran, status">
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success" iconLeft="check-circle">Sukses</Button>
          <Button variant="danger" iconLeft="x-circle">Hapus</Button>
          <Button loading>Memuat</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" iconRight="chevron-right">Large</Button>
        </div>
      </Card>

      <Card title="Badges">
        <div className={styles.row}>
          <Badge variant="success" icon="check-circle">Layak</Badge>
          <Badge variant="danger" icon="x-circle">Tidak Layak</Badge>
          <Badge variant="primary" dot>Inti</Badge>
          <Badge variant="warning">Peringatan</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="neutral">Netral</Badge>
        </div>
      </Card>

      <div className={styles.grid4}>
        <StatCard label="Total Data" value="50.000" icon="database" tone="primary" hint="baris pinjaman" />
        <StatCard label="Akurasi" value="92,74" unit="%" icon="gauge" tone="success" trend={{ value: "tinggi", direction: "up" }} />
        <StatCard label="Ditolak" value="22.071" icon="x-circle" tone="danger" />
        <StatCard label="Memuat" value="" icon="trending-up" tone="warning" loading />
      </div>

      <Card title="ProgressBar + Threshold">
        <div className={styles.stack}>
          <ProgressBar value={93} tone="success" threshold={50} thresholdLabel="Ambang 50%" />
          <ProgressBar value={8} tone="danger" threshold={50} />
          <ProgressBar value={62} tone="primary" size="lg" />
        </div>
      </Card>

      <Card title="Form controls">
        <div className={styles.grid2}>
          <TextField label="Nama" value={text} onChange={(e) => setText(e.target.value)} placeholder="Masukkan teks" hint="Contoh hint" required />
          <TextField label="Jumlah Pinjaman" type="number" value={money} onChange={(e) => setMoney(e.target.value)} prefix="Rp" placeholder="0" />
          <Select label="Tipe Produk" value={produk} onChange={(e) => setProduk(e.target.value)} placeholder="Pilih produk" options={["Kartu Kredit", "Kredit Berjalan", "Pinjaman Pribadi"]} error={!produk ? "Wajib dipilih" : undefined} />
          <RadioGroup label="Jaminan" value={jaminan} onChange={setJaminan} inline options={["Ada Jaminan", "Tanpa Jaminan"]} />
        </div>
      </Card>

      <Card title="Alerts">
        <div className={styles.stack}>
          <Alert variant="info" title="Informasi">Pesan informasi kontekstual.</Alert>
          <Alert variant="success" title="Berhasil">Operasi berhasil dijalankan.</Alert>
          <Alert variant="warning" title="Perhatian">Periksa kembali data Anda.</Alert>
          <Alert variant="danger" title="Gagal" onClose={() => {}}>Terjadi kesalahan.</Alert>
        </div>
      </Card>

      <Card title="Toast">
        <div className={styles.row}>
          <Button variant="success" onClick={() => toast.success("Berhasil", "Prediksi tersimpan.")}>Toast sukses</Button>
          <Button variant="danger" onClick={() => toast.error("Gagal", "Server tidak merespons.")}>Toast error</Button>
          <Button variant="secondary" onClick={() => toast.info("Info", "Sekadar pemberitahuan.")}>Toast info</Button>
        </div>
      </Card>

      <Card title="Table" padding="none">
        <Table
          columns={[
            { key: "nama", header: "Pengajuan" },
            { key: "prob", header: "Probabilitas", align: "right", mono: true, render: (r) => `${(r.prob * 100).toFixed(1)}%` },
            {
              key: "status",
              header: "Keputusan",
              align: "center",
              render: (r) => (
                <Badge variant={r.status === "Layak" ? "success" : "danger"}>{r.status}</Badge>
              ),
            },
          ]}
          data={tableData}
          getRowKey={(r) => r.id}
        />
      </Card>

      <div className={styles.grid2}>
        <Card title="Skeleton & Spinner">
          <div className={styles.stack}>
            <Skeleton variant="text" count={3} />
            <Skeleton variant="rect" height="60px" />
            <Spinner label="Memuat data…" />
          </div>
        </Card>
        <Card title="EmptyState">
          <EmptyState icon="database" title="Belum ada data" description="Tidak ada catatan untuk ditampilkan." action={<Button size="sm">Tambah</Button>} />
        </Card>
      </div>
    </div>
  );
}
