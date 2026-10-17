import { useCallback, useEffect, useMemo, useState } from 'react';
import { allMonths, allProducts, summarize, type MonthFilter } from './lib/compute';
import { monthLabel, num, prevMonth } from './lib/format';
import { buildInsights } from './lib/insights';
import { MARKETPLACES, type Marketplace } from './lib/marketplace';
import { parseFile } from './lib/parse';
import { sampleDataset, sampleHpp } from './lib/sample';
import { emptyDataset, type Dataset, type HppMap } from './lib/types';
import { NoData } from './components/ui';
import { Guide } from './views/Guide';
import { Upload } from './views/Upload';
import { OrderIncome } from './views/OrderIncome';
import { Products } from './views/Products';
import { Dashboard } from './views/Dashboard';
import { Insights } from './views/Insights';

export type Tab = 'panduan' | 'upload' | 'order' | 'produk' | 'dashboard' | 'insight';

const TABS: { id: Tab; label: string }[] = [
  { id: 'panduan', label: 'Panduan' },
  { id: 'upload', label: 'Upload data' },
  { id: 'order', label: 'Order & Income' },
  { id: 'produk', label: 'Produk & HPP' },
  { id: 'dashboard', label: 'Dashboard profit' },
  { id: 'insight', label: 'Insight & saran' },
];

const HPP_KEY = 'profit-toko:hpp';

function loadHpp(): HppMap {
  try {
    return JSON.parse(localStorage.getItem(HPP_KEY) ?? '{}') as HppMap;
  } catch {
    return {};
  }
}

function dedupe<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) seen.set(key(r), r);
  return [...seen.values()];
}

