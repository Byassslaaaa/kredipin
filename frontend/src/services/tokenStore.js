/**
 * tokenStore - satu-satunya tempat token sesi disimpan & dibaca.
 *
 * Dipisah dari authService agar apiClient dapat menyisipkan token TANPA
 * mengimpor authService - authService sendiri memakai apiClient, sehingga
 * saling-impor akan menciptakan circular dependency.
 *
 * Catatan keamanan: token disimpan di localStorage agar sesi bertahan saat
 * refresh. Ini membuatnya terbaca oleh JavaScript, sehingga XSS berarti token
 * ikut bocor. Alternatif yang lebih aman adalah cookie httpOnly, namun itu
 * memerlukan perubahan backend (set-cookie + CSRF) dan berada di luar lingkup
 * saat ini. Mitigasi yang berlaku: React meng-escape output secara default dan
 * aplikasi tidak pernah merender HTML mentah dari pengguna.
 */
const KUNCI_TOKEN = "kredipin-token";
const KUNCI_USER = "kredipin-user";

export function simpanSesi(token, user) {
  localStorage.setItem(KUNCI_TOKEN, token);
  localStorage.setItem(KUNCI_USER, JSON.stringify(user));
}

export function ambilToken() {
  return localStorage.getItem(KUNCI_TOKEN);
}

export function ambilUser() {
  try {
    const mentah = localStorage.getItem(KUNCI_USER);
    return mentah ? JSON.parse(mentah) : null;
  } catch {
    // Data rusak -> perlakukan sebagai belum login, jangan sampai crash.
    return null;
  }
}

export function hapusSesi() {
  localStorage.removeItem(KUNCI_TOKEN);
  localStorage.removeItem(KUNCI_USER);
}
