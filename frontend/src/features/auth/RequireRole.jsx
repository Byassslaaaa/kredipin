import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ruteUntukPeran } from "@/constants/navigation";
import { useAuth } from "./AuthContext";

/**
 * RequireRole - gerbang rute berbasis peran.
 *
 * Menyembunyikan menu di sidebar TIDAK cukup: pengguna bisa mengetik URL
 * langsung. Guard ini menolak rute yang bukan haknya. Penegakan sebenarnya
 * tetap di backend (403) - ini lapisan UX agar pengguna tidak terdampar di
 * halaman yang datanya tak akan pernah dimuat.
 */
export default function RequireRole() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const boleh = ruteUntukPeran(user?.peran);
  // Rute dev/dinamis di luar daftar navigasi dibiarkan lewat.
  const terdaftar = ruteUntukPeran("analis").concat(ruteUntukPeran("admin"));
  const diatur = terdaftar.includes(pathname);

  if (diatur && !boleh.includes(pathname)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
