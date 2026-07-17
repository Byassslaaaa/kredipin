import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { useAuth } from "./AuthContext";

/**
 * RequireAuth — gerbang rute terproteksi.
 *
 * Menahan render sampai pemulihan sesi selesai. Tanpa penahanan ini, pengguna
 * yang sudah login akan terlempar sesaat ke /login saat refresh, karena
 * verifikasi token ke server bersifat asinkron.
 */
export default function RequireAuth() {
  const { sudahLogin, memulihkan } = useAuth();
  const lokasi = useLocation();

  if (memulihkan) return <PageLoader />;

  // Simpan tujuan semula agar setelah login pengguna kembali ke sana,
  // bukan selalu dilempar ke beranda.
  if (!sudahLogin) return <Navigate to="/login" replace state={{ dari: lokasi.pathname }} />;

  return <Outlet />;
}
