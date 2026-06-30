import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { ToastContext } from "./ToastContext";
import styles from "./Toast.module.css";

const ICONS = {
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "x-circle",
};

/**
 * ToastProvider — menyediakan notifikasi global (pojok kanan atas).
 *
 * API (lewat useToast):
 *   toast.show({ variant, title, message, duration })
 *   toast.success(title, message?) / toast.error(...) / toast.info(...) / toast.warning(...)
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ variant = "info", title, message, duration = 4000 }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, variant, title, message }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ variant: "success", title, message }),
      error: (title, message) => show({ variant: "danger", title, message, duration: 6000 }),
      info: (title, message) => show({ variant: "info", title, message }),
      warning: (title, message) => show({ variant: "warning", title, message }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.container} role="region" aria-label="Notifikasi" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`${styles.toast} ${styles[t.variant]}`}
            >
              <span className={styles.icon} aria-hidden="true">
                <Icon name={ICONS[t.variant]} size={20} />
              </span>
              <div className={styles.content}>
                {t.title && <p className={styles.title}>{t.title}</p>}
                {t.message && <p className={styles.message}>{t.message}</p>}
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(t.id)}
                aria-label="Tutup notifikasi"
              >
                <Icon name="x" size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
