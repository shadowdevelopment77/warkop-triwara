# 📝 Triwara POS — Progress Log

## Status Ringkasan
- **Project**: Triwara POS (Coffee Shop POS)
- **Target Device**: Advan Tab 10 (Android Tablet)
- **Dev Engine**: React 19 + Vite + TypeScript + Capacitor + Dexie IndexedDB
- **Tanggal Mulai**: 29 Agustus 2026

---

## 🚀 Status Implementasi per Phase

### [x] Phase 1: Core Base, Database & Auth Setup
- [x] Inisialisasi `progress.md` tracking
- [x] Type definitions komprehensif (`src/types/index.ts`)
- [x] Dexie OOP IndexedDB class (`src/database/db.ts` & `src/database/seed.ts`)
- [x] SHA-256 PIN Security Utility (`src/utils/hash.ts`)
- [x] ConfigService (`src/services/config.service.ts`)
- [x] Komponen 4-Digit Security PIN Lock Screen (`src/components/auth/PinLock.tsx`)
- [x] Layout AppShell, Header & Master Drawer (~50% overlay) (`src/components/layout/*`)

### [x] Phase 2: Inventory & Recipe Engine
- [x] HppService dengan kalkulasi HPP snapshot & stock deduction (`src/services/hpp.service.ts`)
- [x] IngredientService dengan validasi duplikat nama (case-insensitive) & Weighted Average Costing (`src/services/ingredient.service.ts`)
- [x] ProductService untuk katalog & resep (`src/services/product.service.ts`)
- [x] Modal Tambah/Edit Bahan (`src/components/master/IngredientModal.tsx`)
- [x] Modal Quick Restock (`src/components/master/RestockModal.tsx`)
- [x] Katalog Menu & Recipe Builder Modal (`src/components/master/RecipeEditor.tsx` & `src/components/master/MenuPanel.tsx`)

### [x] Phase 3: POS UI & Cart Flow
- [x] SearchBar & Horizontal Category Filter (max 3 visible) (`src/components/pos/SearchBar.tsx` & `src/components/pos/CategoryFilter.tsx`)
- [x] MenuSidebar Vertikal dengan badge inisial 2-huruf (`src/components/pos/MenuSidebar.tsx`)
- [x] Variant Selection Modal (Dine-in/Takeaway, Suhu, Gula, Topping, Notes) (`src/components/pos/VariantModal.tsx`)
- [x] CartPanel kanan dengan diskon % helpers (25/50/75/100/manual) (`src/components/pos/CartPanel.tsx`)
- [x] Payment Checkout Modal (Tunai / QRIS, Kembalian, Nama Pelanggan) (`src/components/pos/PaymentModal.tsx`)
- [x] OrderService dengan HPP Snapshot per transaksi (`src/services/order.service.ts`)

### [x] Phase 4: Receipts & Thermal Printing
- [x] ReceiptService untuk 3 tipe struk (Customer, Bar, Kitchen) 32-karakter 58mm (`src/services/receipt.service.ts`)
- [x] PrintSelectModal dialog cetak manual (`src/components/pos/PrintSelectModal.tsx`)

### [x] Phase 5: Master Panel, Reports & PDF Export
- [x] ReportService aggregasi omset, tunai, QRIS, profit bersih & 5 menu terlaris (`src/services/report.service.ts`)
- [x] ReportPanel dengan tabel riwayat transaksi (sequence 1, 2, 3...) & tombol teks `[Cetak Struk]` / `[Void]` (`src/components/master/ReportPanel.tsx`)
- [x] PdfService dengan jsPDF & autoTable untuk ekspor laporan (`src/services/pdf.service.ts`)
- [x] SettingsPanel untuk PIN, koneksi printer BT-58D, header/footer struk (termasuk WiFi/Pass), & logo app (`src/components/master/SettingsPanel.tsx`)
- [x] LogPanel untuk riwayat void & restock (`src/components/master/LogPanel.tsx`)
- [x] Image Compression Utility (`src/utils/image.ts`)

---

## 📅 Log Perubahan Detail

### [2026-08-29] — Full Codebase Implementation & Verification
- Menyetujui perencanaan teknis v7 (`triwara-pos-planning.md`).
- Mengimplementasikan seluruh komponen UI, database OOP, services, dan utilitas.
- Menguji type-checking TypeScript dan linting (0 error type).
- Memastikan tidak ada `git commit` yang dieksekusi sesuai aturan pengembang.

---

## ⚡ SPRINT 2: UI/UX Refinement, Monochrome Theme, Modals, Notifications & Automated Testing

