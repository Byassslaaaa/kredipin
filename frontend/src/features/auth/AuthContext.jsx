import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginApi, logout as logoutApi, pulihkanSesi } from "@/services/authService";
import { ambilUser } from "@/services/tokenStore";

/**
 * AuthContext — satu sumber kebenaran status sesi untuk seluruh aplikasi.
 *
 * Context (bukan hook lokal seperti useTheme) karena banyak komponen di cabang
 * berbeda perlu status yang SAMA: router, topbar, dan halaman terproteksi.
 * Hook berstate lokal akan memberi tiap pemanggil salinan sendiri yang bisa
 * saling bertentangan.
 */
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  // Tebak awal dari localStorage agar tidak berkedip ke halaman login saat
  // refresh; kebenarannya diverifikasi ke server pada efek di bawah.
  const [user, setUser] = useState(() => ambilUser());
  const [memulihkan, setMemulihkan] = useState(true);

  useEffect(() => {
    let batal = false;
    (async () => {
      const nyata = await pulihkanSesi();
      if (!batal) {
        setUser(nyata);
        setMemulihkan(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const u = await loginApi(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    logoutApi();
    setUser(null);
  }, []);

  const nilai = useMemo(
    () => ({ user, login, logout, memulihkan, sudahLogin: Boolean(user) }),
    [user, login, logout, memulihkan],
  );

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
