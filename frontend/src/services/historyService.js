/**
 * historyService — riwayat prediksi terbaru (GET /history?limit=N).
 */
import apiClient from "./apiClient";

/**
 * @param {number} limit  jumlah baris (backend membatasi 1..100).
 * @returns {Promise<Array<{id, waktu, keputusan, probabilitas_layak, confidence, threshold}>>}
 */
export async function getHistory({ limit = 20, signal } = {}) {
  const { data } = await apiClient.get("/history", { params: { limit }, signal });
  return data;
}
