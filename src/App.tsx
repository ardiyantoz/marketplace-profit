import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allMonths, allProducts, summarize, type MonthFilter, type StoreFilter } from './lib/compute';
import { monthKey, monthLabel, prevMonth } from './lib/format';
import { buildInsights, buildStoreInsights } from './lib/insights';
import { infoFor, MARKETPLACES, type Marketplace } from './lib/marketplace';
import { parseFile } from './lib/parse';
import { sampleState } from './lib/sample';
import { clearState, downloadBackup, loadState, readBackup, saveState } from './lib/storage';
import { emptyDataset, emptySettings, productId, type AdRow, type Dataset, type FileMeta, type FileSlot, type Settings, type Store } from './lib/types';
import { NoData, StoreMark } from './components/ui';
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
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'insight', label: 'Insight & saran' },
];

function dedupe<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) seen.set(key(r), r);
  return [...seen.values()];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
// An ad row is the same row again when a re-uploaded report has the same day and campaign.
// Rows inside one file are never merged: a creatives report has many rows per day.
const adKey = (a: AdRow) => (a.date ? `${a.date.getFullYear()}-${pad2(a.date.getMonth() + 1)}-${pad2(a.date.getDate())}|${a.campaign}` : `-|${a.campaign}|${a.product}`);

/** What a slot shows after another file is added: every file name, and the rows and months now held for the store. */
function mergedMeta(prev: FileMeta | undefined, added: FileMeta, dates: (Date | null)[]): FileMeta {
  const names = [...new Set([...(prev ? (prev.names ?? [prev.name]) : []), added.name])];
  const valid = dates.filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
  return {
    name: added.name,
    names,
    rows: dates.length,
    months: [...new Set(valid.map(monthKey))].sort(),
    warnings: [...new Set([...(prev?.warnings ?? []), ...added.warnings])],
  };
}

