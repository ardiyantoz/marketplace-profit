import { useRef, useState, type DragEvent } from 'react';
import { Icon, Notice, Ply, StoreMark } from '../components/ui';
import { monthLabel, num } from '../lib/format';
import { MARKETPLACES, type Marketplace } from '../lib/marketplace';
import type { Dataset, FileMeta, FileSlot, Store } from '../lib/types';

interface Props {
  data: Dataset;
  errors: Record<string, string[]>;
  busy: string | null;
  productsMissingHpp: number;
  onFiles: (storeId: string, files: File[]) => void;
  onAddStore: (mp: Marketplace) => void;
  onUpdateStore: (id: string, patch: Partial<Pick<Store, 'name' | 'marketplace'>>) => void;
  onRemoveStore: (id: string) => void;
  onSample: () => void;
  onReset: () => void;
  onBackup: () => void;
  onRestore: (file: File) => Promise<boolean>;
  onNext: () => void;
}

const SLOTS: { key: FileSlot; title: string }[] = [
  { key: 'order', title: 'Order' },
  { key: 'income', title: 'Income' },
  { key: 'ads', title: 'Iklan' },
];

function months(meta: FileMeta) {
  if (!meta.months.length) return 'bulan tidak terbaca';
  if (meta.months.length === 1) return monthLabel(meta.months[0]);
  return `${monthLabel(meta.months[0], true)} – ${monthLabel(meta.months[meta.months.length - 1], true)}`;
}

