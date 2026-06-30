/**
 * healthService — status kesehatan backend (GET /health).
 */
import apiClient from "./apiClient";

/**
 * @returns {Promise<{status, model_dimuat, database_ok, versi, threshold_aktif}>}
 */
export async function getHealth({ signal } = {}) {
  const { data } = await apiClient.get("/health", { signal });
  return data;
}
