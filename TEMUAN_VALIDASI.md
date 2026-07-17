# Catatan Temuan Validasi Logic — KrediPin

> Catatan untuk **presentasi & Q&A dosen**. Berisi hasil pengujian logic aplikasi
> terhadap API yang berjalan (`http://157.66.9.7:8008`) dan terhadap dataset asli
> (`data.csv`), beserta perbaikan yang dilakukan.
>
> **Nilai jual utama:** temuan ini didapat dari **menguji sistem sendiri**, bukan
> menyalin teori. Ini persis CPMK DASD — *"mampu menganalisis permasalahan pada
> keamanan teknologi informasi dalam konteks pengembangan aplikasi sains data."*

---

## Ringkasan

| # | Temuan | Tingkat | Status |
|---|--------|---------|--------|
| 1 | Rasio (nilai turunan) diterima sebagai input bebas → keputusan dapat dimanipulasi | 🔴 Kritis | ✅ Diperbaiki |
| 2 | Ambang keputusan dikendalikan klien → model dapat di-bypass total | 🔴 Kritis | ✅ Diperbaiki |
| 3 | `confidence` salah arti saat ambang ≠ 0.5 | 🟠 Sedang | ✅ Diperbaiki |
| 4 | Validasi input (rentang & enum) | ✅ Sudah baik | — |

---

## Temuan 1 — Rasio dapat dimanipulasi (KRITIS)

### Masalah
Ketiga `rasio_*` adalah **nilai turunan** (hutang ÷ pendapatan), tetapi API
menerimanya sebagai **input bebas**. Tombol "Hitung otomatis" hanya opsional.
Akibatnya pengguna dapat mengirim rasio yang **bertentangan dengan data dasar
yang ia isi sendiri**, dan sistem menerimanya tanpa protes.

Ini berbahaya karena `rasio_hutang_terhadap_pendapatan` adalah **fitur terpenting
ke-3** pada model.

### Bukti eksperimen
Nasabah **sama persis** (hutang Rp270 jt, pendapatan Rp900 jt → rasio sebenarnya
**0,30**), hanya angka rasio yang diketik diubah:

| `rasio_hutang` dikirim | Keputusan | Probabilitas |
|---|---|---|
| **0.30** (jujur, sesuai data) | **Layak** | **100,0%** |
| 2.0 (mengada-ada) | **Tidak Layak** | 0,3% |
| 5.0 | Tidak Layak | 0,3% |
| 9.9 | Tidak Layak | 0,3% |

→ Keputusan **berbalik total** hanya dari satu angka ketikan.

### Kaitan dengan laporan
Ini **persis** risiko *"Input tidak divalidasi / manipulasi input"* yang tercantum
pada tabel Analisis Keamanan (§13) — dan ternyata belum termitigasi.

### Bukti SESUDAH perbaikan (diuji ulang ke API live)
Eksploit yang sama diulang setelah perbaikan ter-deploy:

| `rasio_hutang` dikirim | SEBELUM | **SESUDAH** |
|---|---|---|
| 0.30 (jujur) | Layak 100,0% | Layak 100,0% |
| 2.0 | Tidak Layak 0,3% ❌ | **Layak 100,0%** ✅ |
| 5.0 | Tidak Layak 0,3% ❌ | **Layak 100,0%** ✅ |
| 9.9 | Tidak Layak 0,3% ❌ | **Layak 100,0%** ✅ |

→ Seluruh hasil **identik**: nilai kiriman klien tidak lagi berpengaruh sama
sekali. Celah tertutup, diverifikasi pada sistem yang berjalan.

Ambang ekstrem juga terbukti ditolak: `threshold=0.0` → **HTTP 422**.

### Perbaikan
Rasio kini **dihitung server** dari field dasar; nilai kiriman klien diabaikan.

**Formula dibongkar ulang dari `data.csv`** (bukan ditebak):