### [x] Phase 1: Monochrome Theme & Responsive Layout (Tablet-First)
- [x] Overhaul CSS tokens ke Dark Monochrome (Base Hitam `#09090b` / `#18181b`) di `global.css`, `layout.css`, `pos.css`, `master.css`
- [x] Optimasi Tablet Advan Tab 10 (1280x800) & helper proteksi orientasi portrait smartphone (`.portrait-warning-overlay` di `AppShell.tsx`)
- [x] Tombol tutup modal menggunakan icon `X` merah (`.modal-close-btn-red`) di seluruh modal dan drawer

### [x] Phase 2: Header Navigation & 24-Hour Notification System
- [x] Ubah tombol `[Master]` menjadi icon Hamburger (`btn-hamburger-trigger`) di pojok kiri Header
- [x] Tambahkan icon Lonceng (`🔔`) dengan badge unread counter di sebelah kiri tombol Kunci PIN
- [x] Service notifikasi (`IAppNotification`) di Dexie `TriwaraDatabase` dengan auto-pruning otomatis untuk entri > 24 jam
- [x] Modal notifikasi 24 jam (`NotificationModal.tsx`) dengan badge tipe, aksi tandai dibaca, dan direct navigation ke tab target

### [x] Phase 3: Master Drawer & Inventory Panel Alignment
- [x] Master Drawer sub-folder "Produk & Stok" default tertutup (`isProductFolderOpen: false`)
- [x] Hapus kolom "Minimal Alert" di tabel inventaris (tersisa 6 kolom: Bahan/Kemasan, Kategori, Stok Saat Ini, Cost/Unit, Status, Aksi)
- [x] Hapus kolom batas minimal di ekspor PDF laporan inventaris (`pdf.service.ts`)
- [x] Penyelarasan modal tambah, edit, dan restock bahan (`IngredientModal.tsx` & `RestockModal.tsx`) dengan notifikasi otomatis

### [x] Phase 4: Menu Management & Sales Report Enhancements
- [x] Modal resep dan produk selaras dengan prototype (live HPP preview kalkulasi bahan utama & kemasan takeaway di `RecipeEditor.tsx`)
- [x] Filter tanggal di pojok kiri atas Laporan Penjualan (`Dari Tanggal` & `Sampai Tanggal`) + preset tombol "Hari Ini" & "Bulan Ini"
- [x] 4 Card Laporan: `OMSET`, `TUNAI`, `QRIS`, `PROFIT` (hanya OMSET yang memiliki subtitle info sukses & dibatalkan)
- [x] Void order mengembalikan stok bahan & kemasan serta mencatat notifikasi otomatis

### [x] Phase 5: Modular Settings Modals
- [x] Ubah Settings Panel menjadi 4 trigger card grid yang membuka modal tersendiri:
  1. Ganti PIN Keamanan (`activeModal === 'pin'`)
  2. Koneksi Printer Thermal (`activeModal === 'printer'`)
  3. Konfigurasi Struk Pelanggan (`activeModal === 'receipt'`)
  4. Branding Identitas Aplikasi (`activeModal === 'branding'`)
- [x] Seluruh modal pengaturan dilengkapi tombol tutup `X` merah dan form aksi Batal/Simpan

### [x] Phase 6: HPP Stock Availability & Extra Toppings
- [x] Method `checkStockAvailability(product, orderType, qty)` di `hpp.service.ts` untuk validasi ketersediaan stok bahan & kemasan
- [x] Indikator `[HABIS]` di menu sidebar kasir (`MenuSidebar.tsx`) dengan peringatan jika bahan habis
- [x] Kalkulasi dinamis HPP topping berdasarkan harga unit bahan baku asli (`order.service.ts`)
- [x] Deduksi & pengembalian stok topping pada transaksi checkout dan pembatalan void

### [x] Phase 7: Lightweight Automated Testing Setup
- [x] Instalasi `vitest` v4.1.11 + `fake-indexeddb` v6.2.5 (ringan, ramah Celeron N2930 + RAM 4GB)
- [x] Pembuatan test suite: `hpp.test.ts`, `inventory.test.ts`, `order.test.ts`, `notification.test.ts`
- [x] Eksekusi verifikasi test otomatis: **4/4 Suites Passed, 8/8 Tests Passed (100%)** dalam 3.47 detik
- [x] Typecheck & Build: `tsc -b && vite build` lolos tanpa error (2.72 detik)
- [x] Linter: `oxlint` lolos 0 error
- [x] Catatan log testing lengkap diperbarui di `progress-test.md`

---

## ⚡ SPRINT 3: POS UX, Layout Proportions, Non-Modal Notif, Pagination & 400 Seed Data

### [x] Phase 1: Header Sizing & Non-Modal Notification Dropdown
- [x] Perbesar header (64px) dan logo toko (42px) agar jelas terlihat
- [x] Ubah notifikasi menjadi dropdown popover non-modal (klik lonceng untuk buka/tutup toggle)
- [x] Batasi ketinggian dropdown maksimal 5 item notifikasi dengan vertical scroll

