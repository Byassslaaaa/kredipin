import { useContext } from "react";
import { ToastContext } from "./ToastContext";

/** Akses API toast. Harus berada di dalam <ToastProvider>. */
export default function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus digunakan di dalam <ToastProvider>.");
  }
  return ctx;
}