| Rasio | Formula | Verifikasi |
|---|---|---|
| `rasio_hutang` | `hutang_saat_ini ÷ pendapatan_tahunan` | 5.000/5.000 cocok |
| `rasio_pinjaman` | `jumlah_pinjaman ÷ pendapatan_tahunan` | 5.000/5.000 cocok |
| `rasio_pembayaran` | `(jumlah_pinjaman ÷ 3) ÷ pendapatan_tahunan` | 5.000/5.000 cocok |

**Total verifikasi: 15.000/15.000 cocok persis.**

> **Kenapa verifikasi ini wajib:** rasio ternyata **bawaan `data.csv`**, bukan
> dihitung notebook. Kalau formula server meleset sedikit saja, model menerima
> distribusi berbeda dari saat pelatihan → prediksi rusak **diam-diam**.
> Hipotesis awal (melibatkan suku bunga) **salah**; ternyata dataset memakai
> asumsi pelunasan **3 tahun tetap tanpa bunga**.

---

## Temuan 2 — Ambang dikendalikan klien (KRITIS)

### Masalah
`threshold` dikirim per-request dari browser dengan rentang 0.0–1.0. Pada
`threshold = 0.0`, aturan `probabilitas ≥ ambang` **selalu benar** → semua
pengajuan dinyatakan Layak. Model ter-bypass sepenuhnya.

### Bukti eksperimen
Nasabah sangat berisiko: **5× gagal bayar**, skor kredit **320**, hutang **3,3×**
pendapatan, tanpa jaminan → probabilitas model **0,00%**.

| `threshold` dikirim | Keputusan |
|---|---|
| 0.5 | Tidak Layak |
| 0.1 | Tidak Layak |
| 0.01 | Tidak Layak |
| **0.0** | **Layak** ← model ter-bypass |

Siapa pun dengan curl/Postman bisa memaksa persetujuan.

### Perbaikan
Rentang dibatasi **0.2–0.9** (kebijakan bisnis). Nilai ekstrem ditolak **422**.
Slider frontend mengikuti rentang yang sama.

> Ambang 0 (loloskan semua) dan 1 (tolak semua) tidak punya makna bisnis apa pun
> — keduanya hanya meniadakan model.

---

## Temuan 3 — `confidence` salah arti saat ambang digeser (SEDANG)

### Masalah
Rumus lama: `confidence = max(p, 1−p)`.

Ini mengukur keyakinan pada keputusan **argmax (ambang 0.5)** — **bukan** pada
keputusan hasil ambang. Begitu ambang digeser (fitur yang justru kita sediakan),
angkanya jadi menyesatkan.

### Bukti
Dari uji Temuan 2: `keputusan = Layak`, `probabilitas = 0,00%`, **`confidence = 100%`**.

Panel menampilkan **"LAYAK — confidence 100%"**, seolah model sangat yakin nasabah
ini layak. Padahal 100% itu keyakinan bahwa ia **TIDAK layak**.

### Perbaikan
`confidence` kini menyatakan keyakinan pada **keputusan yang diambil**:
`p` bila Layak, `1−p` bila Tidak Layak.

| p | ambang | Keputusan | Lama | **Baru** |
|---|---|---|---|---|
| 0.90 | 0.5 | Layak | 90,0% | **90,0%** (sama) |
| 0.03 | 0.5 | Tidak Layak | 97,0% | **97,0%** (sama) |
| 0.60 | 0.7 | Tidak Layak | 60,0% ❌ | **40,0%** ✅ |

> **Kompatibel:** pada ambang 0.5 hasilnya identik dengan rumus lama, sehingga
> pemakaian default tidak berubah perilaku. Nilai 40% pada baris terakhir justru
> informatif — menandakan penolakan yang **tipis** dan layak dieskalasi ke analis.

---

## Temuan 4 — Validasi input sudah baik ✅

Semua input ngawur ditolak dengan benar:

| Input | Hasil |
|---|---|
| `skor_kredit: 9999` | 422 |
| `usia: 5` | 422 |
| `gagal_bayar_tercatat: -3` | 422 |
| `status_pekerjaan: "Astronot"` | 422 |

Pydantic (rentang + enum + `extra="forbid"`) bekerja sebagaimana mestinya.

---

## Temuan Bonus — Satu fitur redundan secara matematis

