import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kredipin-theme";

/**
 * useTheme — kelola tema light/dark.
 *
 * Tema disimpan di localStorage dan diterapkan ke <html data-theme="...">,
 * dibaca oleh token CSS. Default light (sesuai rencana M1); dark sudah disiapkan.
 */
function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme, setTheme };
}
