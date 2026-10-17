import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, Notice, Ply, Stat } from '../components/ui';
import type { Summary } from '../lib/compute';
import { num, rp } from '../lib/format';
import { downloadHppTemplate, parseFile, toNumber } from '../lib/parse';
import type { MarketplaceInfo } from '../lib/marketplace';
import type { HppMap } from '../lib/types';

interface Props {
  M: MarketplaceInfo;
  summary: Summary;
  products: string[];
  hpp: HppMap;
  onHpp: (next: HppMap) => void;
  toolbar: ReactNode;
  onNext: () => void;
}

export function Products({ M, summary, products, hpp, onHpp, toolbar, onNext }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'loss'; text: string } | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const stats = useMemo(() => new Map(summary.products.map((p) => [p.product, p])), [summary.products]);
  const missing = products.filter((p) => !(p in hpp));
  const rows = (onlyMissing ? missing : products)
    .map((p) => ({ name: p, s: stats.get(p) }))
    .sort((a, b) => (b.s?.sales ?? 0) - (a.s?.sales ?? 0));

  const setOne = (product: string, raw: string) => {
    const value = toNumber(raw);
    const next = { ...hpp };
    if (value > 0) next[product] = value;
    else delete next[product];
    onHpp(next);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      if (parsed.kind !== 'hpp') throw new Error(`${file.name} bukan file HPP. Pakai template dengan kolom "Nama Produk" dan "HPP per unit".`);
      const known = Object.keys(parsed.hpp).filter((p) => products.includes(p));
      onHpp({ ...hpp, ...parsed.hpp });
      setMessage({ tone: 'info', text: `${known.length} produk berhasil diisi HPP dari ${file.name}.` });
    } catch (e) {
      setMessage({ tone: 'loss', text: e instanceof Error ? e.message : 'File HPP tidak bisa dibaca.' });
    }
  };

  const avg = (a: number, b: number) => (b ? a / b : 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Produk &amp; HPP</h1>
          <p>Isi modal per unit (HPP) tiap produk. Ini satu-satunya angka yang tidak ada di laporan {M.name}.</p>
        </div>
        {toolbar}
      </header>

      <section className="panel" aria-labelledby="hpp-upload">
        <div className="panel-head">
          <h2 id="hpp-upload">Isi cepat dari Excel</h2>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={() => downloadHppTemplate(products, hpp)}>
              <Icon name="download" />
              Unduh template
            </button>
            <button className="btn btn-primary" onClick={() => input.current?.click()}>
              <Icon name="upload" />
              Upload file HPP
            </button>
          </div>
        </div>
        <p className="muted">Template berisi semua nama produk persis seperti di file order. Isi kolom HPP per unit, simpan, lalu upload kembali. Kamu tetap bisa mengubah HPP satu per satu di tabel.</p>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="visually-hidden"
          aria-label="Upload file HPP"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = '';
          }}
        />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </section>

      {missing.length > 0 ? (
        <Notice tone="warn">
          {missing.length} dari {products.length} produk belum ada HPP, jadi profitnya masih estimasi.{' '}
          <button className="btn btn-ghost" style={{ height: 'auto', padding: 0 }} onClick={() => setOnlyMissing((v) => !v)}>
            {onlyMissing ? 'Tampilkan semua produk' : 'Tampilkan yang belum diisi'}
          </button>
        </Notice>
      ) : (
        <Notice tone="info">Semua produk sudah punya HPP. Profit di dashboard sudah pasti, bukan estimasi.</Notice>
      )}

      <dl className="stats">
        <Stat source="order" label="Total terjual" value={`${num(summary.qty)} pcs`} href="#hpp-table" />
        <Stat source="order" label="Rata-rata harga awal" value={rp(avg(summary.salesOriginal, summary.qty))} href="#hpp-table" />
        <Stat source="order" label="Rata-rata harga jual" value={rp(avg(summary.omzet, summary.qty))} href="#hpp-table" />
        <Stat source="order" label="Sales harga awal" value={rp(summary.salesOriginal)} href="#hpp-table" />
        <Stat source="order" label="Sales setelah diskon" value={rp(summary.omzet)} href="#hpp-table" />
      </dl>

      <section className="panel panel-flush" aria-labelledby="hpp-table">
        <div className="panel-head">
          <h2 id="hpp-table">
            Daftar produk <Ply source="hpp" />
          </h2>
          <p>Diurutkan dari sales terbesar</p>
        </div>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="r">Terjual</th>
                <th className="r">Harga jual rata-rata</th>
                <th className="r">Sales</th>
                <th className="r">HPP per unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, s }) => {
                const has = name in hpp;
                return (
                  <tr key={name}>
                    <td className="product">
                      <span title={name}>{name}</span>
                    </td>
                    <td className="r" data-label="Terjual">{num(s?.qty ?? 0)} pcs</td>
                    <td className="r" data-label="Harga jual rata-rata">{rp(avg(s?.sales ?? 0, s?.qty ?? 0))}</td>
                    <td className="r" data-label="Sales">{rp(s?.sales ?? 0)}</td>
                    <td className="r ledger-input" data-label="HPP per unit">
                      <label className="visually-hidden" htmlFor={`hpp-${name}`}>
                        HPP per unit {name}
                      </label>
                      <input
                        id={`hpp-${name}`}
                        className={`input input-hpp${has ? '' : ' is-empty'}`}
                        inputMode="numeric"
                        placeholder="Isi HPP"
                        defaultValue={has ? num(hpp[name]) : ''}
                        key={`${name}-${hpp[name] ?? ''}`}
                        onBlur={(e) => setOne(name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>
                    <td data-label="Status">{has ? <span className="status ok">Lengkap</span> : <span className="status todo">Belum diisi</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onNext}>
          Lihat dashboard profit
          <Icon name="arrow" />
        </button>
      </div>
    </>
  );
}