export default function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [data, setData] = useState<Dataset>(emptyDataset);
  const [hpp, setHpp] = useState<HppMap>(loadHpp);
  const [month, setMonth] = useState<MonthFilter>('all');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<Marketplace>('shopee');
  const M = MARKETPLACES[data.marketplace ?? choice];

  useEffect(() => {
    if (data.sample) return;
    try {
      localStorage.setItem(HPP_KEY, JSON.stringify(hpp));
    } catch {
      /* storage unavailable: HPP lives for this session only */
    }
  }, [hpp, data.sample]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.step[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  const hasData = data.orders.length > 0;
  const months = useMemo(() => allMonths(data), [data]);
  const products = useMemo(() => allProducts(data), [data]);
  const summary = useMemo(() => summarize(data, hpp, month), [data, hpp, month]);
  const previous = useMemo(() => {
    if (month === 'all') return null;
    const p = prevMonth(month);
    return months.includes(p) ? summarize(data, hpp, p) : null;
  }, [data, hpp, month, months]);
  const insights = useMemo(() => buildInsights(summary, previous, M), [summary, previous, M]);

  const useSample = useCallback(() => {
    setData(sampleDataset(choice));
    setHpp(sampleHpp());
    setMonth('all');
    setErrors([]);
    setTab('dashboard');
  }, [choice]);

  const reset = useCallback(() => {
    setData(emptyDataset);
    setHpp(loadHpp());
    setMonth('all');
    setErrors([]);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      setBusy(true);
      const errs: string[] = [];
      let next: Dataset = data.sample ? emptyDataset : data;
      let nextHpp: HppMap | null = data.sample ? loadHpp() : null;
      for (const f of files) {
        try {
          const parsed = await parseFile(f);
          if ((parsed.kind === 'order' || parsed.kind === 'income') && next.marketplace && next.marketplace !== parsed.marketplace) {
            throw new Error(`${f.name} adalah file ${MARKETPLACES[parsed.marketplace].name}, sedangkan data yang sudah dimuat dari ${MARKETPLACES[next.marketplace].name}. Satu analisis untuk satu toko: hapus data dulu kalau mau ganti toko.`);
          }
          if (parsed.kind === 'order' || parsed.kind === 'income') {
            next = { ...next, marketplace: parsed.marketplace };
            setChoice(parsed.marketplace);
          }
          if (parsed.kind === 'order') {
            next = { ...next, orders: dedupe([...next.orders, ...parsed.rows], (r) => `${r.orderNo}|${r.product}|${r.variant}`), files: { ...next.files, order: parsed.meta }, sample: false };
          } else if (parsed.kind === 'income') {
            next = { ...next, income: dedupe([...next.income, ...parsed.rows], (r) => r.orderNo), files: { ...next.files, income: parsed.meta }, sample: false };
          } else if (parsed.kind === 'ads') {
            next = { ...next, ads: [...next.ads, ...parsed.rows], files: { ...next.files, ads: parsed.meta }, sample: false };
          } else {
            nextHpp = { ...(nextHpp ?? hpp), ...parsed.hpp };
          }
        } catch (e) {
          errs.push(e instanceof Error ? e.message : `${f.name}: file tidak bisa dibaca.`);
        }
      }
      setData(next);
      if (nextHpp) setHpp(nextHpp);
      setErrors(errs);
      setBusy(false);
    },
    [data, hpp],
  );

  const monthSelect = hasData && (
    <div className="toolbar">
      <label htmlFor="bulan">Bulan</label>
      <select id="bulan" className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="all">Semua bulan</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );

  const files = data.files;
  const missingHpp = products.filter((p) => !(p in hpp)).length;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Langkah">
        <div className="brand">
          <strong>Profit Toko</strong>
          <span>Profit asli toko {M.name}</span>
        </div>
        <div className="mp-switch" role="group" aria-label="Marketplace">
          {(['shopee', 'tiktok'] as Marketplace[]).map((id) => (
            <button
              key={id}
              aria-pressed={(data.marketplace ?? choice) === id}
              disabled={hasData && data.marketplace !== id}
              title={hasData && data.marketplace !== id ? 'Hapus data di tab Upload untuk ganti marketplace' : undefined}
              onClick={() => setChoice(id)}
            >
              {MARKETPLACES[id].name}
            </button>
          ))}
        </div>
        <ol className="steps">
          {TABS.map((t, i) => (
            <li key={t.id}>
              <button className="step" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <span className="n">{i + 1}</span>
                {t.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="plies">
          <span className="plies-title">File sumber{data.sample ? ' · data contoh' : ''}</span>
          <div className="ply-stack">
            <div className={`ply-sheet order${files.order ? '' : ' missing'}`}>
              <b>Order</b>
              <span>{files.order ? `${num(files.order.rows)} baris` : 'belum ada'}</span>
            </div>
            <div className={`ply-sheet income${files.income ? '' : ' missing'}`}>
              <b>Income</b>
              <span>{files.income ? `${num(files.income.rows)} baris` : 'belum ada'}</span>
            </div>
            <div className={`ply-sheet ads${files.ads ? '' : ' missing'}`}>
              <b>Iklan</b>
              <span>{files.ads ? `${num(files.ads.rows)} baris` : 'opsional'}</span>
            </div>
          </div>
          {hasData && missingHpp > 0 && (
            <p className="rail-note">
              {missingHpp} dari {products.length} produk belum ada HPP.{' '}
              <button onClick={() => setTab('produk')}>Lengkapi</button>
            </p>
          )}
        </div>
        <p className="rail-foot">File diproses di browser ini saja. Tidak ada yang dikirim ke server.</p>
      </nav>

      <main className="main" id="konten">
        {data.sample && tab !== 'upload' && (
          <p className="sample-bar">
            <span className="sample-tag">Data contoh</span> Angka di halaman ini dari toko herbal fiktif.{' '}
            <button className="btn btn-ghost" onClick={() => setTab('upload')}>
              Ganti dengan data tokomu
            </button>
          </p>
        )}
        {tab === 'panduan' && <Guide M={M} onNext={() => setTab('upload')} />}
        {tab === 'upload' && <Upload M={M} data={data} errors={errors} busy={busy} onFiles={addFiles} onSample={useSample} onReset={reset} onNext={() => setTab(products.length ? 'produk' : 'dashboard')} productsMissingHpp={missingHpp} />}
        {tab === 'order' && (hasData ? <OrderIncome M={M} data={data} summary={summary} month={month} toolbar={monthSelect} /> : <NoData M={M} onUpload={() => setTab('upload')} onSample={useSample} />)}
        {tab === 'produk' && (hasData ? <Products M={M} summary={summary} products={products} hpp={hpp} onHpp={setHpp} toolbar={monthSelect} onNext={() => setTab('dashboard')} /> : <NoData M={M} onUpload={() => setTab('upload')} onSample={useSample} />)}
        {tab === 'dashboard' && (hasData ? <Dashboard M={M} summary={summary} insights={insights} toolbar={monthSelect} goTo={setTab} /> : <NoData M={M} onUpload={() => setTab('upload')} onSample={useSample} />)}
        {tab === 'insight' && (hasData ? <Insights M={M} data={data} hpp={hpp} summary={summary} previous={previous} insights={insights} months={months} toolbar={monthSelect} goTo={setTab} /> : <NoData M={M} onUpload={() => setTab('upload')} onSample={useSample} />)}
      </main>
    </div>
  );
}

