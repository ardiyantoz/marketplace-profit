import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, Notice, Ply, Stat, StoreTag } from '../components/ui';
import { allProducts, type Summary } from '../lib/compute';
import { num, rp } from '../lib/format';
import { downloadHppTemplate, parseFile, toNumber } from '../lib/parse';
import { rawKey, type Dataset, type Settings } from '../lib/types';

interface Props {
  data: Dataset;
  settings: Settings;
  onSettings: (fn: (s: Settings) => Settings) => void;
  summary: Summary;
  toolbar: ReactNode;
  onNext: () => void;
}

export function Products({ data, settings, onSettings, summary, toolbar, onNext }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'loss'; text: string } | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const products = useMemo(() => allProducts(data, settings), [data, settings]);
  const stats = useMemo(() => new Map(summary.products.map((p) => [p.id, p])), [summary.products]);
  const storeOf = useMemo(() => new Map(data.stores.map((s) => [s.id, s])), [data.stores]);
  const multiStore = data.stores.length > 1;
  const missing = products.filter((p) => !(p.id in settings.hpp));
  const rows = (onlyMissing ? missing : products)
    .map((p) => ({ p, s: stats.get(p.id) }))
    .sort((a, b) => (b.s?.sales ?? 0) - (a.s?.sales ?? 0));

  const setOne = (id: string, raw: string) => {
    const value = toNumber(raw);
    onSettings((s) => {
      const hpp = { ...s.hpp };
      if (value > 0) hpp[id] = value;
      else delete hpp[id];
      return { ...s, hpp };
    });
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickedProducts = products.filter((p) => picked.includes(p.id));
  const suggestion = pickedProducts.map((p) => p.label.split(/ [-|] /)[0]).sort((a, b) => a.length - b.length)[0] ?? '';

  const merge = () => {
    const name = (groupName || suggestion).trim();
    if (!name || pickedProducts.length < 2) return;
    onSettings((s) => {
      const merges = { ...s.merges };
      const hpp = { ...s.hpp };
      const existing = pickedProducts.map((p) => s.hpp[p.id]).find((v) => v !== undefined);
      for (const p of pickedProducts) {
        for (const r of p.raw) merges[rawKey(r.storeId, r.product)] = name;
        delete hpp[p.id];
      }
      if (existing !== undefined) hpp[`g::${name}`] = existing;
      return { ...s, merges, hpp };
    });
    setMessage({ tone: 'info', text: `${pickedProducts.length} produk digabung menjadi "${name}".` });
    setPicked([]);
    setGroupName('');
  };

  const split = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    onSettings((s) => {
      const merges = { ...s.merges };
      const hpp = { ...s.hpp };
      const v = s.hpp[id];
      for (const r of p.raw) {
        delete merges[rawKey(r.storeId, r.product)];
        if (v !== undefined) hpp[rawKey(r.storeId, r.product)] = v;
      }
      delete hpp[id];
      return { ...s, merges, hpp };
    });
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      if (parsed.kind !== 'hpp') throw new Error(`${file.name} bukan file HPP. Pakai template dengan kolom "Nama Produk" dan "HPP per unit".`);
      onSettings((s) => {
        const hpp = { ...s.hpp };
        for (const p of products) {
          const v = parsed.hpp[p.label] ?? p.raw.map((r) => parsed.hpp[r.product]).find((x) => x !== undefined);
          if (v) hpp[p.id] = v;
        }
        return { ...s, hpp };
      });
      setMessage({ tone: 'info', text: `HPP dari ${file.name} sudah diisi ke produk yang namanya cocok.` });
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
          <p>Isi modal per unit (HPP) tiap produk.{multiStore ? ' Produk yang sama di beberapa toko bisa digabung, jadi HPP cukup diisi sekali.' : ''}</p>
        </div>
        {toolbar}
      </header>

      <section className="panel" aria-labelledby="hpp-upload">
        <div className="panel-head">
          <h2 id="hpp-upload">Isi cepat dari Excel</h2>
          <div className="toolbar">
            <button
              className="btn btn-secondary"
              onClick={() =>
                downloadHppTemplate(
                  products.map((p) => p.label),
                  Object.fromEntries(products.map((p) => [p.label, settings.hpp[p.id]]).filter(([, v]) => v !== undefined)),
                )
              }
            >
              <Icon name="download" />
              Unduh template
            </button>
            <button className="btn btn-primary" onClick={() => input.current?.click()}>
              <Icon name="upload" />
              Upload file HPP
            </button>
          </div>
        </div>
        <p className="muted">Template berisi semua nama produk persis seperti di daftar di bawah. Isi kolom HPP per unit, simpan, lalu upload kembali.</p>
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
        <Stat source="order" label="Rata-rata harga jual" value={rp(avg(summary.omzet, summary.qty))} href="#hpp-table" />
        <Stat source="order" label="Sales setelah diskon" value={rp(summary.omzet)} href="#hpp-table" />
        <Stat source="hpp" label="Produk dengan HPP" value={`${products.length - missing.length} dari ${products.length}`} href="#hpp-table" />
      </dl>

      {multiStore && (
        <div className={`merge-bar${picked.length ? ' active' : ''}`} role="region" aria-label="Gabungkan produk">
          {picked.length < 2 ? (
            <p>
              <Icon name="merge" size={16} /> Centang 2 produk atau lebih yang sebenarnya sama (dari toko berbeda), lalu gabungkan.
              {picked.length === 1 && ' Pilih satu lagi.'}
            </p>
          ) : (
            <>
              <p>
                <b>{picked.length} produk dipilih.</b> Nama gabungan:
              </p>
              <label className="visually-hidden" htmlFor="nama-gabung">
                Nama produk gabungan
              </label>
              <input id="nama-gabung" className="input" placeholder={suggestion} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <button className="btn btn-primary" onClick={merge}>
                <Icon name="merge" size={16} />
                Gabungkan
              </button>
              <button className="btn btn-ghost" onClick={() => setPicked([])}>
                Batal
              </button>
            </>
          )}
        </div>
      )}

      <section className="panel panel-flush" aria-labelledby="hpp-table" id="hpp-table">
        <div className="panel-head">
          <h2 id="hpp-table-title">
            Daftar produk <Ply source="hpp" />
          </h2>
          <p>Diurutkan dari sales terbesar</p>
        </div>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                {multiStore && <th aria-label="Pilih" />}
                <th>Produk</th>
                <th className="r">Terjual</th>
                <th className="r">Harga jual rata-rata</th>
                <th className="r">Sales</th>
                <th className="r">HPP per unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s }) => {
                const has = p.id in settings.hpp;
                const merged = p.id.startsWith('g::');
                return (
                  <tr key={p.id} className={picked.includes(p.id) ? 'picked' : undefined}>
                    {multiStore && (
                      <td className="pick">
                        <input type="checkbox" aria-label={`Pilih ${p.label} untuk digabung`} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                      </td>
                    )}
                    <td className="product">
                      <span title={p.label}>{p.label}</span>
                      {multiStore && (
                        <span className="product-stores">
                          {p.raw.map((r) => {
                            const st = storeOf.get(r.storeId);
                            return st ? <StoreTag key={r.storeId + r.product} store={st} /> : null;
                          })}
                          {merged && (
                            <button className="link-btn" onClick={() => split(p.id)}>
                              Pisahkan
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="r" data-label="Terjual">
                      {num(s?.qty ?? 0)} pcs
                    </td>
                    <td className="r" data-label="Harga jual rata-rata">
                      {rp(avg(s?.sales ?? 0, s?.qty ?? 0))}
                    </td>
                    <td className="r" data-label="Sales">
                      {rp(s?.sales ?? 0)}
                    </td>
                    <td className="r ledger-input" data-label="HPP per unit">
                      <label className="visually-hidden" htmlFor={`hpp-${p.id}`}>
                        HPP per unit {p.label}
                      </label>
                      <input
                        id={`hpp-${p.id}`}
                        className={`input input-hpp${has ? '' : ' is-empty'}`}
                        inputMode="numeric"
                        placeholder="Isi HPP"
                        defaultValue={has ? num(settings.hpp[p.id]) : ''}
                        key={`${p.id}-${settings.hpp[p.id] ?? ''}`}
                        onBlur={(e) => setOne(p.id, e.target.value)}
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
          Lihat dashboard
          <Icon name="arrow" />
        </button>
      </div>
    </>
  );
}
