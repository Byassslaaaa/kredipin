/**
 * predictService — prediksi kelayakan pinjaman (POST /predict).
 *
 * Endpoint SAMA dipakai untuk prediksi tunggal (Analisis Nasabah Baru) maupun
 * batch (Import Data Nasabah, iterasi dari sisi klien). Tidak ada endpoint baru.
 */
import apiClient from "./apiClient";

/**
 * Kirim satu pengajuan untuk diprediksi.
 *
 * @param {object} payload  20 fitur (uang IDR) + opsional `threshold` (0..1).
 * @param {object} opts     { signal } untuk pembatalan (AbortController).
 * @returns {Promise<PredictResponse>} keputusan, probabilitas_layak, confidence,
 *          threshold, faktor[5], disclaimer, id_riwayat, waktu.
 */
export async function postPredict(payload, { signal } = {}) {
  const { data } = await apiClient.post("/predict", payload, { signal });
  return data;
}
