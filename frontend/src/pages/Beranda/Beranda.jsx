import { useAuth } from "@/features/auth/AuthContext";
import BerandaAnalis from "./BerandaAnalis";
import BerandaAdmin from "./BerandaAdmin";

/**
 * Beranda - memilih tampilan sesuai peran.
 *
 * Analis dan admin punya pekerjaan yang berbeda, sehingga beranda yang sama
 * tidak melayani keduanya: metrik model tidak dapat ditindaklanjuti analis,
 * sementara ringkasan penilaian pribadi tidak relevan bagi admin.
 */
export default function Beranda() {
  const { user } = useAuth();
  return user?.peran === "admin" ? <BerandaAdmin /> : <BerandaAnalis />;
}