### [x] Phase 2: POS Cashier Ratio (Menu 42% : Cart 58%) & Keyboard Protection
- [x] Ubah layout split kasir agar menu lebih kecil daripada cart (`grid-template-columns: 42fr 58fr;`)
- [x] Tambahkan scroll margin dan `max-height: 85dvh` pada modal untuk antisipasi keyboard virtual Android (1280x450)

### [x] Phase 3: Clean Placeholders Without Default Values
- [x] Kosongkan default value awal pada form tambah bahan baru (`IngredientModal.tsx`) dan beri contoh placeholder
- [x] Kosongkan default value awal pada form tambah menu baru (`RecipeEditor.tsx`) dan beri contoh placeholder

### [x] Phase 4: Master Drawer State Persistence
- [x] Pertahankan state sub-folder "Produk & Stok" saat drawer ditutup dan dibuka kembali (tidak auto-terbuka)

### [x] Phase 5: Dynamic Category Management by User
- [x] Tambah method `addCategory` di `product.service.ts`
- [x] Sediakan UI tambah kategori menu langsung oleh user di `MenuPanel.tsx` dan `RecipeEditor.tsx`

### [x] Phase 6: Pagination 10 Items/Page with Arrow Navigation
- [x] Terapkan pagination 10 baris + panah pada Tabel Inventaris (`InventoryPanel.tsx`)
- [x] Terapkan pagination 10 baris + panah pada Riwayat Transaksi (`ReportPanel.tsx`)
- [x] Terapkan pagination 10 baris + panah pada Log Aktivitas (`LogPanel.tsx`)

### [x] Phase 7: Full Database Reset & Realistic Seed (400 Orders)
- [x] Fungsi `resetAndSeedDatabase`: reset IndexedDB bersih
- [x] Seed lengkap: Kategori, Bahan Inventori (stok aman 5.000–40.000 unit), 8 Menu Siap Jual (resep terhubung)
- [x] Seed 400 data transaksi realistis dalam 1 bulan terakhir dengan urutan harian & snapshot HPP
- [x] Tombol pemicu "Reset & Muat Data Demo (400 Transaksi)" di panel Pengaturan

### [x] Phase 8: Automated Testing Verification & Documentation
- [x] Jalankan automated test suite `pnpm run test` (**5/5 Suites Passed, 11/11 Tests Passed**)
- [x] Verifikasi `pnpm run build` lolos tanpa error
- [x] Catat log pengujian di `progress-test.md`
- [x] Menjaga aturan pengguna: **TIDAK ADA GIT COMMIT OTOMATIS**

---

## ⚡ SPRINT 4: POS Polish, Thermal Receipt Preview, Menu Card UX, Discount Layout & Category Modals

### [x] Phase 1: Fix Menu Duplication & Seed Mutex Guard
- [x] Tambahkan mutex lock `isSeedingInProgress` di `seed.ts`
- [x] Tambahkan fungsi deduplikasi otomatis nama produk di `product.service.ts` agar menu ganda langsung dibersihkan

### [x] Phase 2: Fix Cart Scroll & Layout (Anti-Tertutup saat Item Banyak)
- [x] Pasang `min-height: 0;` dan `overflow-y: auto;` pada `.cart-items-scroll` di `pos.css`
- [x] Pasang `flex-shrink: 0;` pada `.cart-panel-footer` agar diskon & tombol bayar selalu terlihat dan terkunci di bawah

### [x] Phase 3: Cashier Menu Quick Add & "+ Additional" Button
- [x] Klik kartu menu langsung menambahkan ke keranjang belanja (Dine-In, qty: 1)
- [x] Sediakan tombol `+ Additional` di bawah/samping harga menu untuk membuka kustomisasi varian

### [x] Phase 4: High-Contrast Styling untuk Modal Additional / Varian
- [x] Tambahkan CSS lengkap untuk `.btn-toggle-group`, `.toggle-btn`, `.toppings-grid`, dan `.topping-checkbox-btn`
- [x] Pastikan teks nama opsi, status aktif, dan badge harga tambahan kontras tajam

### [x] Phase 5: Tata Letak Diskon (Input Manual di Awal + Tombol Reset)
- [x] Pindahkan input persentase manual ke baris pertama di bawah label diskon
- [x] Tambahkan tombol `✕ Reset Diskon` untuk mengembalikan diskon ke 0% secara instan
- [x] Susun tombol preset persentase cepat (`10%`, `25%`, `50%`, `75%`, `100%`)

