/**
 * authService - login, pemulihan sesi, dan logout.
 * Dibangun di atas apiClient (token disisipkan otomatis oleh interceptor).
 */
import apiClient from "./apiClient";
import { simpanSesi, hapusSesi, ambilUser, ambilToken } from "./tokenStore";

/** Tukar kredensial dengan token sesi. @returns user */
export async function login(username, password) {
  const { data } = await apiClient.post("/auth/login", { username, password });
  simpanSesi(data.access_token, data.user);
  return data.user;
}

/**
 * Pastikan token yang tersimpan masih sah di server.
 * Token bisa saja kedaluwarsa atau akunnya dinonaktifkan sejak login terakhir,
 * sehingga keberadaan token di localStorage TIDAK cukup jadi bukti sesi valid.
 */
export async function pulihkanSesi() {
  if (!ambilToken()) return null;
  try {
    const { data } = await apiClient.get("/auth/me");
    return data;
  } catch {
    hapusSesi();
    return null;
  }
}

export function logout() {
  hapusSesi();
}

export { ambilUser };
