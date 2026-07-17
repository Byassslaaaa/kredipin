import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navigate, useLocation } from "react-router-dom";
import { Alert, Button, Icon } from "@/components/ui";
import { TextField } from "@/components/ui/form";
import { useAuth } from "@/features/auth/AuthContext";
import { APP } from "@/constants/app";
import styles from "./Login.module.css";

const EASE = [0.32, 0.72, 0, 1];

/**
 * Login — gerbang masuk sistem.
 *
 * Tata letak split: panel identitas (kiri) + form (kanan). Sengaja BUKAN kartu
 * melayang di tengah layar — pola itu generik dan menyia-nyiakan ruang untuk
 * menjelaskan sistem apa yang sedang dimasuki.
 *
 * Tidak memakai elemen <form> HTML; submit lewat handler onClick (CLAUDE.md).
 */
export default function Login() {
  const { login, sudahLogin } = useAuth();
  const lokasi = useLocation();
  const kurangiGerak = useReducedMotion();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState(null);
  const [proses, setProses] = useState(false);

  // Sudah punya sesi -> kembalikan ke halaman yang tadi hendak dibuka.
  if (sudahLogin) return <Navigate to={lokasi.state?.dari || "/"} replace />;

  const masuk = async () => {
    if (!username.trim() || !password) {
      setGalat("Username dan password wajib diisi.");
      return;
    }
    setProses(true);
    setGalat(null);
    try {
      await login(username.trim(), password);
      // Navigasi ditangani oleh guard `sudahLogin` di atas saat state berubah.
    } catch (err) {
      setGalat(err?.message || "Gagal masuk. Coba lagi.");
      setPassword("");
    } finally {
      setProses(false);
    }
  };

  // Enter di field password = submit (kebiasaan yang diharapkan pengguna).
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !proses) masuk();
  };

  return (
    <div className={styles.layar}>
      {/* Panel identitas */}
      <aside className={styles.panel}>
        <motion.div
          className={styles.panelIsi}
          initial={kurangiGerak ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className={styles.merek}>
            <img src="/brand/logo-white.png" alt="" className={styles.logo} width={34} height={34} />
            <span className={styles.merekNama}>{APP.name}</span>
          </div>

          <h1 className={styles.judul}>
            Keputusan kredit yang <em>dapat dijelaskan</em>.
          </h1>
          <p className={styles.deskripsi}>{APP.tagline}</p>

          <ul className={styles.poin}>
            <li>
              <Icon name="gauge" size={16} />
              <span>Prediksi kelayakan berbasis XGBoost pada 50.000 data historis</span>
            </li>
            <li>
              <Icon name="trending-up" size={16} />
              <span>Lima faktor terbesar di balik setiap keputusan (SHAP)</span>
            </li>
            <li>
              <Icon name="shield-check" size={16} />
              <span>Setiap penilaian tercatat lengkap dengan pemiliknya</span>
            </li>
          </ul>

          <p className={styles.catatan}>
            Hasil sistem ini adalah <strong>alat bantu</strong> — keputusan kredit final tetap
            berada pada analis dan komite kredit.
          </p>
        </motion.div>
      </aside>

      {/* Form */}
      <main className={styles.formKolom}>
        <motion.div
          className={styles.formIsi}
          initial={kurangiGerak ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
        >
          <div className={styles.formKepala}>
            <p className={styles.kicker}>Masuk</p>
            <h2 className={styles.formJudul}>Selamat datang kembali</h2>
            <p className={styles.formSub}>Gunakan akun analis atau admin Anda.</p>
          </div>

          {galat && (
            <Alert variant="danger" icon="x-circle">
              {galat}
            </Alert>
          )}

          <div className={styles.medan}>
            <TextField
              label="Username"
              value={username}
              autoComplete="username"
              placeholder="mis. analis"
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onKeyDown}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              required
            />
          </div>

          <Button
            size="lg"
            iconRight="chevron-right"
            onClick={masuk}
            loading={proses}
            type="button"
            className={styles.tombol}
          >
            Masuk
          </Button>

          <p className={styles.bantuan}>
            Belum punya akun? Hubungi administrator sistem.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
