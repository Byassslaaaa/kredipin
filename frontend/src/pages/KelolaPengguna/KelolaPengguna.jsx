import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Table, useToast } from "@/components/ui";
import { Select, TextField } from "@/components/ui/form";
import { useAuth } from "@/features/auth/AuthContext";
import { createUser, getUsers, updateUser } from "@/services/dashboardService";
import { formatDateTime } from "@/utils/format";
import styles from "./KelolaPengguna.module.css";

const KOSONG = { username: "", nama: "", password: "", peran: "analis" };

/**
 * KelolaPengguna — halaman admin untuk membuat & mengatur akun.
 *
 * TIDAK ADA tombol hapus, dan itu disengaja: menghapus baris user akan memutus
 * jejak audit — kolom `dibuat_oleh` pada riwayat prediksi menjadi menggantung,
 * padahal justru itu yang dibutuhkan auditor untuk menjawab "siapa yang
 * memutuskan ini?". Akun dinonaktifkan, bukan dihapus.
 */
export default function KelolaPengguna() {
  const { user: saya } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(KOSONG);
  const [proses, setProses] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getUsers());
    } catch (e) {
      toast.error("Gagal memuat pengguna", e?.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    muat();
  }, [muat]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const buat = async () => {
    setProses(true);
    try {
      const baru = await createUser(form);
      toast.success("Pengguna dibuat", `${baru.nama} (${baru.peran}) siap dipakai.`);
      setForm(KOSONG);
      muat();
    } catch (e) {
      toast.error("Gagal membuat pengguna", e?.message);
    } finally {
      setProses(false);
    }
  };

  const ubahAktif = async (u) => {
    try {
      await updateUser(u.id, { aktif: !u.aktif });
      toast.success(u.aktif ? "Akun dinonaktifkan" : "Akun diaktifkan", u.username);
      muat();
    } catch (e) {
      toast.error("Gagal mengubah status", e?.message);
    }
  };

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="info">
        Akun <strong>dinonaktifkan</strong>, tidak dihapus. Menghapus pengguna akan memutus jejak
        audit pada riwayat penilaian yang pernah ia buat. Akun nonaktif langsung kehilangan akses,
        tanpa menunggu sesinya berakhir.
      </Alert>

      <Card title="Tambah Pengguna" subtitle="Buat akun analis atau admin" icon="user-plus">
        <div className={styles.formGrid}>
          <TextField
            label="Username"
            value={form.username}
            placeholder="huruf kecil, angka, titik/strip"
            hint="Dipakai untuk login; tidak dapat diubah setelah dibuat."
            onChange={(e) => set("username", e.target.value.toLowerCase())}
            required
          />
          <TextField
            label="Nama Lengkap"
            value={form.nama}
            placeholder="mis. Budi Santoso"
            onChange={(e) => set("nama", e.target.value)}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            placeholder="minimal 8 karakter"
            onChange={(e) => set("password", e.target.value)}
            required
          />
          <Select
            label="Peran"
            value={form.peran}
            options={[
              { value: "analis", label: "Analis — menilai pengajuan kredit" },
              { value: "admin", label: "Admin — kelola sistem & pengawasan" },
            ]}
            onChange={(e) => set("peran", e.target.value)}
            required
          />
        </div>
        <div className={styles.formAksi}>
          <Button
            iconLeft="user-plus"
            onClick={buat}
            loading={proses}
            disabled={!form.username || !form.nama || form.password.length < 8}
            type="button"
          >
            Buat Pengguna
          </Button>
        </div>
      </Card>

      <Card
        title="Daftar Pengguna"
        subtitle={loading ? "Memuat…" : `${rows.length} akun terdaftar`}
        icon="users"
        padding="none"
      >
        <Table
          columns={[
            { key: "username", header: "Username", mono: true },
            { key: "nama", header: "Nama" },
            {
              key: "peran",
              header: "Peran",
              render: (r) => (
                <Badge variant={r.peran === "admin" ? "primary" : "neutral"} size="sm">
                  <span className={styles.peran}>{r.peran}</span>
                </Badge>
              ),
            },
            {
              key: "aktif",
              header: "Status",
              render: (r) => (
                <Badge variant={r.aktif ? "success" : "danger"} size="sm">
                  {r.aktif ? "Aktif" : "Nonaktif"}
                </Badge>
              ),
            },
            {
              key: "created_at",
              header: "Dibuat",
              render: (r) => formatDateTime(r.created_at),
            },
            {
              key: "aksi",
              header: "",
              align: "right",
              render: (r) => (
                <div className={styles.aksiSel}>
                  {r.username === saya?.username ? (
                    // Backend juga menolaknya (400) — ini sekadar agar tombolnya
                    // tidak menggoda untuk diklik.
                    <span className={styles.diri}>akun Anda</span>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => ubahAktif(r)} type="button">
                      {r.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  )}
                </div>
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
