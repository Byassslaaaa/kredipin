import { useCallback, useEffect, useState } from "react";
import { getHealth } from "@/services/healthService";

/**
 * useHealth — pantau status kesehatan backend (GET /health).
 *
 * @param {object} opts { auto = true } ambil otomatis saat mount.
 * @returns { data, loading, error, refetch }
 */
export default function useHealth({ auto = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState(null);

  const refetch = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getHealth({ signal });
      setData(result);
      return result;
    } catch (err) {
      if (err?.name !== "CanceledError") setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auto) return undefined;
    const controller = new AbortController();
    refetch(controller.signal);
    return () => controller.abort();
  }, [auto, refetch]);

  return { data, loading, error, refetch };
}
