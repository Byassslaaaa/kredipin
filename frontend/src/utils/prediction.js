/**
 * Helper terkait keputusan prediksi.
 *
 * Keputusan "native" XGBoost = keputusan model tanpa ambang batas kustom.
 * XGBClassifier.predict() memakai patokan 0.5 pada probabilitas kelas positif,
 * sehingga keputusan tanpa ambang batas setara dengan `probabilitas_layak >= 0.5`.
 * Nilai ini diturunkan sepenuhnya dari `probabilitas_layak` pada response API,
 * jadi tidak perlu perubahan backend/kontrak API.
 */
export const NATIVE_THRESHOLD = 0.5;

/** Keputusan XGBoost tanpa ambang batas kustom (patokan native 50%). */
export function nativeDecision(probabilitasLayak) {
  return Number(probabilitasLayak) >= NATIVE_THRESHOLD ? "Layak" : "Tidak Layak";
}
