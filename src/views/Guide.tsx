import { useState, type ReactNode } from 'react';
import { Icon, Ply } from '../components/ui';
import { MARKETPLACES, type Marketplace } from '../lib/marketplace';
import type { Source } from '../lib/types';

interface Card {
  source: Source;
  title: ReactNode;
  steps: ReactNode[];
  note: string;
}

const P = ({ children }: { children: ReactNode }) => <span className="path">{children}</span>;

const HPP_CARD = (name: string): Card => ({
  source: 'hpp',
  title: 'HPP per produk',
  steps: [<>Setelah upload, buka tab Produk &amp; HPP.</>, 'Ketik modal per unit tiap produk, atau unduh template lalu upload kembali.', 'Produk tanpa HPP tetap dihitung dengan estimasi, dan ditandai.'],
  note: `HPP satu-satunya angka yang tidak ada di laporan ${name} mana pun.`,
});

const SHOPEE: Card[] = [
  {
    source: 'order',
    title: 'File order',
    steps: [
      <>
        Buka <P>Pesanan Saya</P>.
      </>,
      'Pilih rentang tanggal pesanan, misalnya satu bulan penuh.',
      <>
        Klik <P>Export</P>, tunggu, lalu unduh file .xlsx.
      </>,
    ],
    note: 'Isinya: produk, jumlah, harga sebelum dan sesudah diskon, status, metode bayar.',
  },
  {
    source: 'income',
    title: 'File income',
    steps: [
      <>
        Buka <P>Keuangan › Penghasilan Saya</P>.
      </>,
      <>
        Pilih tab <P>Sudah Dilepas</P> dan periode yang sama.
      </>,
      <>
        Unduh <P>Laporan Penghasilan</P> (.xlsx).
      </>,
    ],
    note: 'Isinya: biaya admin, layanan, komisi AMS, ongkir, voucher, dan uang yang benar-benar kamu terima.',
  },
  {
    source: 'ads',
    title: (
      <>
        File iklan <span className="muted">(opsional)</span>
      </>
    ),
    steps: [
      <>
        Buka <P>Iklan Shopee › Laporan</P>.
      </>,
      'Pilih periode yang sama, tampilkan per hari kalau bisa.',
      'Unduh sebagai .csv.',
    ],
    note: 'Biaya iklan tidak ada di file income, padahal sering jadi biaya terbesar.',
  },
];

const TIKTOK: Card[] = [
  {
    source: 'order',
    title: 'File pesanan',
    steps: [
      <>
        Buka <P>TikTok Shop Seller Center › Pesanan › Kelola pesanan</P>.
      </>,
      <>
        Pilih tab <P>Semua</P> lalu atur filter tanggal dibuat, misalnya satu bulan penuh.
      </>,
      <>
        Klik <P>Ekspor</P>, pilih format Excel atau CSV, lalu unduh dari <P>Riwayat ekspor</P> setelah selesai.
      </>,
    ],
    note: 'Isinya: produk, SKU, jumlah, harga asli, subtotal setelah diskon, status, metode bayar. Bahasa Inggris atau Indonesia sama-sama terbaca.',
  },
  {
    source: 'income',
    title: 'File penyelesaian (settlement)',
    steps: [
      <>
        Buka <P>Keuangan › Laporan keuangan</P> (atau menu <P>Transaksi</P>).
      </>,
      <>
        Pilih pesanan yang <P>Sudah diselesaikan</P> untuk periode yang sama.
      </>,
      <>
        Klik <P>Ekspor</P> dan unduh file detail per pesanan.
      </>,
    ],
    note: 'Isinya: komisi platform, biaya layanan, komisi afiliasi, biaya transaksi, ongkir, dan total penyelesaian yang masuk ke saldo.',
  },
  {
    source: 'ads',
    title: (
      <>
        File iklan <span className="muted">(opsional)</span>
      </>
    ),
    steps: [
      <>
        Buka <P>TikTok Ads Manager</P> atau menu <P>Iklan › GMV Max</P> di Seller Center.
      </>,
      'Pilih periode yang sama, kelompokkan per hari, tampilkan kolom biaya (cost).',
      'Ekspor sebagai .csv atau .xlsx.',
    ],
    note: 'Biaya iklan dibayar terpisah dari saldo toko, jadi tidak ada di file penyelesaian.',
  },
];

export function Guide({ initial, onNext }: { initial: Marketplace; onNext: () => void }) {
  const [mp, setMp] = useState<Marketplace>(initial);
  const M = MARKETPLACES[mp];
  const cards = [...(M.id === 'tiktok' ? TIKTOK : SHOPEE), HPP_CARD(M.name)];
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Panduan {M.name}</h1>
          <p>
            Siapkan tiga file dari {M.center} untuk setiap toko, lalu isi HPP. Sekitar 5 menit per toko.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onNext}>
          Mulai upload
          <Icon name="arrow" />
        </button>
      </header>

      <div className="segmented" role="group" aria-label="Panduan untuk marketplace">
        {(['shopee', 'tiktok'] as Marketplace[]).map((id) => (
          <button key={id} aria-pressed={mp === id} onClick={() => setMp(id)}>
            {MARKETPLACES[id].name}
          </button>
        ))}
      </div>

      <div className="guide">
        {cards.map((c) => (
          <section key={c.source} className={`guide-card ${c.source}`} aria-labelledby={`g-${c.source}`}>
            <h2 id={`g-${c.source}`}>
              <Ply source={c.source} /> {c.title}
            </h2>
            <ol>
              {c.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="muted">{c.note}</p>
          </section>
        ))}
      </div>

      {M.id === 'tiktok' && (
        <section className="panel" aria-labelledby="g-tokped">
          <h2 id="g-tokped" className="section-title">
            Toko Tokopedia?
          </h2>
          <p className="verdict-line">Toko Tokopedia yang sudah pindah ke TikTok Shop Seller Center memakai menu dan format file yang sama. Pakai panduan di atas.</p>
          <p className="muted">Nama menu di Seller Center bisa berubah. Kalau menu di atas tidak ketemu, cari tombol Ekspor di halaman pesanan dan halaman keuangan.</p>
        </section>
      )}

      <section className="panel" aria-labelledby="g-why">
        <h2 id="g-why" className="section-title">
          Kenapa profit beda dengan "{M.payoutLabel}"?
        </h2>
        <p className="verdict-line">
          {M.payoutLabel} di {M.name} sudah dipotong {M.id === 'tiktok' ? 'komisi, biaya layanan, komisi afiliasi, biaya transaksi, dan ongkir' : 'biaya admin, layanan, komisi, ongkir, dan voucher'}. Tapi biaya iklan dan modal barang (HPP) belum. Profit Toko mengurangi keduanya, lalu menunjukkan dari file mana setiap angka berasal.
        </p>
        <p className="muted">
          <Icon name="lock" size={14} /> Semua file dibaca di browser ini. Tidak ada yang diunggah ke server.
        </p>
      </section>
    </>
  );
}
