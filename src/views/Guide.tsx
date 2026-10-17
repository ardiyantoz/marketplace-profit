import { Icon, Ply } from '../components/ui';

export function Guide({ onNext }: { onNext: () => void }) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Panduan</h1>
          <p>Siapkan tiga file dari Shopee Seller Centre, lalu isi HPP. Sekitar 5 menit.</p>
        </div>
        <button className="btn btn-primary" onClick={onNext}>
          Mulai upload
          <Icon name="arrow" />
        </button>
      </header>

      <div className="guide">
        <section className="guide-card order" aria-labelledby="g-order">
          <h2 id="g-order">
            <Ply source="order" /> File order
          </h2>
          <ol>
            <li>
              Buka <span className="path">Pesanan Saya</span>.
            </li>
            <li>Pilih rentang tanggal pesanan, misalnya satu bulan penuh.</li>
            <li>
              Klik <span className="path">Export</span>, tunggu, lalu unduh file .xlsx.
            </li>
          </ol>
          <p className="muted">Isinya: produk, jumlah, harga sebelum dan sesudah diskon, status, metode bayar.</p>
        </section>

        <section className="guide-card income" aria-labelledby="g-income">
          <h2 id="g-income">
            <Ply source="income" /> File income
          </h2>
          <ol>
            <li>
              Buka <span className="path">Keuangan › Penghasilan Saya</span>.
            </li>
            <li>
              Pilih tab <span className="path">Sudah Dilepas</span> dan periode yang sama.
            </li>
            <li>
              Unduh <span className="path">Laporan Penghasilan</span> (.xlsx).
            </li>
          </ol>
          <p className="muted">Isinya: biaya admin, layanan, komisi AMS, ongkir, voucher, dan uang yang benar-benar kamu terima.</p>
        </section>

        <section className="guide-card ads" aria-labelledby="g-ads">
          <h2 id="g-ads">
            <Ply source="ads" /> File iklan <span className="muted">(opsional)</span>
          </h2>
          <ol>
            <li>
              Buka <span className="path">Iklan Shopee › Laporan</span>.
            </li>
            <li>Pilih periode yang sama, tampilkan per hari kalau bisa.</li>
            <li>Unduh sebagai .csv.</li>
          </ol>
          <p className="muted">Biaya iklan tidak ada di file income, padahal sering jadi biaya terbesar.</p>
        </section>

        <section className="guide-card hpp" aria-labelledby="g-hpp">
          <h2 id="g-hpp">
            <Ply source="hpp" /> HPP per produk
          </h2>
          <ol>
            <li>Setelah upload, buka tab Produk &amp; HPP.</li>
            <li>Ketik modal per unit tiap produk, atau unduh template lalu upload kembali.</li>
            <li>Produk tanpa HPP tetap dihitung dengan estimasi, dan ditandai.</li>
          </ol>
          <p className="muted">HPP satu-satunya angka yang tidak ada di laporan Shopee mana pun.</p>
        </section>
      </div>

      <section className="panel" aria-labelledby="g-why">
        <h2 id="g-why" className="section-title">Kenapa profit beda dengan "Total Penghasilan"?</h2>
        <p className="verdict-line">
          Total Penghasilan di Shopee sudah dipotong biaya admin, layanan, komisi, ongkir, dan voucher. Tapi biaya iklan dan modal barang (HPP) belum. Profit Toko mengurangi keduanya, lalu menunjukkan dari file mana setiap angka berasal.
        </p>
        <p className="muted">
          <Icon name="lock" size={14} /> Semua file dibaca di browser ini. Tidak ada yang diunggah ke server.
        </p>
      </section>
    </>
  );
}