const newId = () => `toko-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [data, setData] = useState<Dataset>(emptyDataset);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [month, setMonth] = useState<MonthFilter>('all');
  const [store, setStore] = useState<StoreFilter>('all');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<'idle' | 'saved' | 'failed'>('idle');
  const saveTimer = useRef<number>();

  // Restore the last session from this browser.
  useEffect(() => {
    loadState().then((state) => {
      if (state?.data?.stores) {
        setData(state.data);
        setSettings({ ...emptySettings, ...state.settings });
        if (state.data.orders.length) setTab('dashboard');
      }
      // Links from the landing page: ?contoh=1 opens sample data, ?mulai=upload opens the upload tab.
      // Sample data never replaces a seller's own stores.
      const params = new URLSearchParams(window.location.search);
      const ownData = !!state?.data?.stores?.length && !state.data.sample;
      if (params.has('contoh') && !ownData) {
        const s = sampleState();
        setData(s.data);
        setSettings(s.settings);
        setTab('dashboard');
      } else if (params.get('mulai') === 'upload') setTab('upload');
      if (params.toString()) window.history.replaceState(null, '', window.location.pathname);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveState({ data, settings }).then((ok) => setSaved(ok ? 'saved' : 'failed'));
    }, 400);
  }, [data, settings, loaded]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.step[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  useEffect(() => {
    if (store !== 'all' && !data.stores.some((s) => s.id === store)) setStore('all');
    document.querySelector('.rail-store[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [data.stores, store]);

  const hasData = data.orders.length > 0;
  const months = useMemo(() => allMonths(data), [data]);
  const scopeStores = store === 'all' ? data.stores : data.stores.filter((s) => s.id === store);
  const M = infoFor(scopeStores.map((s) => s.marketplace));
  const summary = useMemo(() => summarize(data, settings, month, store), [data, settings, month, store]);
  const previous = useMemo(() => {
    if (month === 'all') return null;
    const p = prevMonth(month);
    return months.includes(p) ? summarize(data, settings, p, store) : null;
  }, [data, settings, month, months, store]);
  const perStore = useMemo(() => (data.stores.length > 1 ? data.stores.map((st) => ({ store: st, s: summarize(data, settings, month, st.id) })) : []), [data, settings, month]);
  const insights = useMemo(() => {
    const list = [...buildInsights(summary, previous, M), ...(store === 'all' ? buildStoreInsights(perStore, summary) : [])];
    const rank = { critical: 0, warning: 1, info: 2 };
    return list.sort((a, b) => b.impact - a.impact || rank[a.tone] - rank[b.tone]);
  }, [summary, previous, M, perStore, store]);
  const products = useMemo(() => allProducts(data, settings), [data, settings]);
  const missingHpp = products.filter((p) => !(p.id in settings.hpp)).length;

  const useSample = useCallback(() => {
    const s = sampleState();
    setData(s.data);
    setSettings(s.settings);
    setMonth('all');
    setStore('all');
    setErrors({});
    setTab('dashboard');
  }, []);

  const reset = useCallback(() => {
    clearState();
    setData(emptyDataset);
    setSettings(emptySettings);
    setMonth('all');
    setStore('all');
    setErrors({});
  }, []);

  const restore = useCallback(async (file: File) => {
    const state = await readBackup(file);
    if (!state) return false;
    setData(state.data);
    setSettings({ ...emptySettings, ...state.settings });
    setMonth('all');
    setStore('all');
    setErrors({});
    return true;
  }, []);

  const addStore = useCallback((marketplace: Marketplace) => {
    setData((d) => {
      const base = d.sample ? emptyDataset : d;
      const n = base.stores.length + 1;
      const st: Store = { id: newId(), name: `Toko ${n}`, marketplace, files: {} };
      return { ...base, stores: [...base.stores, st], sample: false };
    });
    setSettings((s) => (data.sample ? emptySettings : s));
  }, [data.sample]);

  const updateStore = useCallback((id: string, patch: Partial<Pick<Store, 'name' | 'marketplace'>>) => {
    setData((d) => ({ ...d, stores: d.stores.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const removeStore = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      stores: d.stores.filter((s) => s.id !== id),
      orders: d.orders.filter((o) => o.storeId !== id),
      income: d.income.filter((r) => r.storeId !== id),
      ads: d.ads.filter((a) => a.storeId !== id),
    }));
    setSettings((s) => ({
      ...s,
      merges: Object.fromEntries(Object.entries(s.merges).filter(([k]) => !k.startsWith(`${id}::`))),
      expenses: s.expenses.filter((e) => e.storeId !== id),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }, []);

  const addFiles = useCallback(
    async (storeId: string, files: File[]) => {
      setBusy(storeId);
      const errs: string[] = [];
      let next = data;
      let hppUpdate: Record<string, number> = {};
      for (const f of files) {
        try {
          const parsed = await parseFile(f);
          const st = next.stores.find((s) => s.id === storeId)!;
          let marketplace = st.marketplace;
          if (parsed.kind === 'order' || parsed.kind === 'income') {
            const hasMarketFiles = !!st.files.order || !!st.files.income;
            if (parsed.marketplace !== st.marketplace) {
              if (hasMarketFiles) throw new Error(`${f.name} adalah file ${MARKETPLACES[parsed.marketplace].name}, sedangkan ${st.name} toko ${MARKETPLACES[st.marketplace].name}. Upload ke kartu toko yang sesuai, atau tambah toko baru.`);
              marketplace = parsed.marketplace;
            }
          }
          if (parsed.kind === 'hpp') {
            hppUpdate = { ...hppUpdate, ...parsed.hpp };
            continue;
          }
          const tag = <T extends { storeId: string }>(rows: T[]) => rows.map((r) => ({ ...r, storeId }));
          // Files for months already uploaded replace those rows (newest wins) instead of counting them twice.
          let dates: (Date | null)[];
          if (parsed.kind === 'order') {
            next = { ...next, orders: dedupe([...next.orders, ...tag(parsed.rows)], (r) => `${r.storeId}|${r.orderNo}|${r.product}|${r.variant}`) };
            dates = next.orders.filter((r) => r.storeId === storeId).map((r) => r.date);
          } else if (parsed.kind === 'income') {
            next = { ...next, income: dedupe([...next.income, ...tag(parsed.rows)], (r) => `${r.storeId}|${r.orderNo}`) };
            dates = next.income.filter((r) => r.storeId === storeId).map((r) => r.settled);
          } else {
            const added = tag(parsed.rows);
            const again = new Set(added.map(adKey));
            next = { ...next, ads: [...next.ads.filter((a) => a.storeId !== storeId || !again.has(adKey(a))), ...added] };
            dates = next.ads.filter((r) => r.storeId === storeId).map((r) => r.date);
          }
          const kind: FileSlot = parsed.kind;
          next = { ...next, stores: next.stores.map((s) => (s.id === storeId ? { ...s, marketplace, files: { ...s.files, [kind]: mergedMeta(s.files[kind], parsed.meta, dates) } } : s)) };
        } catch (e) {
          errs.push(e instanceof Error ? e.message : `${f.name}: file tidak bisa dibaca.`);
        }
      }
      setData(next);
      if (Object.keys(hppUpdate).length) {
        setSettings((s) => {
          const hpp = { ...s.hpp };
          for (const o of next.orders) {
            const v = hppUpdate[o.product] ?? hppUpdate[productId(s, o.storeId, o.product).replace(/^g::/, '')];
            if (v) hpp[productId(s, o.storeId, o.product)] = v;
          }
          return { ...s, hpp };
        });
      }
      setErrors((e) => ({ ...e, [storeId]: errs }));
      setBusy(null);
    },
    [data],
  );

  const toolbar = hasData && (
    <div className="toolbar">
      {data.stores.length > 1 && (
        <span className="field-inline">
          <label htmlFor="toko">Toko</label>
          <select id="toko" className="select" value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="all">Semua toko ({data.stores.length})</option>
            {data.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {MARKETPLACES[s.marketplace].name}
              </option>
            ))}
          </select>
        </span>
      )}
      <span className="field-inline">
      <label htmlFor="bulan">Bulan</label>
      <select id="bulan" className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="all">Semua bulan</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      </span>
    </div>
  );

  const noData = <NoData M={M} onUpload={() => setTab('upload')} onSample={useSample} />;
  const rows = (id: string, slot: 'order' | 'income' | 'ads') => data.stores.find((s) => s.id === id)?.files[slot]?.rows;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Langkah">
        <a className="brand" href="../" title="Tentang Profit Toko">
          <strong>Profit Toko</strong>
          <span>Profit asli semua tokomu</span>
        </a>
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
        {data.stores.length > 0 && (
          <div className="rail-stores">
            <span className="plies-title">Toko{data.sample ? ' · data contoh' : ''}</span>
            {data.stores.length > 1 && (
              <button className="rail-store" aria-pressed={store === 'all'} onClick={() => setStore('all')}>
                <span className="store-mark all" aria-hidden="true">
                  {data.stores.length}
                </span>
                <span className="rail-store-name">Semua toko</span>
              </button>
            )}
            {data.stores.map((s) => (
              <button key={s.id} className="rail-store" aria-pressed={store === s.id || data.stores.length === 1} onClick={() => setStore(data.stores.length > 1 ? s.id : 'all')}>
                <StoreMark store={s} />
                <span className="rail-store-name">
                  {s.name}
                  <small>{MARKETPLACES[s.marketplace].name}</small>
                </span>
                <span className="rail-plies" aria-label={`File: order ${rows(s.id, 'order') ? 'ada' : 'belum'}, income ${rows(s.id, 'income') ? 'ada' : 'belum'}, iklan ${rows(s.id, 'ads') ? 'ada' : 'belum'}`}>
                  <i className={`o${rows(s.id, 'order') ? '' : ' off'}`} />
                  <i className={`i${rows(s.id, 'income') ? '' : ' off'}`} />
                  <i className={`a${rows(s.id, 'ads') ? '' : ' off'}`} />
                </span>
              </button>
            ))}
            {hasData && missingHpp > 0 && (
              <p className="rail-note">
                {missingHpp} dari {products.length} produk belum ada HPP.{' '}
                <button onClick={() => setTab('produk')}>Lengkapi</button>
              </p>
            )}
          </div>
        )}
        <p className="rail-foot">
          Data tersimpan di browser ini saja{saved === 'failed' ? ' (gagal menyimpan, browser memblokir penyimpanan)' : ''}. Tidak ada yang dikirim ke server.
        </p>
      </nav>

      <main className="main" id="konten">
        {data.sample && tab !== 'upload' && (
          <p className="sample-bar">
            <span className="sample-tag">Data contoh</span> Angka di halaman ini dari 3 toko herbal fiktif.{' '}
            <button className="btn btn-ghost" onClick={() => setTab('upload')}>
              Ganti dengan data tokomu
            </button>
          </p>
        )}
        {tab === 'panduan' && <Guide initial={data.stores[0]?.marketplace ?? 'shopee'} onNext={() => setTab('upload')} />}
        {tab === 'upload' && (
          <Upload
            data={data}
            errors={errors}
            busy={busy}
            onFiles={addFiles}
            onAddStore={addStore}
            onUpdateStore={updateStore}
            onRemoveStore={removeStore}
            onSample={useSample}
            onReset={reset}
            onBackup={() => downloadBackup({ data, settings })}
            onRestore={restore}
            onNext={() => setTab(products.length ? 'produk' : 'dashboard')}
            productsMissingHpp={missingHpp}
          />
        )}
        {tab === 'order' && (hasData ? <OrderIncome M={M} data={data} summary={summary} month={month} store={store} toolbar={toolbar} /> : noData)}
        {tab === 'produk' && (hasData ? <Products data={data} settings={settings} onSettings={setSettings} summary={summary} toolbar={toolbar} onNext={() => setTab('dashboard')} /> : noData)}
        {tab === 'dashboard' && (hasData ? <Dashboard M={M} data={data} settings={settings} onSettings={setSettings} summary={summary} perStore={store === 'all' ? perStore : []} insights={insights} month={month} store={store} toolbar={toolbar} goTo={setTab} onPickStore={setStore} /> : noData)}
        {tab === 'insight' && (hasData ? <Insights M={M} data={data} settings={settings} summary={summary} previous={previous} insights={insights} months={months} store={store} toolbar={toolbar} goTo={setTab} /> : noData)}
      </main>
    </div>
  );
}

