Statement:
fitur thermal akan diaktifkan 

goals:
-fitur thermal bisa befungsi dengan baik
-compatible dengan aplikasi POS yang aku buat
- memiliki handle yang baik

non goals:
-thermal bermasalah bukan urusan aplikasi
-perl koneksi internet

arsitektur:
- hadle eror pertama thermal tidak menggunakan queue melainkan batal progress atau  harus di cetak ulang
- apabila dari sisi aplikasi bisa mengecheck eror kenapa berikan error message yang baik apakah karena bluetooth mati, ataukah kertas habis, atau tidak menemukan printer?
- kalau printer mati ditengah tengah itu handlenya apakah di sisi aplikasi bisa mengetahui itu semua printernya kenapa?
- ketika user ingin cetak struk tanpa mengkonek kan printer diberi pemberitahuan bahwa printer belum tersambung atau semacamnya
- pastikan optimize untuk fitur printer ini


kendala:
aku tidak memiliki printer fisik untuk testing secara nyata, dan hanya memiliki hp dan bakal testing menggunakan oppo, jadi ini nanti ketika di sisi printer gak bisa test di development dulu melainkan menggunakan device langsung secara automation,

real condition:
aku tidak tau bentuk cetak struk untuk yang tidak ada di preview seperti sstruk dapur dan bar, secara asli karena tidak ad previewnya, apakah struk bar ini sudah ngehandle untuk colom additionalnya atau belum?

untuk rules bisa samakan dengan sebelumnya, dan tanyakan jika menemukan ambigu jangan jadi cenayang
