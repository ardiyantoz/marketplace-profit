# Profit Toko

Dashboard profit asli untuk toko Shopee. Upload file Order, Income (Laporan Penghasilan) dan Iklan dari Seller Centre, isi HPP per produk, lalu lihat profit real, penyebab rugi, dan saran perbaikan yang diurutkan dari dampak rupiah terbesar.

Semua file dibaca dan dihitung di browser. Tidak ada server dan tidak ada data yang dikirim ke mana pun. HPP disimpan di `localStorage` browser supaya tidak perlu diisi ulang.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil statis di dist/, bisa dibuka dari hosting statis mana pun
npm run typecheck
```

Belum punya file Shopee? Klik **Pakai data contoh** di tab Upload data. Data contoh adalah toko herbal fiktif dan selalu ditandai "Data contoh".

## Struktur

| Path | Isi |
| --- | --- |
| `src/lib/parse.ts` | Membaca .xlsx/.csv Shopee, mengenali jenis file dari header, alias kolom untuk versi laporan lama dan baru |
| `src/lib/compute.ts` | Menggabungkan order + income + iklan + HPP per baris order, alokasi biaya ke produk, health score |
| `src/lib/insights.ts` | Aturan saran (iklan, produk rugi, di bawah modal, ongkir, HPP kosong, penurunan bulanan, dll.) |
| `src/lib/sample.ts` | Generator data contoh |
| `src/views/` | Enam tab: Panduan, Upload data, Order & Income, Produk & HPP, Dashboard profit, Insight & saran |
| `src/components/` | Label sumber (ply), ikon, grafik SVG (waterfall, hari teramai, tren harian) |

## Rumus profit

```
Profit real = Omzet (harga setelah diskon)
            − Potongan Shopee (admin + layanan + AMS + proses pesanan + ongkir ditanggung)
            − Voucher penjual − Biaya iklan − HPP − Biaya lainnya
```

Produk tanpa HPP memakai estimasi rasio HPP/harga rata-rata toko dan ditandai `*` sampai HPP diisi.

## Catatan

- Nama menu Seller Centre di tab Panduan ditulis dari ingatan; cek ulang dengan tampilan Seller Centre terbaru.
- Nama kolom Shopee berubah antar versi laporan. Kalau sebuah file tidak dikenali, tambahkan alias kolomnya di `src/lib/parse.ts`.
