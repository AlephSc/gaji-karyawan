# Gaji Karyawan — Event Payroll

Web app dasar untuk menghitung gaji karyawan berdasarkan **acara**, dengan pembagian kerja pemasangan dan pembongkaran per barang.

## MVP saat ini

- Data acara: nama, tanggal, lokasi, catatan.
- Jumlah karyawan bebas.
- Absensi hadir/tidak hadir per karyawan.
- Daftar barang dengan kuantitas per barang.
- Matriks kerja **karyawan × barang × aktivitas**.
- Setiap karyawan dapat memiliki kombinasi tugas berbeda, misalnya:
  - A: pasang + bongkar
  - B: pasang saja
  - C: bongkar saja
  - D: tidak ikut barang tersebut
- Tarif dasar hadir, tarif pasang/unit, dan tarif bongkar/unit dapat diatur per acara.
- Rekap gaji otomatis per karyawan dan total acara.
- Penyimpanan lokal browser dengan `localStorage`.
- Export data acara ke JSON.
- Responsive untuk desktop dan mobile.

## Model perhitungan MVP

`Gaji karyawan = tarif hadir (jika hadir) + (unit barang yang dipasang × tarif pasang) + (unit barang yang dibongkar × tarif bongkar)`

Kuantitas barang dihitung penuh untuk setiap karyawan yang ditugaskan pada aktivitas tersebut. Karena itu, sistem dapat mewakili pembagian tenaga kerja yang berbeda pada barang yang sama.

## Rencana pengembangan berikutnya

1. Tarif khusus per barang.
2. Tarif berbeda untuk setup, acara, dan teardown.
3. Absensi berbasis waktu masuk/keluar.
4. Role/jenis pekerjaan dan tarif per role.
5. Koreksi absensi dengan catatan/audit trail.
6. Ringkasan biaya per barang.
7. Export Excel/PDF.
8. Database dan multi-device sync.
9. Login admin/operator.
10. Riwayat banyak acara.

> Catatan: versi awal sengaja dibuat tanpa backend agar logika perhitungan dan UX dapat diuji terlebih dahulu.
