Sprint 2:


peringatan:
laptopku hanya menggunakan celeron n2930 + ram 4gb ddr 3, sebisa mungkin doing it lightly

Design: 
- responsiv untuk tablet first dan responsive menggunakan phone tetapi phone dipaksa untuk landscape. karena target device advan tab-10 bukan desktop maupun mobile, 
- aku ingin untuk designnya di buat warna monochrome basicnya hitam, itu permintaan user
- untuk [Master] menggunakan Icon hamburger
- ketika buka panel master dipastikan produk & stock tidak auto kebuka melainkan menunggu user click( state pertama tertutup)
- sebisa mungkin untuk bagian inventori  tidak ada minimal alert hanya ada(bahan/kemasan, kategori, Stock Saat ini:, Cost/unit, status Aksi) untuk alert atau notifikasi bisa di taruh di samping kiri kunci pin dengan icon lonceng dan tidak lupa ada countnya, lalu isian tambah bahan baru, editing, tambah stock mengikuti seperti modal yang dimiliki prortotype ku yang berada di folder projects/POS/pos-demo akan tetapi untuk design UInya tetep mengutamakan sederhana mengikuti design panel yang tidak memiliki banyak icon ataupun warna warna, dan jangan lupa bagian laporan pdf juga tidak batas minimal juga hilang, apakah menurut kamu bagian inventory perlu menggunakan periode tanggal atau hanya hari ini?
- bagian manajemen menu sebisa mungkin isi modal nya mengikuti di prototypeku, akan tetapi tetep untuk design UInya sederhana sesuai aplikasi ini, 
- untuk kasir menu tetap dibuat vertical seperti manajemen menu, dan untuk cart disampingnya mengikuti,
- untuk laporan penjualan, di pojok kiri atas ada periode tanggal seperti pada prototype ku, jadi user bisa milih dan juga ada helper untuk (hari ini, dan bulan ini), untuk bagian 4 card diatas sebisa mungkin berjudul (OMSET, TUNAI, QRIS, PROFIT) untuk keterangan di bawah hanya bagian omset saja yang berisikan x transaksi sukses dan x transaksi di batalkan. 
- yang jelas ketika ingin tutup modal dari pada menggunakan [tutup] menggunakan icon X saja warna merah,
- bagian setting, untuk pilihannya jangan langsung di buka seperti itu melainkan menggunakan modal (ganti pin, koneksi printer thermal, konfigurasi struk pelanggan, branding identitas aplikasi)
- notifikasi berisikan inventori tambah baru/edit/update stock, transaksi success/ dicancel, menu baru tambahan/edit/hapus, nanti ketika user click notifnya link ke sesuai yang ada di notifikasi, notifikasi ini bersifat 1x24 jam nanti notifnya dihapus
- fungsi log itu menyimpan permanen seperti sebelumnya kalau bisa dibuat enteng karena ini life time untuk lognya,


Goals:
-phase bisa dianggap berhasil apabila sudah melakukan testing secara automation apabila perlu menggunakan phone secara nyata bisa ask to me first, dan apabila ingin cuman liat UInya berjalan lancar bisa kamu lakukan di chrome ataupun chromium,
-setiap progress atau phase yang kamu buat harus wajib dituliskan di progress.md
-aplikasi bisa dianggap responsive apabila sudah compatible dengan tab aku pgen kamu kasih aku arahan gimana cara melihat dari sisi TAB

larangan:
- jangan commit dulu biar aku review
- jangan melakukan perubahan secara silently aku butuh transaparasi atau ditulis didalam progress.md
- tidak boleh melakukan implementasi diluar scope atau task tanpa menanyakan ke aku terlebih dahulu


helpeer:
prototype ada di folder projects/POS/pos-demo atau https://triwara-demo.netlify.app

testing:
- apabila kamu menemukan blocker fix blocker dulu baru lanjut ke phase selanjutnya atau fitur selanjutnya
- jangan lupa looping untuk testingnya, maximal 5x apabila menemukan masalah yang sama ke 5x berturut turut stop testing, dan buat file blocker.md
- smua progress testing dan implement testing yang akan kamu buat, kamu tulis di progress-test.md
- ingat apabila perlu phone tanyakan ke aku dahulu, apabila tidak perlu mobile phone just testing seperti perintah


