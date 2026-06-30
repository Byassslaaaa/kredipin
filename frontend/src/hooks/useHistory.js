import { useCallback, useEffect, useState } from "react";
import { getHistory } from "@/services/historyService";

/**
 * useHistory — ambil riwayat prediksi terbaru (GET /history?limit=N).
 *
 * @param {object} opts { limit = 20, auto = true }
 * @returns { data, loading, error, refetch }
 */
export default function useHistory({ limit = 20, auto = true } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState(null);

  const refetch = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getHistory({ limit, signal });
        setData(result);
        return result;
      } catch (err) {
        if (err?.name !== "CanceledError") setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (!auto) return undefined;
    const controller = new AbortController();
    refetch(controller.signal);
    return () => controller.abort();
  }, [auto, refetch]);

  return { data, loading, error, refetch };
}