```
rasio_pembayaran ≡ rasio_pinjaman ÷ 3     (persis, pada seluruh 5.000 baris)
```

Karena `rasio_pembayaran = (pinjaman/3)/pendapatan` sedangkan
`rasio_pinjaman = pinjaman/pendapatan`, keduanya **kolinear sempurna**.

**Artinya:** dari 20 fitur model, `rasio_pembayaran_terhadap_pendapatan`
**tidak menambah informasi apa pun** — ia hanya penskalaan konstan dari fitur lain.
Model tetap bekerja, tetapi fitur ini dapat dihapus tanpa kehilangan sinyal.

---

## Catatan model: probabilitas 100% / 0,00% adalah tanda bahaya

Model memberi keyakinan **absolut** pada banyak kasus. Ini **tidak wajar** untuk
credit scoring nyata, dan konsisten dengan caveat yang sudah didokumentasikan:
`gagal_bayar_tercatat` memisahkan kelas **nyaris sempurna** pada dataset ini
(praktis tidak ada pemohon Layak yang punya catatan gagal bayar).

**Implikasi jujur:** akurasi **92,74%** sebagian disumbang oleh kebersihan dataset
yang tidak realistis. **Pada data produksi nyata, performa hampir pasti turun.**

---

## Poin bicara saat presentasi

1. **"Kami tidak hanya membangun, kami menyerang sistem kami sendiri."**
   Tiga celah ditemukan lewat pengujian langsung ke API yang berjalan.

2. **"Celah terparah justru bukan di model, tapi di kontrak API."**
   Model bagus tidak menolong bila input turunan bisa dipalsukan pemakainya.

3. **"Kami membongkar formula dataset, bukan menebaknya."**
   15.000/15.000 verifikasi — karena menebak formula berarti merusak model
   secara diam-diam.

4. **"Kami menemukan satu fitur yang redundan secara matematis."**
   Menunjukkan pemahaman terhadap data, bukan sekadar memakai apa adanya.

5. **"Kami jujur soal batas model."**
   Akurasi 92,74% ada caveat-nya, dan kami menyebutkannya lebih dulu sebelum
   ditanya.

---

## Antisipasi pertanyaan dosen

**"Kenapa rasio tidak dihapus saja dari API?"**
Karena `extra="forbid"` akan membuat frontend & CSV lama langsung 422 — aplikasi
live mati seketika. Field tetap diterima namun **selalu ditimpa** hasil hitungan
server, sehingga celah tertutup **tanpa memutus layanan**. Penghapusan penuh
dijadwalkan sebagai perubahan versi berikutnya.

**"Kenapa ambang dibatasi 0.2–0.9, bukan angka lain?"**
Batas ini menjaga kendali analis (menyetel ketat/longgar sesuai selera risiko)
sekaligus meniadakan nilai yang **tidak punya makna bisnis** (0 = loloskan semua,
1 = tolak semua). Angkanya dapat dikonfigurasi lewat kebijakan.

**"Bukankah mengubah confidence merusak hasil sebelumnya?"**
Tidak. Pada ambang 0.5 — pemakaian default — rumus baru **identik** dengan yang
lama. Perbedaan hanya muncul saat ambang digeser, yaitu justru kasus di mana
rumus lama **salah**.

---

## Bukti regresi otomatis

Empat pengujian ditambahkan ke `KrediPin_backend/tests/test_api.py` agar celah
ini **tidak bisa kembali**:

| Test | Menjaga |
|---|---|
| `test_predict_threshold_ekstrem_ditolak` | Ambang 0.0/0.1/0.95/1.0 → 422 |
| `test_rasio_kiriman_klien_diabaikan` | Rasio ngawur → hasil identik dengan yang jujur |
| `test_confidence_mengikuti_keputusan` | confidence sesuai keputusan yang diambil |
| `test_predict_threshold_override` | Ambang wajar (0.8) tetap berfungsi |

Pipeline CI menjalankannya pada setiap push, dan **deploy hanya berjalan bila
seluruh pengujian lolos** — sehingga perbaikan keamanan ini terkunci secara
otomatis.
