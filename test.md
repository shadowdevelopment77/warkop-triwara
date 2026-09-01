# 🧪 Triwara POS v3 — Dokumen Pengujian & Verifikasi Sistem (Test Documentation)

Dokumen ini mencatat seluruh rangkaian pengujian otomatis (*automated unit tests*), skenario uji yang diverifikasi, perintah eksekusi, serta hasil verifikasi sistem untuk setiap scope optimasi.

---

## ⚡ Perintah Menjalankan Pengujian

```bash
# Menjalankan seluruh unit test otomatis
pnpm test

# Menjalankan verifikasi tipe TypeScript dan build bundle production
pnpm run build

# Menjalankan pengujian test file tertentu saja (contoh Scope 1)
npx vitest run src/__tests__/scope1-database-rollup.test.ts
```

---

## 📊 Ringkasan Hasil Pengujian Saat Ini

- **Total Test Files**: **33 File Lulus (100%)**
- **Total Unit Tests**: **111 Tests Passed (100%)**
- **Build Status**: **Sukses 100% (0 Error)**
- **Waktu Eksekusi**: ~32.2 detik (Vitest) + 3.0 detik (Vite build)

---

## 🔬 Rincian Skenario Uji Per Scope

### 🔹 1. Pengujian Scope 1: Database Foundation & Daily Rollup
**File**: [`src/__tests__/scope1-database-rollup.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope1-database-rollup.test.ts)
- **Skenario 1: Verifikasi Skema v3 & Unique Date Index**
  - Memverifikasi tabel `dailySummaries` terdefinisi di database Dexie.
  - Memverifikasi index unik pada kolom `&date` berhasil menyimpan data rekap tanpa duplikasi tanggal.
- **Skenario 2: Kalkulasi Rekapitulasi Harian dari Data Transaksi Mentah**
  - Menyimulasikan 2 pesanan selesai (Tunai & QRIS) dan 1 pesanan dibatalkan (*void*).
  - Memverifikasi `totalOmset`, `totalCash`, `totalQris`, dan `totalProfit` terhitung akurat.
  - Memverifikasi pesanan void tidak dimasukkan ke dalam omset/profit.
  - Memverifikasi pembagian penjualan per menu (*productSales*) dan persentase produk terlaris (*topProductPercentage*) 100% presisi.
- **Skenario 3: Uji Idempotency (Update Tanpa Duplikasi Baris)**
  - Menjalankan `syncDailySummary` berulang kali pada tanggal yang sama.
  - Memverifikasi jumlah baris di tabel `dailySummaries` tetap 1 (diperbarui via `put`, tidak membuat baris kembar).
- **Skenario 4: Integrasi Otomatis Tutup Shift (`ShiftService.closeShift`)**
  - Membuka shift kasir, melakukan transaksi penjualan, lalu menutup shift.
  - Memverifikasi bahwa proses penutupan shift otomatis memicu `syncDailySummary` dan menghasilkan data rekap di database.

---

### 🔹 2. Pengujian Scope 2: Transaksi & Riwayat Berpaginasi
**File**: [`src/__tests__/scope2-paginated-orders.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope2-paginated-orders.test.ts)
- **Skenario 1: Paginasi Database Murni (25 Data Mock)**
  - Menyimulasikan 25 pesanan urut di database.
  - Halaman 1 (`page: 1, pageSize: 10`): Memverifikasi mengembalikan 10 pesanan terbaru (Order #25 s/d #16).
  - Halaman 2 (`page: 2, pageSize: 10`): Mengembalikan 10 pesanan berikutnya (Order #15 s/d #6).
  - Halaman 3 (`page: 3, pageSize: 10`): Mengembalikan 5 pesanan sisa (Order #5 s/d #1).
  - Memverifikasi `totalCount = 25`, `totalPages = 3`, dan `currentPage` sesuai permintaan.
- **Skenario 2: Filter Tanggal B-Tree Index Sebelum Paginasi**
  - Menyimulasikan 5 pesanan di tanggal 29 Agustus dan 15 pesanan di tanggal 30 Agustus.
  - Menguji query khusus tanggal 30 Agustus: memverifikasi database hanya menghitung 15 pesanan dan menghasilkan 2 halaman, mengabaikan data tanggal 29 Agustus.
- **Skenario 3: Generasi Nomor Urut Pesanan via Index Count**
  - Menyimulasikan 3 pesanan hari ini.
  - Memverifikasi `generateOrderNumber` menghasilkan nomor urut berikutnya (`#004`) menggunakan penunjuk indeks `.count()`, tanpa mengalokasikan array di memori RAM.
- **Skenario 4: Query `getOrders` dengan Limit Berindeks**
  - Menguji `getOrders` dengan parameter `limit: 3` mengembalikan tepat 3 data terbaru berurutan.

---

### 🔹 3. Pengujian Scope 3: Log Aktivitas Sistem & B-Tree Paginated Queries
**File**: [`src/__tests__/scope3-paginated-logs.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope3-paginated-logs.test.ts)
- **Skenario 1: Paginasi Database Murni (35 Log Mock)**
  - Menyimulasikan 35 data log aktivitas di database.
  - Halaman 1 (`page: 1, pageSize: 10`): Mengembalikan 10 log terbaru (Log #35 s/d #26).
  - Halaman 2 (`page: 2, pageSize: 10`): Mengembalikan 10 log berikutnya (Log #25 s/d #16).
  - Halaman 4 (`page: 4, pageSize: 10`): Mengembalikan 5 log sisa (Log #5 s/d #1).
  - Memverifikasi `totalCount = 35`, `totalPages = 4`, dan urutan kronologis terbalik (terbaru selalu paling atas).
- **Skenario 2: Filter Kategori Log via B-Tree Index (`type`)**
  - Menyimulasikan 10 log void dan 20 log mutasi inventori.
  - Filter `type: 'void'`: Memverifikasi hanya 10 log void yang dikembalikan dengan 1 halaman.
  - Filter `type: 'inventory'`: Memverifikasi hanya 20 log inventori yang dikembalikan dengan 2 halaman (15 log di halaman 1).
- **Skenario 3: Filter Tanggal Spesifik via Index Range (`createdAt`)**
  - Menyimulasikan 5 log pada 28 Agustus dan 8 log pada 29 Agustus.
  - Filter tanggal `2026-08-29`: Memverifikasi hanya 8 log pada tanggal tersebut yang ditarik, mengabaikan log tanggal lain.
- **Skenario 4: Filter Kombinasi Kategori & Tanggal**
  - Menyimulasikan log void dan shift pada tanggal yang sama.
  - Memverifikasi pencarian gabungan (`type: 'void'` dan `date: '2026-08-31'`) mengembalikan tepat 1 log yang cocok.

---

### 🔹 4. Pengujian Scope 4: Menu & HPP Batch Stock Evaluation & Caching
**File**: [`src/__tests__/scope4-menu-hpp-cache.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope4-menu-hpp-cache.test.ts)
- **Skenario 1: Evaluasi Stok Kolektif (*Batch*) 1 Kueri**
  - Menyimulasikan 2 menu (Single Espresso & Caffe Latte).
  - Bahan Espresso (Biji Kopi 100gr) cukup $\rightarrow$ `isAvailable: true`.
  - Bahan Latte (Susu 50ml, dibutuhkan 150ml) kurang $\rightarrow$ otomatis `isAvailable: false`, dengan `missingItemName: 'Susu Fresh Milk'`.
  - Memverifikasi pengecekan seluruh menu berjalan dalam 1 kueri tunggal bahan baku.
- **Skenario 2: In-Memory Caching & Pencarian Instan Katalog Produk**
  - Menyimulasikan 3 produk menu (Kopi Susu, Matcha Latte, Croissant).
  - Panggilan pertama mengisi in-memory cache.
  - Panggilan pencarian kata kunci (`'matcha'`) dan kategori (`categoryId = 1`) berjalan instan di RAM tanpa membaca ulang storage disk.
- **Skenario 3: Invalidasi Cache Produk Otomatis**
  - Menambahkan menu baru (`addProduct`) memicu `invalidateCache()`.
  - Memverifikasi kueri berikutnya langsung memuat produk baru secara reaktif.

---

### 🔹 5. Pengujian Scope 5: Manajemen Inventori & Transaksi Atomik
**File**: [`src/__tests__/scope5-atomic-inventory.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope5-atomic-inventory.test.ts)
- **Skenario 1: Pengurangan Stok Atomik (All-or-Nothing)**
  - Menyimulasikan pesanan 2x Americano Takeaway (membutuhkan Biji Kopi + Paper Cup kemasan).
  - Memverifikasi kedua bahan baku terpotong serempak dalam 1 transaksi ACID database Dexie.
  - Memverifikasi 2 log inventori mutasi penjualan tersimpan secara atomik.
- **Skenario 2: Pengembalian Stok Atomik saat Void Order**
  - Memotong stok menu Fresh Milk saat pesanan dibuat.
  - Menjalankan `restoreInventoryForOrder` saat void: memverifikasi saldo susu kembali utuh ke nilai awal (300ml $\rightarrow$ 500ml) dan log `void_return` tercatat secara atomik.
- **Skenario 3: Restock Atomik dengan Weighted Average Costing**
  - Menyimulasikan restock Teh Hitam (+300gr dengan harga batch baru).
  - Memverifikasi penambahan stok, rekalkulasi HPP rata-rata per unit, pencatatan log inventori, dan log sistem terjadi serempak dalam 1 transaksi.

---

### 🔹 6. Pengujian Scope 6: Hybrid Rollup Sales Statistics & PDF Clean Spacing
**File**: [`src/__tests__/scope6-hybrid-stats.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope6-hybrid-stats.test.ts)
- **Skenario 1: Agregasi Hybrid Rollup Multi-Hari (Historis + Live Today)**
  - Menyimulasikan 2 hari data historis di tabel `dailySummaries` (29 & 30 Agustus).
  - Menyimulasikan 1 pesanan aktif live hari ini di tabel `orders`.
  - Memverifikasi agregasi total omset (Rp 330.000), profit (Rp 198.000), cash (Rp 200.000), QRIS (Rp 130.000), dan total item terjual (24 item) terhitung 100% presisi dalam < 1 milidetik tanpa full-scan tabel transaksi.
- **Skenario 2: Perankingan Produk Terlaris secara Hybrid**
  - Menggabungkan penjualan produk Americano dari data historis (10 item) dengan pesanan hari ini (5 item).
  - Memverifikasi akumulasi kuantitas terjual (15 item) menempati peringkat 1 terlaris secara akurat.

---

### 🔹 7. Pengujian Scope 7: Stress Test Generator, Benchmarking & Chunked Export
**File**: [`src/__tests__/scope7-stress-and-pdf.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope7-stress-and-pdf.test.ts)
- **Skenario 1: Pembuatan Data Sintetis Massal & Agregasi Rollup Simultan**
  - Menghasilkan 1.000 transaksi dummy dalam *async chunks* non-blocking.
  - Memverifikasi callback progress bar melaporkan progres dari 0% s/d 100% dengan throughput (*trx/detik*).
  - Memverifikasi transaksi tersimpan di tabel `orders` dan teragregasi sinkron ke tabel `dailySummaries`.
- **Skenario 2: Pengukuran Metrik Benchmark Nyata (Stopwatch & Storage)**
  - Menghasilkan 500 data dummy.
  - Menjalankan fungsi benchmark untuk mengukur latensi paginasi (< 3ms) dan latensi kueri laporan tahunan (< 5ms) serta estimasi storage browser.
- **Skenario 3: Pembersihan Bersih Data Dummy Tanpa Mengganggu Data Nyata Toko**
  - Menyiapkan 1 order nyata toko (`TRW-REAL-001`) + 200 order dummy (`TRW-DUMMY-xxxxxxx`).
  - Menjalankan `cleanDummyOrders()`: memverifikasi 200 order dummy terhapus sempurna dan hanya 1 order nyata toko yang tetap ada.

---

### 🔹 8. Pengujian Pre-Computed Analytics & Query Cache Layer
**File**: [`src/__tests__/scope7-precomputed-cache.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/scope7-precomputed-cache.test.ts)
- **Skenario 1: Pembacaan Langsung Titik Grafik dari Tabel Pre-Computed `dailySummaries`**
  - Menyimulasikan 10 hari data `dailySummaries`.
  - Memverifikasi generator grafik `getSalesChartData` mode harian langsung membaca nilai titik omset dari tabel ringkas dalam < 2ms tanpa memindai ribuan order mentah.
- **Skenario 2: Cache Hit Bundle Laporan dalam 0ms**
  - Memverifikasi panggilan kedua `getReportBundle` pada rentang tanggal yang sama disajikan langsung dari memori cache referensi dalam 0ms.
- **Skenario 3: Invalidation Cache Bersih**
  - Memverifikasi `invalidateCache()` mengosongkan cache dengan aman dan menghitung ulang data baru secara akurat.

---

### 🔹 9. Pengujian Grafik Statistik Penjualan (5 Mode Waktu)
**File**: [`src/__tests__/sales-chart-bucketing.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/sales-chart-bucketing.test.ts)
- **Mode 1 (Harian - 1 Hari)**: Menghasilkan 24 titik jam (`00:00` s/d `23:00`).
- **Mode 2 (Multi-Hari - 3 Hari)**: Menghasilkan 18 titik interval 4 jam (6 blok per hari).
- **Mode 3 (Bulanan - 14 Hari)**: Menghasilkan 14 titik harian per tanggal.
- **Mode 4 (Kuartalan - 60 Hari)**: Menghasilkan titik mingguan kalender.
- **Mode 5 (Tahunan - 6 Bulan)**: Menghasilkan 6 titik bulanan kalender (`Jan`, `Feb`, ..., `Jun`).

---

### 🔹 10. Pengujian Fitur Inti Sistem Sebelumnya (10 File Test Lainnya)
- `src/__tests__/auth-security.test.ts`: Keamanan PIN staff dan supervisor.
- `src/__tests__/sprint1.test.ts`: Katalog menu, kategori, keranjang kasir.
- `src/__tests__/sprint2.test.ts`: Perhitungan diskon, pembayaran tunai, kembalian, QRIS.
- `src/__tests__/sprint3.test.ts`: Manajemen stok bahan baku, resep bertingkat, HPP snapshot.
- `src/__tests__/sprint4.test.ts`: Cetak struk thermal ESC/POS, kustomisasi kategori bahan.
- `src/__tests__/sprint5.test.ts`: Laporan penjualan, breakdown omset & profit.
- `src/__tests__/cashier-shift.test.ts`: Buka shift kasir, mutasi kas kecil, tutup shift.
- `src/__tests__/thermal-receipt-logo.test.ts`: Format logo struk thermal 58mm.
- `src/__tests__/offline-resilience.test.ts`: Ketahanan operasi offline IndexedDB.
- `src/__tests__/cashier-reconciliation.test.ts`: Rekonsiliasi fisik uang kas dan selisih kasir.

---

### 🔹 11. Pengujian Phase 1: Real-Time Daily Summary Rollup & Zero-Scan Analytics
**File**: [`src/__tests__/phase1-realtime-rollup.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase1-realtime-rollup.test.ts)
- **Skenario 1: Increment Otomatis Saat Pesanan Dibuat (`createOrder`)**
  - Membuat 1 transaksi kasir (2x Es Kopi Susu @ Rp 18.000 via Tunai).
  - Memverifikasi tabel `dailySummaries` langsung ter-update di background: `totalOmset = 36.000`, `totalCash = 36.000`, `completedCount = 1`, `totalItemsSold = 2`, `topProductName = 'Es Kopi Susu' (100%)`.
- **Skenario 2: Akumulasi Pesanan Berganda & Pembaruan Ranking Produk**
  - Membuat pesanan kedua (3x Americano @ Rp 15.000 via QRIS).
  - Memverifikasi `dailySummaries` bertambah secara akurat: `totalOmset = 63.000`, `totalCash = 18.000`, `totalQris = 45.000`, `completedCount = 2`, `totalItemsSold = 4`.
  - Memverifikasi ranking produk otomatis bergeser ke 'Americano' (3 cup / 75%).
- **Skenario 3: Decrement Otomatis Saat Pesanan Dibatalkan (`voidOrder`)**
  - Membatalkan transaksi #1.
  - Memverifikasi angka di `dailySummaries` langsung terpotong secara akurat: `totalOmset` dan `totalCash` berkurang menjadi 0, `completedCount` menjadi 0, dan `voidedCount` tercatat 1.
- **Skenario 4: Pembacaan Zero-Scan `getSalesSummary`**
  - Mengambil ringkasan penjualan tanggal hari ini tanpa memindai tabel `orders`.
  - Memverifikasi data dikembalikan 100% akurat dalam < 1 milidetik.

---

### 🔹 12. Pengujian Phase 2: Stand-Alone Transaction History PDF Export
**File**: [`src/__tests__/phase2-transaction-history-pdf.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase2-transaction-history-pdf.test.ts)
- **Skenario 1: Ekspor PDF Riwayat Transaksi Sukses dengan Progress Callback**
  - Mengirim sampel transaksi penjualan multi-metode (Tunai, QRIS, Void).
  - Memverifikasi `pdfService.exportTransactionHistoryReport` menyelesaikan proses tanpa error dan memanggil progress bar sampai 100% ('Selesai!').
- **Skenario 2: Penanganan Daftar Transaksi Kosong (Empty State)**
  - Menyimulasikan periode tanggal tanpa ada transaksi penjualan.
  - Memverifikasi sistem menghasilkan berkas PDF berstatus 'Tidak ada data' dengan aman tanpa crash.
- **Skenario 3: Proteksi Memori Capping 500 Transaksi**
  - Menguji dataset 600 transaksi sintetis.
  - Memverifikasi berkas PDF membatasi rendering 500 baris pertama dan mencantumkan baris informasi total transaksi riil secara elegan tanpa membebani browser HP.

---

### 🔹 13. Pengujian Phase 3: Shift Display & Rekap PDF Overhaul
**File**: [`src/__tests__/phase3-shift-recap.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase3-shift-recap.test.ts)
- **Skenario 1: Ekspor PDF Rekap Shift dengan 9 Baris Finansial Baku**
  - Menguji cetak dokumen PDF rekapitulasi shift yang berisi kas awal, total omset tunai, total omset QRIS, omset shift total, uang tunai di laci fisik, pengeluaran kasir, selisih kas, jumlah pesanan selesai, dan jumlah pesanan void.
  - Memverifikasi `pdfService.exportShiftReportPdf` merender data secara utuh beserta rincian tabel belanja kasir (petty cash).
- **Skenario 2: Ekspor PDF Rekap Shift Tanpa Pengeluaran Kasir**
  - Menyimulasikan shift yang tidak memiliki mutasi pengeluaran kas kecil.
  - Memverifikasi tabel rincian belanja tidak memicu error dan baris pengeluaran kasir tetap menampilkan `Rp 0`.

---

### 🔹 14. Pengujian Phase 4: Ingredient Detail Lock, Custom Units & Recipe Guard
**File**: [`src/__tests__/phase4-ingredient-recipe-guard.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase4-ingredient-recipe-guard.test.ts)
- **Skenario 1: Penambahan Bahan dengan Satuan Custom Bebas**
  - Mendaftarkan bahan baru dengan satuan unik string bebas (`botol`, `pack`, `shot`, `sachet`).
  - Memverifikasi data tersimpan di Dexie dengan satuan custom dan kalkulasi cost per unit presisi.
- **Skenario 2: Pencegahan Hapus Bahan yang Dipakai Resep Menu Minuman**
  - Menyiapkan menu minuman yang mengonsumsi bahan dalam array resepnya.
  - Memanggil `ingredientService.deleteIngredient(ingId)`.
  - Memverifikasi sistem melempar error proteksi dan mengembalikan daftar nama menu yang terdampak.
- **Skenario 3: Penghapusan Bahan yang Tidak Terikat Menu**
  - Memverifikasi bahan tanpa keterikatan resep dapat dihapus secara permanen dan bersih.
- **Skenario 4: Pembaruan Batas Alert Stok Mode Detail**
  - Mengubah batas minimal alert stok pada bahan yang sudah terdaftar.
  - Memverifikasi nilai `minStock` terbarui dengan benar tanpa mengubah identitas harga beli supplier maupun stok fisik saat ini.

---

### 🔹 15. Pengujian Phase 5: Strict Menu & Recipe Validation
**File**: [`src/__tests__/phase5-menu-validation.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase5-menu-validation.test.ts)
- **Skenario 1: Penolakan Nama Menu Kosong**
  - Menguji `productService.addProduct` dengan nama hanya spasi/kosong.
  - Memverifikasi sistem melempar error 'Nama menu tidak boleh kosong'.
- **Skenario 2: Penolakan Kategori Belum Dipilih**
  - Menguji penambahan menu dengan `categoryId <= 0`.
  - Memverifikasi sistem menolak dengan pesan 'Kategori menu wajib dipilih'.
- **Skenario 3: Penolakan Harga Jual Rp 0 atau Negatif**
  - Menguji penambahan menu dengan harga jual 0 atau kurang dari 0.
  - Memverifikasi penolakan dengan pesan 'Harga jual wajib diisi dan harus lebih dari Rp 0'.
- **Skenario 4: Pendaftaran Sukses Data Lengkap**
  - Menguji pembuatan produk lengkap dengan kategori, harga, resep bahan baku, kemasan takeaway, dan deskripsi.
  - Memverifikasi produk tersimpan dan dapat diambil kembali dengan integritas data 100%.

---

### 🔹 16. Pengujian Phase 6: Stand-Alone Executive Sales Report & 1-Page Clean PDF
**File**: [`src/__tests__/phase6-sales-report-standalone.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase6-sales-report-standalone.test.ts)
- **Skenario 1: Ekspor Dokumen Laporan Penjualan 1 Halaman Penuh**
  - Menyiapkan ringkasan omset, profit, total transaksi, item terjual, grafik omset, dan ranking produk.
  - Memanggil `pdfService.exportSalesReport` tanpa data order transaksi.
  - Memverifikasi dokumen PDF berhasil di-generate sebagai 1 halaman ringkasan eksekutif yang bersih dan elegan.
- **Skenario 2: Penanganan Laporan Periode Kosong/Nol Penjualan**
  - Menguji cetak laporan pada rentang tanggal tanpa transaksi penjualan.
  - Memverifikasi generator PDF tidak melempar pengecualian (throw) dan menghasilkan tabel produk berstatus 'Belum ada data'.

---

### 🔹 17. Pengujian Phase 7: 1-Year Order Cleanup & Excel Backup
**File**: [`src/__tests__/phase7-cleanup-old-orders.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/phase7-cleanup-old-orders.test.ts)
- **Skenario 1: Filter Presisi Transaksi $\ge 1$ Tahun**
  - Menyiapkan transaksi berumur 30 hari yang lalu dan transaksi 400 hari yang lalu (> 1 tahun).
  - Memanggil `orderService.getOrdersOlderThanOneYear()`.
  - Memverifikasi hanya transaksi $\ge 1$ tahun yang terjaring dalam daftar.
- **Skenario 2: Proteksi Penolakan Pembersihan Bila Tidak Ada Data $\ge 1$ Tahun**
  - Menguji pemanggilan pembersihan ketika seluruh transaksi masih berumur di bawah 1 tahun.
  - Memverifikasi sistem melempar error dan memastikan tidak ada data yang terhapus secara tidak sengaja.
- **Skenario 3: Pembersihan Transaksi Lama & Pencatatan Log Audit Sistem**
  - Menyiapkan transaksi berumur 2 tahun dan transaksi berumur 6 bulan.
  - Menjalankan `cleanOrdersOlderThanOneYear()`.
  - Memverifikasi transaksi 2 tahun terhapus bersih, transaksi 6 bulan tetap utuh, dan log bertipe `'system'` tercatat di database.
- **Skenario 4: Pembentukan File Excel Backup (UTF-8 BOM)**
  - Menguji konversi pesanan menjadi format CSV dengan UTF-8 BOM (`\uFEFF`) yang memuat rincian subtotal, diskon, omset, metode bayar, dan rincian item pesanan.
  - Memverifikasi fungsi berjalan mulus tanpa error.

---

### 🔹 18. Pengujian Fitur: Kelola Satuan Ukur (Unit Manager) & Proteksi Relasi
**File**: [`src/__tests__/unit-manager-guard.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/unit-manager-guard.test.ts)
- **Skenario 1: Ketersediaan Satuan Dasar Sistem (gr, ml, pcs)**
  - Memanggil `ingredientService.getUnits()`.
  - Memverifikasi satuan bawaan selalu tersedia di daftar opsi.
- **Skenario 2: Penambahan Satuan Kustom dan Penolakan Duplikat**
  - Mendaftarkan satuan kustom baru (`botol`).
  - Memverifikasi penolakan nama kosong atau duplikat case-insensitive.
- **Skenario 3: Proteksi Satuan Sistem Dasar**
  - Mencoba menghapus `gr`, `ml`, atau `pcs`.
  - Memverifikasi sistem melempar error penolakan karena merupakan satuan dasar sistem.
- **Skenario 4: Proteksi Penghapusan Satuan yang Sedang Digunakan**
  - Menyiapkan bahan baku yang memakai satuan `shot`.
  - Memanggil `ingredientService.deleteUnit('shot')`.
  - Memverifikasi sistem menolak penghapusan dan menyebutkan nama bahan baku yang menggunakannya.
- **Skenario 5: Keberhasilan Hapus Satuan Bebas / Tidak Terpakai**
  - Menghapus satuan `sachet` yang tidak terikat bahan manapun.
  - Memverifikasi satuan berhasil dihapus dari `shopConfig` dan tercatat dalam log audit inventori.

---

### 🔹 19. Pengujian Performa Paginasi Riwayat Transaksi & Prefetch Cache
**File**: [`src/__tests__/paginated-orders-perf.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/paginated-orders-perf.test.ts)
- **Skenario 1: Integritas Metadata Paginasi Halaman Pertama**
  - Mengambil 10 data dari 25 total transaksi uji.
  - Memverifikasi total count 25, total pages 3, current page 1, dan pengurutan kronologis terbalik (terbaru di atas).
- **Skenario 2: Serving Paginasi Instan dari In-Memory Cache (< 1ms)**
  - Mengakses halaman yang sama dua kali.
  - Memverifikasi panggilan kedua dilayani langsung dari memori tanpa menyentuh range query IndexedDB sama sekali (`where` tidak terpanggil).
- **Skenario 3: Background Prefetching Halaman Berikutnya**
  - Mengakses Halaman 1, lalu menunggu siklus background prefetch.
  - Mengakses Halaman 2 dan memverifikasi data Halaman 2 sudah siap di buffer memori tanpa memicu query I/O ke IndexedDB.
- **Skenario 4: Invalidation Cache saat Mutasi Data**
  - Memanggil `clearPaginationCache()`.
  - Memverifikasi cache dibersihkan dan panggilan berikutnya kembali melakukan query segar ke database.

---

### 🔹 20. Pengujian Performa Paginasi Log Aktivitas & LRU Prefetch Cache
**File**: [`src/__tests__/paginated-logs-perf.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/paginated-logs-perf.test.ts)
- **Skenario 1: Integritas Metadata Paginasi Log Halaman Pertama**
  - Mengambil 10 log dari 30 total log uji.
  - Memverifikasi total count 30, total pages 3, current page 1, dan pengurutan kronologis terbalik (terbaru di atas).
- **Skenario 2: Filter Presisi Kategori Sistem ('system')**
  - Memfilter log dengan kategori `'system'`.
  - Memverifikasi hanya log audit sistem yang dikembalikan dengan integritas tipe 100%.
- **Skenario 3: Serving Paginasi Instan dari In-Memory Cache (< 1ms)**
  - Mengakses halaman log yang sama dua kali.
  - Memverifikasi panggilan kedua dilayani langsung dari cache memori tanpa query database (`toCollection` tidak dipanggil).
- **Skenario 4: Background Prefetching Halaman Log Berikutnya**
  - Mengakses Halaman 1 log, lalu menunggu siklus background prefetch.
  - Mengakses Halaman 2 dan memverifikasi data Halaman 2 telah siap di buffer memori tanpa memicu query ke IndexedDB.
- **Skenario 5: Invalidation Cache Log saat Mutasi**
  - Memanggil `clearLogPaginationCache()`.
  - Memverifikasi cache dibersihkan dan panggilan berikutnya kembali melakukan query segar ke database.

---

### 🔹 21. Pengujian Performa Paginasi Riwayat Shift & Index B-Tree
**File**: [`src/__tests__/paginated-shifts-perf.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/paginated-shifts-perf.test.ts)
- **Skenario 1: Penarikan Data Shift Melampaui Batas 100 Data**
  - Mengambil 10 data dari total 120 shift uji (melebihi batas lama 100 shift).
  - Memverifikasi total count 120, total pages 12, dan pengurutan kronologis terbalik (shift terbaru di baris pertama).
- **Skenario 2: Filter Presisi Target Tanggal Lokal (Bebas Bug UTC)**
  - Memfilter shift berdasarkan tanggal lokal `'2026-09-01'`.
  - Memverifikasi shift pagi (jam 06:00 WIB) tetap masuk dalam filter tanggal yang benar tanpa salah tanggal akibat konversi UTC.
- **Skenario 3: Serving Instan dari In-Memory LRU Cache (< 1ms)**
  - Mengakses halaman shift yang sama dua kali.
  - Memverifikasi request kedua dilayani langsung dari cache memori tanpa query database (`orderBy` tidak dipanggil).
- **Skenario 4: Background Prefetching Halaman Shift Berikutnya**
  - Mengakses Halaman 1, lalu memverifikasi data Halaman 2 telah disiapkan di buffer memori oleh background task.
- **Skenario 5: Invalidation Cache Shift saat Mutasi**
  - Memverifikasi cache dibersihkan otomatis saat shift dibuka atau ditutup melalui `clearShiftPaginationCache()`.

---

### 🔹 22. Pengujian Integritas Omset & Fail-Safe Void Transaksi Lampau
**File**: [`src/__tests__/historical-void-omset.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/historical-void-omset.test.ts)
- **Skenario 1: Pengurangan Omset Tepat pada Rekap Kemarin saat Void Dilakukan Hari Ini**
  - Membuat order pada tanggal kemarin (`createdAt: yesterday`).
  - Mengonfirmasi omset kemarin tercatat Rp 30.000.
  - Melakukan void pada order kemarin tersebut hari ini.
  - Memverifikasi omset tanggal kemarin terpotong bersih menjadi Rp 0, voided count kemarin bertambah 1, dan omset hari ini tetap 0 (tidak salah tanggal).
- **Skenario 2: Auto-Sync Fail-Safe pada Void Transaksi Lampau yang Belum Memiliki Summary**
  - Membuat pesanan pada tanggal lampau yang belum memiliki ringkasan harian di database.
  - Melakukan void terhadap pesanan tersebut.
  - Memverifikasi sistem secara otomatis mengompilasi dan men-generate ringkasan harian tanggal tersebut secara akurat langsung dari raw database.
- **Skenario 3: Sinkronisasi Kas & Selisih Laci pada Shift yang Sudah Ditutup**
  - Menguji void pada order yang terikat dengan shift yang sudah berstatus `closed`.
  - Memverifikasi `expectedEndingCash` dihitung ulang dengan pengeluaran operasional dan `cashDifference` diperbarui sesuai uang fisik.

---

### 🔹 23. Pengujian Fitur Backup & Restore Database Penuh
**File**: [`src/__tests__/backup-restore.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/backup-restore.test.ts)
- **Skenario 1: Ekspor Lengkap 11 Tabel Database & Metadata Terstruktur**
  - Mengisi data uji pada tabel categories, products, ingredients, orders, dan shifts.
  - Menjalankan `exportDatabase()` dan memverifikasi metadata versi 3, appName 'Triwara POS', statistik record, dan integritas array data.
- **Skenario 2: Pemulihan Atomik (ACID) & Kebangkitan Native Date Objects**
  - Mengimpor file backup JSON berisi tanggal format ISO string.
  - Memverifikasi transaksi atomik Dexie mengosongkan dan mengisi ulang tabel dengan data baru.
  - Memverifikasi seluruh properti tanggal (`createdAt`, `openedAt`, `closedAt`) di-revive menjadi objek JavaScript `Date` asli agar query filter tanggal dan B-Tree range query IndexedDB berfungsi normal.
- **Skenario 3: Penolakan File Corrupt / Non-Triwara**
  - Menguji penolakan file teks bukan JSON dan file JSON dari aplikasi POS lain dengan pesan error yang ramah dan jelas.

---

### 🔹 24. Pengujian Layanan Printer Thermal Xantri BT-58D & Format ESC/POS
**File**: [`src/__tests__/printer-service.test.ts`](file:///home/shadowxz/projects/triwara-pos/src/__tests__/printer-service.test.ts)
- **Skenario 1: Pre-flight Check Koneksi Printer**
  - Menguji penolakan pencetakan dengan pesan ramah jika printer belum disambungkan di menu Pengaturan.
- **Skenario 2: Kebijakan Zero-Queue & Fail-Fast**
  - Mensimulasikan kegagalan koneksi di tengah pengiriman data.
  - Memverifikasi proses langsung dibatalkan seketika tanpa ada antrean tersembunyi yang berisiko mencetak tiba-tiba, serta permintaan cetak berikutnya dapat berjalan normal tanpa crash.
- **Skenario 3: Format Struk Customer 58mm (32 Karakter)**
  - Memverifikasi header toko, rincian pembayaran, uang kembali, dan footer tidak melebihi batas 32 karakter per baris.
- **Skenario 4: Format Struk Bar (Item, Harga, Total Bar, Tanpa Header/Footer Toko)**
  - Memverifikasi tiket Bar memuat nama item, opsi racikan, subtotal harga, dan TOTAL BAR tanpa memuat deskripsi toko.
- **Skenario 5: Format Struk Dapur (Murni Racikan Tanpa Harga)**
  - Memverifikasi tiket Dapur hanya memuat nama menu, qty, dan catatan racikan dengan 0% informasi harga.
- **Skenario 6: Format Rekap Shift & Konversi Byte Binary ESC/POS**
  - Mengonversi teks rekap shift menjadi binary buffer dengan perintah inisialisasi `ESC @` dan potong kertas `GS V`.
  - Menguji fungsi `testPrint()` berhasil mengirim paket data uji koneksi.

---

*Catatan: Seluruh 24 modul pengujian telah selesai diverifikasi dan 100% lulus.*
