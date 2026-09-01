optimize:

Statement masalah:
aku belum tau pasti aplikasi ini performancenya sudah bagus ataupun tidak, apakah penggunaan caching nya sudah baik atau belum aku juga belum memahaminya tapi garis besar arsitekturnya yang akan ku buat sudah jelas dan akan perombakan besar didalam nya terutama dibagian optimize data,

Goals:
- aplikasi ini harus bertahan hingga 3 tahun lebih
- aplikasi ini harus bejralan secara smooth dan light di sisi client
- pihak user mau data laporan berdasarkan pdf
- zero maintenance ketika sudah di tangan user dan minim big bug
- tidak memerlukan internet sama sekali
- bluetooth untuk printer berfungsi dengan baik, tidak ada dari application error handle dengan baik
- pembuatan folder baru untuk pdf di device client dan 3 pengelompokan (laporan penjualan, stock, rekap shift) untuk nama bisa sesuai yang sekarang
- kepuasan client dengan aplikasinya
- backup data

Non goals:
- printer error atau hardware error
- aplikasi memerlukan internet
- tampilan yang mewah sehingga memberatkan device


real case: 
- transaksi harian tidak akan lebih dari 200 transaksi karena coffeshop ini berjalan hanya 8 jam, untuk sampai 100 transaksi per hari hampir tidak mungkin kecuali total item terjual bisa lebih dari 100 bisa
- user kurang responsive aku tidak akan setup aplikasi secara nyata tidak ada dummy atau template stock dan menu, aku akan input manual terlebih dahulu didalam aplikasi ketika aplikasi sudah berjalan
- user ingin melakukan testnya bukan hanya di printer tapi full flow aplikasi jadi aku harus deliver aplikasinya langsung bisa berfungsi baik dari perhitungan maupun printernya
- tidak ada user karyawan, yang ada hanya owner dan satu saja
- shift itu realitanya hanya 3 dalam 24 jam , jadi untuk filter periode tanggal agak aneh tapi kadang juga butuh kalau ingin menyelam jauh, tapi pagination disini dibuat limit 5 tidak masalah, walaupun kalau sudah nyentuh filter hari apa tidak bakal lebih dari 5


in general:
- aku harus memvalidasi dibeberapa tempat secara strict agar tidak ada miss match kalkulasi
- aplikasi harus memiliki handle error , loading state, dan instruksi yang jelas tanpa merusak UI
- tidak ada perubahan hak akses, ada batasan antara karyawan dan owner masih seperti sekaranga

Feature:
1. POS
   - overall secara visual sudah bagus yang aku harapkan
   - kalkulasi , discount, handle metode sudah berjalan
2. Riwayat transaksi
	- aku memutuskan riwayat transaksi itu berdiri sendiri dan tidak ada di laporan penjualan,
	- dia punya pdf stand alone juga yang berisi hanya riwayat transaksi
	- tetap ini dibisa diakses owner maupun karyawan/kasir
	- bersifat immutable
3. Shift
	- ada sedikit perbaikan aku tidak melihat dengan teliti bahwa table yang ditampilkan transaksi tunai dan qris bukan uangnya melainkan pesanan, harusnya total nominalnya
	- perbaikan di pdf untuk urutan nya dan isiannya kita ganti sedikit (Kas Awal, Total Penjualan Cash, Total penjualan Qris, Total Penjualan Omset, Uang tunai (Kas + Penjualan Cash), Pengeluaran Kasir, Selisih, Total Transaksi Selsai, Total Pesanan Dibatalkan) lalu dibawahnya rincian pembelian itu tidak usah diubah
4. Bahan Stock
	- aku masih bingung ini sistem edit ini apakah dia mengganti harga awal atau mengganti keseluruhan harga soalnya kalau keseluruhan harga atau hanya yang habis di restock? soalnya bikin miss match hpp.
	- yang jelas bagian edit ini kalau misal fitur nya ada hanya boleh mengganti batas minimal, harga dan jumlah dihilangkan dan juga hasil cost lainnya, nama pun tidak boleh diganti karena bikin miss match, jadi murni fitur ini hanya untuk ganti alert notification atau batas minimal, tetapi bisa dihapus tapi dikasi validasi apabila menu masih menggunakan bahan ini dikasi penjelasan di modalnya, dan juga dimodalnya berisikan menu apa saja yang menggunakan bahan ini, jadi fiturnya bukan edit tapi detail
	- dibagian tambah bahan baru dikasi peringatan bahwa bahan tidak bisa diganti atau di edit,
	- sama ada tambahan kelola satuan ukur
5. Manajemen Menu
	- tambah menu baru harus divalidasi setiap kolomnya harus di isi kecuali deskripsi dan additional
	- tampilan cardnya sudah bagus tidak ada revisi
6. Laporan Penjualan
	- Sekarang fitur ini hanya menampilkan Card cardnya saja, riwayat transaksi di hapus total dari laporan penjualan.
	- untuk Pdfnya berarti hanya ada 1 halaman yaitu berisi semua cardnya ini
	- untuk periodenya tetap ada disitu
7. Log
	- tidak ada perubahan
8. Pengaturan
	- ketika sudah sampai ketangan customer cuman ada , Koneksi thermal, kelola karyawan, konfigurasi struk, Branding Identitas Aplikasi
	- - pembuatan fitur baru untuk backup and bersihkan transaksi tahun lalu, file berkas menjadi excel,


Arsitektur:
- pastikan optimize untuk setiap service, ingat fungsi utama di aplikasi ini adalah aplikasi ini berjalan lancar di client, untuk masalah jadi spageti code gapapa bisa diurus nanti karena memang target zero bug dan tanpa maintenance biar aplikasi ini berjalan terus
- perbaikan Logika Agregasi Masih Campur dengan Kueri Database
- khusus "hari ini" masih membaca tabel order itu diperbaiki seperti yang kita bahas
- kamu bisa check ulang kembali semua fitur logic bisnis jangan sampai kecolongan intinya fokus ke optimize karena fitur sudah oke intinya bagian DATA bukan UI

Rules: 
- jangan melakukan perubahan UI
- apabila perlu optimize diluar yang kutulis setelah kamu check semuanya kembali khusus data mangement jangan langsung kamu jalankan atau perbaiki masukan itu ke scope berikutnya
- 1 fitur itu 1 scope , kalau udah  merembet keluar fitur simpan dan lakukan di next phase
- kamu boleh commit tapi dengan penjelasan yang jelas tapi singkat, 
- setiap ada perubahan jangan dilakukan secara diam diam kamu bisa memberikanku penjelasan, goals, dan apa yang dirubah secara jelas bisa kamu tuliskan di progress.md
- apabila perlu campur tanganku bisa kamu stop phase nya biar aku bantu
- buat to do list untuk setiap phase dan tandai jika sudah berhasil

test:
- setiap ketemu blocker pastikan selesaikan blockernya dahulu dan bisa kamu tuliskan di test.md
- tiap phase memerlukan testing dan ketika semua phase sudah selesai lakukan test untuk keseluruhan
- maximal gagal test 5x setelah 5x gagal proses dihentikan dan berikan aku laporan apa yang menyebabkannya


penanda phase itu done:
- test sudah dilakukan dan semua success
- pastikan tidak ada kecolongan disetiap phase,
- jangan sampai ada perubahan UI kecuali emang ada kutuliskan


Catatan:
Setelah kamu membaca semua yang diatas, kamu boleh menanyakan apa yang menurut kamu ambigue atau detail apa yang kurang, jangan menjadi cenayang pokoknya tanyakan apa yang perlu kamu tau, sebelum mulai optimization ini, 
