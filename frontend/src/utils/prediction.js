/**
 * Helper terkait ambang keputusan / kemurnian model.
 *
 * XGBClassifier.predict() memakai patokan 0.5 pada probabilitas kelas positif,
 * sehingga keputusan "murni XGBoost" (tanpa ambang batas kustom) setara dengan
 * `probabilitas_layak >= 0.5`. Nilai ambang ada di response API (`threshold`),
 * jadi tidak perlu perubahan backend/kontrak API.
 */
export const NATIVE_THRESHOLD = 0.5;

/** True jika ambang = patokan native 50% → keputusan murni XGBoost. */
export function isMurniXgboost(threshold) {
  return Math.abs(Number(threshold) - NATIVE_THRESHOLD) < 1e-6;
}
