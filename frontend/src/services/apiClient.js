/**
 * apiClient - instance Axios terpusat untuk seluruh komunikasi ke backend KrediPin.
 *
 * - baseURL dibaca dari VITE_API_BASE_URL (.env), default http://localhost:8000.
 * - Interceptor menormalkan error backend ({error, detail, status_code}) menjadi
 *   objek ApiError yang konsisten sehingga komponen/hook tidak perlu tahu bentuk Axios.
 *
 * Catatan kontrak (CLAUDE.md §10): frontend MENGIKUTI backend. Tidak ada endpoint
 * baru; service lain (predict/history/health) dibangun di atas instance ini.
 */
import axios from "axios";
import { ambilToken, hapusSesi } from "./tokenStore";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Bentuk error yang seragam untuk seluruh aplikasi.
 */
export class ApiError extends Error {
  constructor({
    message,
    status,
    detail,
    isNetwork = false,
    isValidation = false,
    isTimeout = false,
    isAuth = false,
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.detail = detail ?? null;
    this.isNetwork = isNetwork;
    this.isValidation = isValidation;
    this.isTimeout = isTimeout;
    this.isAuth = isAuth;
  }
}

/**
 * Ubah error Axios menjadi ApiError yang ramah ditampilkan ke pengguna.
 */
function normalizeError(error) {
  // Timeout (axios membatalkan karena melewati batas waktu).
  if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
    return new ApiError({
      message: "Permintaan melebihi batas waktu (timeout). Server mungkin sibuk - silakan coba lagi.",
      isNetwork: true,
      isTimeout: true,
    });
  }

  // Tidak ada response = masalah jaringan / server mati.
  if (!error.response) {
    return new ApiError({
      message:
        "Tidak dapat terhubung ke server. Pastikan backend KrediPin berjalan di " +
        `${API_BASE_URL}.`,
      isNetwork: true,
    });
  }

  const { status, data } = error.response;
  // Backend memakai format {error, detail, status_code}.
  const backendMessage = data?.error || data?.message;
  const detail = data?.detail ?? null;

  const messages = {
    401: "Sesi berakhir atau kredensial tidak valid. Silakan masuk kembali.",
    403: "Anda tidak memiliki hak akses untuk tindakan ini.",
    429: "Terlalu banyak permintaan. Mohon tunggu sebentar lalu coba lagi.",
    422: "Data yang dikirim tidak valid. Periksa kembali isian Anda.",
    404: "Sumber daya tidak ditemukan.",
    500: "Terjadi kesalahan di server saat memproses permintaan.",
    503: "Layanan model belum siap. Coba beberapa saat lagi.",
  };

  return new ApiError({
    message: backendMessage || messages[status] || "Terjadi kesalahan tak terduga.",
    status,
    detail,
    isValidation: status === 422,
    isAuth: status === 401,
  });
}

// Sisipkan token pada setiap permintaan. Dibaca ULANG tiap kali (bukan sekali
// saat modul dimuat) agar login/logout langsung berlaku tanpa reload halaman.
apiClient.interceptors.request.use((config) => {
  const token = ambilToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = normalizeError(error);

    // Token kedaluwarsa/dicabut -> bersihkan sesi basi supaya UI tidak terjebak
    // menampilkan "sudah login" padahal server menolak. Endpoint login sendiri
    // dikecualikan: 401 di sana berarti "password salah", bukan sesi berakhir.
    const dariLogin = error.config?.url?.includes("/auth/login");
    if (apiError.isAuth && !dariLogin) hapusSesi();

    return Promise.reject(apiError);
  },
);

export default apiClient;
