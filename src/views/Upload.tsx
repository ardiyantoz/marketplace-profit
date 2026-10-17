import { useRef, useState, type DragEvent } from 'react';
import { Icon, Notice, Ply } from '../components/ui';
import { monthLabel, num } from '../lib/format';
import type { MarketplaceInfo } from '../lib/marketplace';
import type { Dataset, FileMeta } from '../lib/types';

interface Props {
  M: MarketplaceInfo;
  data: Dataset;
  errors: string[];
  busy: boolean;
  productsMissingHpp: number;
  onFiles: (files: File[]) => void;
  onSample: () => void;
  onReset: () => void;
  onNext: () => void;
}

const SLOTS: { key: 'order' | 'income' | 'ads'; title: string }[] = [
  { key: 'order', title: 'File order' },
  { key: 'income', title: 'File income' },
  { key: 'ads', title: 'File iklan' },
];

function months(meta: FileMeta) {
  if (!meta.months.length) return 'bulan tidak terbaca';
  if (meta.months.length === 1) return monthLabel(meta.months[0]);
  return `${monthLabel(meta.months[0], true)} – ${monthLabel(meta.months[meta.months.length - 1], true)}`;
}

export function Upload({ M, data, errors, busy, productsMissingHpp, onFiles, onSample, onReset, onNext }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const ready = !!data.files.order && !!data.files.income;

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Upload data</h1>
          <p>Masukkan file pesanan dan penghasilan dari {M.name}. File iklan dan template HPP boleh ikut sekaligus; jenisnya dikenali otomatis.</p>
        </div>
        <div className="toolbar">
          {data.orders.length > 0 && (
            <button className="btn btn-ghost" onClick={onReset}>
              Hapus semua data
            </button>
          )}
          <button className="btn btn-primary" onClick={onNext} disabled={!data.orders.length}>
            Lanjut
            <Icon name="arrow" />
          </button>
        </div>
      </header>

      <div
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <Icon name="upload" size={28} />
        <h2>{busy ? 'Membaca file…' : 'Tarik file ke sini'}</h2>
        <p className="muted">.xlsx atau .csv dari {M.center}. Boleh beberapa file sekaligus, termasuk beberapa bulan.</p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}>
            Pilih file
          </button>
          <button className="btn btn-secondary" onClick={onSample} disabled={busy}>
            Pakai data contoh
          </button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="visually-hidden"
          aria-label={`Pilih file laporan ${M.name}`}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) onFiles(files);
            e.target.value = '';
          }}
        />
      </div>

      {errors.map((e) => (
        <Notice key={e} tone="loss">
          {e}
        </Notice>
      ))}

      {data.sample && (
        <Notice tone="info">
          Sedang memakai <b>data contoh {M.name}</b> (toko herbal fiktif). Upload file tokomu untuk menggantinya.
        </Notice>
      )}

      <div className="files">
        {SLOTS.map((slot) => {
          const meta = data.files[slot.key];
          return (
            <section key={slot.key} className={`file-card ${slot.key}${meta ? '' : ' empty'}`} aria-label={slot.title}>
              <h3>
                <span>{slot.title}</span>
                <Ply source={slot.key} />
              </h3>
              {meta ? (
                <>
                  <p>{meta.name}</p>
                  <p className="num">
                    {num(meta.rows)} baris · {months(meta)}
                  </p>
                  {meta.warnings.map((w) => (
                    <p key={w} className="warn">
                      {w}
                    </p>
                  ))}
                </>
              ) : (
                <p>{M.slots[slot.key]}</p>
              )}
            </section>
          );
        })}
      </div>

      {data.orders.length > 0 && !ready && <Notice tone="warn">File income belum ada. Biaya {M.name} akan dianggap Rp0 sampai file income diupload, jadi profit akan terlihat lebih besar dari aslinya.</Notice>}
      {ready && productsMissingHpp > 0 && (
        <Notice tone="info">
          {productsMissingHpp} produk belum punya HPP. Lanjut ke tab Produk &amp; HPP untuk mengisinya.
        </Notice>
      )}
    </>
  );
}