function StoreCard({ store, errors, busy, onFiles, onUpdate, onRemove }: { store: Store; errors: string[]; busy: boolean; onFiles: (f: File[]) => void; onUpdate: Props['onUpdateStore']; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const M = MARKETPLACES[store.marketplace];
  const locked = !!store.files.order || !!store.files.income;

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  };

  return (
    <section
      className={`store-card${over ? ' over' : ''}`}
      aria-label={`Toko ${store.name}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <div className="store-card-head">
        <StoreMark store={store} />
        <div className="store-fields">
          <label className="visually-hidden" htmlFor={`nama-${store.id}`}>
            Nama toko
          </label>
          <input id={`nama-${store.id}`} className="input store-name" value={store.name} onChange={(e) => onUpdate(store.id, { name: e.target.value })} />
          <label className="visually-hidden" htmlFor={`mp-${store.id}`}>
            Marketplace
          </label>
          <select id={`mp-${store.id}`} className="select" value={store.marketplace} disabled={locked} title={locked ? 'Marketplace terkunci karena file sudah diupload' : undefined} onChange={(e) => onUpdate(store.id, { marketplace: e.target.value as Marketplace })}>
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
          </select>
        </div>
        {confirm ? (
          <div className="toolbar">
            <span className="muted">Hapus toko dan datanya?</span>
            <button className="btn btn-danger" onClick={onRemove}>
              Hapus
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Batal
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirm(true)} aria-label={`Hapus toko ${store.name}`}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      <div className="slots">
        {SLOTS.map((slot) => {
          const meta = store.files[slot.key];
          return (
            <div key={slot.key} className={`slot ${slot.key}${meta ? '' : ' empty'}`}>
              <div className="slot-head">
                <Ply source={slot.key} />
                {meta ? <span className="num">{num(meta.rows)} baris</span> : <span className="muted">{slot.key === 'ads' ? 'opsional' : 'wajib'}</span>}
              </div>
              {meta ? (
                <>
                  {(meta.names?.length ?? 1) > 1 ? (
                    <>
                      <p className="slot-name">{meta.names!.length} file digabung</p>
                      <p className="muted slot-files">{meta.names!.join(' · ')}</p>
                    </>
                  ) : (
                    <p className="slot-name">{meta.name}</p>
                  )}
                  <p className="muted">{months(meta)}</p>
                  {meta.warnings.map((w) => (
                    <p key={w} className="warn">
                      {w}
                    </p>
                  ))}
                </>
              ) : (
                <p className="muted">{M.slots[slot.key].replace(/^(Wajib|Opsional) · /, '')}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
          <Icon name="upload" />
          {busy ? 'Membaca file…' : `Upload file ${M.name}`}
        </button>
        <span className="muted">atau tarik file ke kartu ini. Jenis file dikenali otomatis.</span>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        className="visually-hidden"
        aria-label={`Pilih file untuk ${store.name}`}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      {errors.map((e) => (
        <Notice key={e} tone="loss">
          {e}
        </Notice>
      ))}
      {store.files.order && !store.files.income && <Notice tone="warn">File income belum ada. Potongan {M.name} toko ini dianggap Rp0, jadi profitnya terlihat lebih besar dari aslinya.</Notice>}
    </section>
  );
}

export function Upload({ data, errors, busy, productsMissingHpp, onFiles, onAddStore, onUpdateStore, onRemoveStore, onSample, onReset, onBackup, onRestore, onNext }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<'ok' | 'bad' | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const stores = data.sample ? [] : data.stores;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Upload data</h1>
          <p>Satu kartu untuk satu toko. Beri nama, lalu upload file order, income dan iklan toko itu. Toko Shopee dan TikTok Shop boleh dicampur.</p>
        </div>
        <div className="toolbar">
          {data.orders.length > 0 &&
            (confirmReset ? (
              <>
                <span className="muted">Hapus semua toko dan data?</span>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onReset();
                    setConfirmReset(false);
                  }}
                >
                  Hapus semua
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                  Batal
                </button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
                Hapus semua data
              </button>
            ))}
          <button className="btn btn-primary" onClick={onNext} disabled={!data.orders.length}>
            Lanjut
            <Icon name="arrow" />
          </button>
        </div>
      </header>

      {data.sample && (
        <Notice tone="info">
          Sedang memakai <b>data contoh</b>: 3 toko herbal fiktif (2 Shopee, 1 TikTok Shop). Tambah toko pertamamu untuk menggantinya; data contoh akan dihapus.
        </Notice>
      )}

      {stores.map((s) => (
        <StoreCard key={s.id} store={s} errors={errors[s.id] ?? []} busy={busy === s.id} onFiles={(f) => onFiles(s.id, f)} onUpdate={onUpdateStore} onRemove={() => onRemoveStore(s.id)} />
      ))}

      <div className={`add-store${stores.length ? '' : ' first'}`}>
        <div>
          <h2>{stores.length ? 'Tambah toko lain' : 'Tambah toko pertamamu'}</h2>
          <p className="muted">Punya beberapa toko yang menjual produk sama? Tambahkan semua; dashboard menggabungkan dan membandingkannya.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => onAddStore('shopee')}>
            <Icon name="plus" />
            Toko Shopee
          </button>
          <button className="btn btn-primary" onClick={() => onAddStore('tiktok')}>
            <Icon name="plus" />
            Toko TikTok Shop
          </button>
          {!stores.length && (
            <button className="btn btn-secondary" onClick={onSample}>
              Pakai data contoh
            </button>
          )}
        </div>
      </div>

      {stores.length > 0 && productsMissingHpp > 0 && data.orders.length > 0 && (
        <Notice tone="info">
          {productsMissingHpp} produk belum punya HPP. Lanjut ke tab Produk &amp; HPP untuk mengisi dan menggabungkan produk yang sama antar toko.
        </Notice>
      )}
      <section className="backup">
        <div>
          <h2>Backup data</h2>
          <p className="muted">Data hanya ada di browser ini. Simpan file backup secara berkala, lalu pulihkan di sini kalau pindah PC, ganti browser atau riwayat browser terhapus.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-secondary" onClick={onBackup} disabled={!data.stores.length || data.sample}>
            Simpan backup
          </button>
          <button className="btn btn-ghost" onClick={() => restoreInput.current?.click()}>
            Pulihkan dari backup
          </button>
          <input
            ref={restoreInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) setRestoreMsg((await onRestore(file)) ? 'ok' : 'bad');
            }}
          />
        </div>
        {restoreMsg === 'ok' && <Notice tone="info">Backup dipulihkan. Data sebelumnya di browser ini sudah diganti.</Notice>}
        {restoreMsg === 'bad' && <Notice tone="warn">File ini bukan backup Profit Toko. Pilih file profit-toko-backup-….json.</Notice>}
      </section>
      <p className="muted">
        <Icon name="lock" size={14} /> File dibaca dan disimpan di browser ini saja. Tidak ada yang dikirim ke server.
      </p>
    </>
  );
}
