# Profit Toko

Dashboard profit dan cashflow untuk banyak toko Shopee dan TikTok Shop sekaligus (termasuk toko Tokopedia yang sudah pindah ke TikTok Shop Seller Center). Tambah satu kartu per toko, upload file pesanan, penghasilan/penyelesaian dan iklan, gabungkan produk yang sama antar toko, isi HPP sekali, lalu lihat profit gabungan dan per toko, cashflow mingguan, dan saran perbaikan yang diurutkan dari dampak rupiah terbesar.

Semua file dibaca dan dihitung di browser. Tidak ada server dan tidak ada data yang dikirim ke mana pun. Toko, data pesanan, HPP, produk gabungan, catatan pengeluaran dan saldo awal disimpan di IndexedDB browser ini (`src/lib/storage.ts`), jadi tidak perlu upload ulang. Tombol "Hapus semua data" di tab Upload menghapusnya.

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
| `src/lib/parse.ts` | Membaca .xlsx/.csv Shopee dan TikTok Shop, mengenali marketplace dan jenis file dari header, alias kolom bahasa Inggris/Indonesia dan versi laporan lama/baru |
| `src/lib/marketplace.ts` | Nama marketplace, label biaya dan jalur menu per marketplace |
| `src/lib/compute.ts` | Menggabungkan order + income + iklan + HPP + biaya operasional per baris order, per toko atau gabungan; alokasi iklan per toko; health score |
| `src/lib/cashflow.ts` | Arus kas per hari/minggu/bulan: dana dilepas, iklan, catatan pengeluaran, saldo berjalan, dana tertahan (estimasi) |
| `src/lib/storage.ts` | Simpan dan muat semua data di IndexedDB browser |
| `src/lib/insights.ts` | Aturan saran (iklan, produk rugi, di bawah modal, ongkir, HPP kosong, penurunan bulanan, dll.) |
| `src/lib/sample.ts` | Generator data contoh |
| `src/views/` | Enam tab: Panduan, Upload data (kartu per toko), Order & Income, Produk & HPP (gabung produk), Dashboard (sub-tab Profit dan Cashflow), Insight & saran |
| `src/components/` | Label sumber (ply), ikon, grafik SVG (waterfall, hari teramai, tren harian) |

## Rumus profit

```
Profit real = Omzet (harga setelah diskon)
            − Potongan Shopee (admin + layanan + AMS + proses pesanan + ongkir ditanggung)
            − Voucher penjual − Biaya iklan − HPP − Biaya lainnya
            − Biaya operasional (catatan gaji, packaging, sewa, lainnya)
```

Belanja stok hanya masuk cashflow, tidak mengurangi profit, karena modal barang sudah dihitung lewat HPP. Pengeluaran "Semua toko" dibagi ke tiap toko menurut omzet bulan itu.

Produk tanpa HPP memakai estimasi rasio HPP/harga rata-rata toko dan ditandai `*` sampai HPP diisi.

## Catatan

- Nama menu Seller Centre di tab Panduan ditulis dari ingatan; cek ulang dengan tampilan Seller Centre terbaru.
- Nama kolom Shopee dan TikTok Shop berubah antar versi laporan. Kalau sebuah file tidak dikenali, tambahkan alias kolomnya di `src/lib/parse.ts`.
- TikTok Shop: biaya diambil dari file penyelesaian (komisi platform, biaya layanan, komisi afiliasi, biaya transaksi, ongkir penjual). Diskon penjual sudah termasuk di subtotal pesanan, jadi tidak dihitung dua kali.
- Tarif biaya di data contoh hanya ilustrasi, bukan tarif resmi Shopee atau TikTok Shop.
