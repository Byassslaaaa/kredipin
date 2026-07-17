import { useCallback } from "react";
import { Alert, Badge, Card, Table } from "@/components/ui";
import useResource from "@/hooks/useResource";
import { getAudit } from "@/services/dashboardService";
import { formatDateTime } from "@/utils/format";
import styles from "./JejakAudit.module.css";

/** Label ramah untuk kode aksi. */
const LABEL_AKSI = {
  ubah_kebijakan_ambang: "Ubah ambang kebijakan",
  buat_pengguna: "Buat pengguna",
  ubah_pengguna: "Ubah pengguna",
};

/**
 * JejakAudit - catatan tindakan istimewa (khusus admin, hanya baca).
 *
 * Yang dicatat adalah tindakan yang MENGUBAH aturan atau akses - bukan prediksi
 * biasa. Riwayat prediksi punya jejaknya sendiri lewat kolom pemilik.
 *
 * Tidak ada aksi ubah/hapus di halaman ini, dan itu bukan kelalaian: log yang
 * dapat disunting tidak bernilai sebagai bukti.
 */
export default function JejakAudit() {
  const fetcher = useCallback(() => getAudit(200), []);
  const { data, loading, error } = useResource(fetcher);

  const rows = data || [];

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="shield-check">
        Catatan ini bersifat <strong>hanya-tambah</strong>: tidak dapat diubah maupun dihapus dari
        aplikasi - termasuk oleh admin. Log yang dapat disunting tidak bernilai sebagai bukti.
      </Alert>

      {error && (
        <Alert variant="danger" icon="x-circle" title="Gagal memuat jejak audit">
          {error.message}
        </Alert>
      )}

      <Card
        title="Jejak Audit"
        subtitle={loading ? "Memuat…" : `${rows.length} tindakan tercatat (terbaru di atas)`}
        icon="history"
        padding="none"
      >
        <Table
          columns={[
            { key: "waktu", header: "Waktu", render: (r) => formatDateTime(r.waktu) },
            {
              key: "aktor",
              header: "Pelaku",
              render: (r) => <Badge variant="primary" size="sm">{r.aktor}</Badge>,
            },
            {
              key: "aksi",
              header: "Tindakan",
              render: (r) => <span className={styles.aksi}>{LABEL_AKSI[r.aksi] || r.aksi}</span>,
            },
            {
              key: "target",
              header: "Objek",
              render: (r) => r.target || <span className={styles.kosong}>-</span>,
            },
            {
              key: "perubahan",
              header: "Perubahan",
              render: (r) =>
                r.nilai_lama || r.nilai_baru ? (
                  <span className={styles.perubahan}>
                    {r.nilai_lama && <span className={styles.lama}>{r.nilai_lama}</span>}
                    {r.nilai_lama && r.nilai_baru && <span className={styles.panah}>→</span>}
                    {r.nilai_baru && <span className={styles.baru}>{r.nilai_baru}</span>}
                  </span>
                ) : (
                  <span className={styles.kosong}>-</span>
                ),
            },
          ]}
          data={rows}
          getRowKey={(r) => r.id}
        />
      </Card>
    </div>
  );
}