### [x] Phase 6: Modal Cetak Struk Thermal 58mm Realistis (3 Tombol Cetak)
- [x] Buat pratinjau kertas struk putih thermal 58mm (font monospace, garis putus-putus, rincian item, footer)
- [x] Sediakan 3 tombol aksi cetak: `Cetak Struk Customer`, `Cetak Struk Bar`, `Cetak Struk Dapur` (tanpa tombol pesanan baru)
- [x] Integrasikan modal struk ini pada selesai transaksi kasir dan tombol `[Cetak]` di Laporan Penjualan

### [x] Phase 7: Estimasi HPP & Margin di Katalog Menu (Bukan di Edit Resep)
- [x] Hapus kalkulasi live HPP preview dari `RecipeEditor.tsx`
- [x] Tampilkan estimasi HPP, laba kotor, dan margin persentase langsung di kartu produk pada `MenuPanel.tsx`

### [x] Phase 8: Modal Dialog Tambah Kategori (Menu & Inventori)
- [x] Buat komponen modal `CategoryModal.tsx` (tanpa browser `prompt()` / `alert()`)
- [x] Pasang modal kategori pada `MenuPanel.tsx` dan `InventoryPanel.tsx`

### [x] Phase 9: Automated Testing & Verifikasi Akhir
- [x] Jalankan `pnpm run test` (**6/6 Suites Passed, 14/14 Tests Passed**)
- [x] Jalankan `pnpm run build` (`tsc -b && vite build` passed cleanly in 2.38s)
- [x] Jalankan `pnpm run lint` (0 errors)
- [x] Catat hasil uji di `progress-test.md`
- [x] Menjaga aturan pengguna: **TIDAK ADA GIT COMMIT OTOMATIS** (semua file siap direview)

---

## ⚡ SPRINT 5: Cart Flexbox Scroll Fix, Per-Menu Additionals, Cash Helpers & Menu Catalog HPP Analysis
- [x] Phase 1: Cart Flexbox Scroll Fix & Height Hierarchy
  - [x] Kunci seluruh rantai tinggi CSS Flexbox dari `.app-content-body`, `.pos-view-split`, `.pos-right-column`, `.cart-items-scroll`, dan `.cart-panel-footer`
  - [x] Bersihkan nested wrapper ganda di `AppShell.tsx` dan pastikan keranjang belanja dapat di-scroll lancar saat menu banyak tanpa mendorong tombol bayar keluar layar
- [x] Phase 2: Types & Model for Per-Menu Additionals
  - [x] Tambahkan interface `IProductAdditional` di `src/types/index.ts`
  - [x] Tambahkan `availableAdditionals?: IProductAdditional[]` pada `IProduct`
- [x] Phase 3: Recipe Editor Additional Configuration & Seeder Update
  - [x] Tambahkan Seksi 3: "3. Pilihan Additional / Topping Menu" di `RecipeEditor.tsx`
  - [x] Hubungkan additional dengan bahan baku inventaris & kuantitas untuk kalkulasi HPP dan pemotongan stok otomatis
  - [x] Perbarui `seed.ts` dengan data demo additional realistis per-menu (Americano hanya Extra Shot tanpa susu; Latte memiliki Extra Shot, Sirup Vanilla, Sirup Karamel, Oat Milk)
- [x] Phase 4: Cashier Menu Card & Variant Modal Integration
  - [x] Di `MenuSidebar.tsx`, sediakan tombol `+ Additional` di bawah harga jual
  - [x] Di `VariantModal.tsx`, tampilkan hanya additional yang dikonfigurasi khusus untuk menu bersangkutan
- [x] Phase 5: Helper Nominal Pembayaran Tunai & Uang Pas
  - [x] Di `PaymentModal.tsx`, sediakan 4 helper: `20.000`, `50.000`, `100.000`, dan `Uang Pas`
  - [x] Di `pos.css`, tambahkan styling kontras tinggi untuk `.quick-denominations-row` dan `.denom-btn`
- [x] Phase 6: Analisis HPP & Margin di Kartu Kanan Katalog Menu
  - [x] Di `MenuPanel.tsx`, default produk terpilih otomatis ke produk pertama saat masuk halaman
  - [x] Tampilkan kartu analisis finansial lengkap: Harga Jual, HPP Dine-In & Takeaway, Laba Bersih (Rp), Margin (%), formula perkalian bahan resep, kemasan, dan additional aktif
- [x] Phase 7: Automated Testing & Verifikasi Akhir
  - [x] Jalankan `pnpm run test` (**7/7 Test Files Passed, 16/16 Tests Passed (100%)**)
  - [x] Jalankan `pnpm run build` (`tsc -b && vite build` lolos tanpa error dalam 2.75s)
  - [x] Jalankan `pnpm run lint` (`oxlint` lolos 0 error)
  - [x] Catat hasil uji di `progress-test.md`
  - [x] Patuhi aturan pengguna: **TIDAK ADA GIT COMMIT OTOMATIS** (semua file siap direview)






