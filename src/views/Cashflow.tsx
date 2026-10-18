import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CashChart } from '../components/charts';
import { Icon, Notice, Ply, Stat, StoreTag } from '../components/ui';
import { cashflow, CATEGORY_LABEL, type Grain } from '../lib/cashflow';
import type { MonthFilter, StoreFilter } from '../lib/compute';
import { dateLabel, num, rp, rpShort } from '../lib/format';
import { toNumber } from '../lib/parse';
import type { MarketplaceInfo } from '../lib/marketplace';
import type { Dataset, Expense, ExpenseCategory, Settings } from '../lib/types';

interface Props {
  M: MarketplaceInfo;
  data: Dataset;
  settings: Settings;
  onSettings: (fn: (s: Settings) => Settings) => void;
  month: MonthFilter;
  store: StoreFilter;
}

const GRAINS: { id: Grain; label: string }[] = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PERIOD_LIMIT = 12;
const EXPENSE_LIMIT = 10;

export function Cashflow({ M, data, settings, onSettings, month, store }: Props) {
  const [grain, setGrain] = useState<Grain>('week');
  const [allPeriods, setAllPeriods] = useState(false);
  const [allExpenses, setAllExpenses] = useState(false);
  const cf = useMemo(() => cashflow(data, settings, grain, month, store), [data, settings, grain, month, store]);
  const storeOf = new Map(data.stores.map((s) => [s.id, s]));

  // Opening balance form
  const [openDate, setOpenDate] = useState(settings.opening?.date ?? '');
  const [openAmount, setOpenAmount] = useState(settings.opening ? num(settings.opening.amount) : '');
  useEffect(() => {
    setOpenDate(settings.opening?.date ?? '');
    setOpenAmount(settings.opening ? num(settings.opening.amount) : '');
  }, [settings.opening]);
  const saveOpening = (e: FormEvent) => {
    e.preventDefault();
    const amount = toNumber(openAmount);
    onSettings((s) => ({ ...s, opening: openDate ? { date: openDate, amount } : null }));
  };

  // Expense form
  const [exDate, setExDate] = useState(today());
  const [exCat, setExCat] = useState<ExpenseCategory>('stok');
  const [exAmount, setExAmount] = useState('');
  const [exStore, setExStore] = useState<string>(store === 'all' ? 'all' : store);
  const [exNote, setExNote] = useState('');
  const [exError, setExError] = useState('');
  const addExpense = (e: FormEvent) => {
    e.preventDefault();
    const amount = toNumber(exAmount);
    if (!exDate) return setExError('Isi tanggal pengeluaran.');
    if (!(amount > 0)) return setExError('Isi nominal lebih dari Rp0.');
    const expense: Expense = { id: `ex-${Date.now().toString(36)}`, date: exDate, category: exCat, amount, storeId: exStore, note: exNote.trim() };
    onSettings((s) => ({ ...s, expenses: [...s.expenses, expense] }));
    setExAmount('');
    setExNote('');
    setExError('');
  };
  const removeExpense = (id: string) => onSettings((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== id) }));

  const expenses = settings.expenses
    .filter((x) => (store === 'all' || x.storeId === store || x.storeId === 'all') && (month === 'all' || x.date.slice(0, 7) === month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const closingLoss = cf.closing !== null && cf.closing < 0;

  return (
    <>
      <Notice tone="info">
        <b>Kenapa angkanya beda dengan profit?</b> Profit dihitung per tanggal pesanan. Cashflow dihitung per tanggal uang benar-benar bergerak: dana dilepas {M.id === 'mixed' ? 'marketplace' : M.name}, iklan dibayar, dan pengeluaran yang kamu catat. Belanja stok masuk di sini, tapi tidak mengurangi profit karena modal barang sudah dihitung lewat HPP.
      </Notice>

      <div className="cash-controls">
        <div className="segmented" role="group" aria-label="Periode">
          {GRAINS.map((g) => (
            <button key={g.id} aria-pressed={grain === g.id} onClick={() => setGrain(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        <form className="opening" onSubmit={saveOpening}>
          <label htmlFor="saldo-tgl">Saldo awal per</label>
          <input id="saldo-tgl" type="date" lang="id" className="input" value={openDate} onChange={(e) => setOpenDate(e.target.value)} aria-describedby="saldo-tgl-id" />
          {openDate && (
            <span id="saldo-tgl-id" className="date-id">
              {dateLabel(new Date(`${openDate}T00:00:00`))}
            </span>
          )}
          <label htmlFor="saldo-nominal" className="visually-hidden">
            Nominal saldo awal
          </label>
          <input id="saldo-nominal" className="input input-money" inputMode="numeric" placeholder="Rp0" value={openAmount} onChange={(e) => setOpenAmount(e.target.value)} />
          <button className="btn btn-secondary" type="submit">
            Simpan saldo
          </button>
        </form>
      </div>

      <dl className="stats">
        <Stat source="income" label={`Dana masuk (${M.payoutLabel.toLowerCase()})`} value={rp(cf.inflow)} href="#cash-table" />
        <Stat source="ads" label="Iklan keluar" value={rp(-cf.ads)} href="#cash-table" />
        <Stat source="manual" label="Pengeluaran dicatat" value={rp(-cf.expense)} href="#expenses" />
        <div className="stat result">
          <dt>Arus kas bersih</dt>
          <dd className={`num${cf.net < 0 ? ' on-carbon-loss' : ''}`}>{rp(cf.net)}</dd>
        </div>
        <div className={`stat result${closingLoss ? ' loss' : ''}`}>
          <dt>Saldo akhir</dt>
          <dd className="num">{cf.closing === null ? 'Isi saldo awal' : rp(cf.closing)}</dd>
        </div>
        <Stat source="income" label="Dana tertahan (estimasi)" value={rp(cf.pending.total)} href="#pending" />
      </dl>

      <section className="panel" aria-labelledby="cash-chart">
        <div className="panel-head">
          <h2 id="cash-chart">Uang masuk dan keluar</h2>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--carbon)' }} />
              Dana masuk
            </span>
            <span>
              <i style={{ background: 'var(--ads-ink)' }} />
              Iklan
            </span>
            <span>
              <i style={{ background: 'var(--manual-ink)' }} />
              Pengeluaran dicatat
            </span>
            <span>
              <i style={{ background: 'var(--ink)', height: 3, verticalAlign: 2 }} />
              Saldo
            </span>
          </div>
        </div>
        {cf.periods.length ? <CashChart periods={cf.periods} /> : <p className="muted">Belum ada dana dilepas, iklan, atau pengeluaran di periode ini.</p>}
        {cf.periods.length > 8 && <p className="muted scroll-cue">Geser grafik ke samping untuk melihat semua {cf.periods.length} periode.</p>}
        {cf.undatedAds > 0 && <p className="muted">{rp(cf.undatedAds)} biaya iklan tidak punya tanggal di file, jadi tidak masuk grafik.</p>}
      </section>

      <section className="panel panel-flush" aria-labelledby="pending" id="pending">
          <div className="panel-head">
            <h2 id="pending-title">
              Dana tertahan <Ply source="income" />
            </h2>
            <p className="num">{num(cf.pending.orders)} pesanan</p>
          </div>
          <p className="muted panel-pad">Pesanan yang sudah terjual tapi dananya belum dilepas. Perkiraan = omzet pesanan itu dikurangi rata-rata potongan toko masing-masing.</p>
          {cf.pending.byStore.length ? (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Toko</th>
                    <th className="r">Pesanan</th>
                    <th className="r">Potongan rata-rata</th>
                    <th className="r">Perkiraan masuk</th>
                    <th>Tertua</th>
                  </tr>
                </thead>
                <tbody>
                  {cf.pending.byStore.map((p) => {
                    const st = storeOf.get(p.storeId);
                    return (
                      <tr key={p.storeId}>
                        <td className="product">{st ? <StoreTag store={st} /> : p.storeId}</td>
                        <td className="r" data-label="Pesanan">
                          {num(p.orders)}
                        </td>
                        <td className="r" data-label="Potongan rata-rata">
                          {Math.round(p.feeRate * 100)}%
                        </td>
                        <td className="r" data-label="Perkiraan masuk">
                          <b>{rp(p.estimate)}</b>
                        </td>
                        <td data-label="Tertua">{dateLabel(p.oldest)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="verdict-line">Semua dana sudah dilepas. Tidak ada uang yang tertahan.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="by-cat">
          <div className="panel-head">
            <h2 id="by-cat">
              Pengeluaran per kategori <Ply source="manual" />
            </h2>
          </div>
          <div className="bars">
            {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[])
              .filter((c) => cf.expenseByCategory[c] > 0)
              .sort((a, b) => cf.expenseByCategory[b] - cf.expenseByCategory[a])
              .map((c) => (
                <div key={c} className="bar-row">
                  <span className="name">
                    {CATEGORY_LABEL[c]}
                    {c === 'stok' && <small className="muted"> · tidak mengurangi profit</small>}
                  </span>
                  <span className="bar-track">
                    <span className="bar-fill manual" style={{ display: 'block', width: `${(cf.expenseByCategory[c] / Math.max(1, ...Object.values(cf.expenseByCategory))) * 100}%` }} />
                  </span>
                  <span className="num">{rpShort(cf.expenseByCategory[c])}</span>
                </div>
              ))}
            {cf.expense === 0 && <p className="muted">Belum ada pengeluaran di periode ini. Catat di bawah.</p>}
          </div>
        </section>

      <section className="panel panel-flush" aria-labelledby="cash-table" id="cash-table">
        <div className="panel-head">
          <h2 id="cash-table-title">Rincian per {grain === 'day' ? 'hari' : grain === 'week' ? 'minggu' : 'bulan'}</h2>
          <p>Minggu dimulai hari Senin</p>
        </div>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="r">Dana masuk</th>
                <th className="r">Iklan</th>
                <th className="r">Pengeluaran</th>
                <th className="r">Bersih</th>
                <th className="r">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...cf.periods].reverse().slice(0, allPeriods ? undefined : PERIOD_LIMIT).map((p) => (
                <tr key={p.key}>
                  <td className="product">{p.label}</td>
                  <td className="r" data-label="Dana masuk">
                    {rp(p.inflow)}
                  </td>
                  <td className="r" data-label="Iklan">
                    {rp(-p.ads)}
                  </td>
                  <td className="r" data-label="Pengeluaran">
                    {rp(-p.expense)}
                  </td>
                  <td className={`r ${p.net < 0 ? 'neg' : 'pos'}`} data-label="Bersih">
                    {rp(p.net)}
                  </td>
                  <td className="r" data-label="Saldo">
                    {p.balance === null ? '–' : <b className={p.balance < 0 ? 'neg' : undefined}>{rp(p.balance)}</b>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cf.periods.length > PERIOD_LIMIT && (
          <div className="more">
            <button className="btn btn-secondary" onClick={() => setAllPeriods((v) => !v)}>
              {allPeriods ? `Tampilkan ${PERIOD_LIMIT} terbaru` : `Tampilkan semua (${cf.periods.length})`}
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="expenses-title" id="expenses">
        <div className="panel-head">
          <h2 id="expenses-title">
            Catatan pengeluaran <Ply source="manual" />
          </h2>
          <p>Belanja stok, gaji, packaging, sewa, dan biaya lain di luar marketplace</p>
        </div>
        <form className="expense-form" onSubmit={addExpense}>
          <div className="field">
            <label htmlFor="ex-date">
              Tanggal
              {exDate && <span className="date-id"> · {dateLabel(new Date(`${exDate}T00:00:00`))}</span>}
            </label>
            <input id="ex-date" type="date" lang="id" className="input" value={exDate} onChange={(e) => setExDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ex-cat">Kategori</label>
            <select id="ex-cat" className="select" value={exCat} onChange={(e) => setExCat(e.target.value as ExpenseCategory)}>
              {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ex-amount">Nominal</label>
            <input id="ex-amount" className="input input-money" inputMode="numeric" placeholder="Rp0" value={exAmount} onChange={(e) => setExAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ex-store">Untuk toko</label>
            <select id="ex-store" className="select" value={exStore} onChange={(e) => setExStore(e.target.value)}>
              <option value="all">Semua toko (dibagi per omzet)</option>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field grow">
            <label htmlFor="ex-note">Catatan</label>
            <input id="ex-note" className="input" placeholder="mis. Belanja jahe 20 kg" value={exNote} onChange={(e) => setExNote(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">
            <Icon name="plus" />
            Catat
          </button>
        </form>
        {exError && <Notice tone="loss">{exError}</Notice>}
        <p className="muted">{exCat === 'stok' ? 'Belanja stok hanya masuk cashflow; modal barang di profit sudah dihitung lewat HPP.' : `${CATEGORY_LABEL[exCat]} masuk cashflow dan juga mengurangi profit.`}</p>

        {expenses.length ? (
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Toko</th>
                  <th>Catatan</th>
                  <th className="r">Nominal</th>
                  <th aria-label="Hapus" />
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, allExpenses ? undefined : EXPENSE_LIMIT).map((x) => {
                  const st = storeOf.get(x.storeId);
                  return (
                    <tr key={x.id}>
                      <td className="product">{dateLabel(new Date(`${x.date}T00:00:00`))}</td>
                      <td data-label="Kategori">{CATEGORY_LABEL[x.category]}</td>
                      <td data-label="Toko">{st ? <StoreTag store={st} /> : 'Semua toko'}</td>
                      <td data-label="Catatan">{x.note || '–'}</td>
                      <td className="r" data-label="Nominal">
                        <b>{rp(-x.amount)}</b>
                      </td>
                      <td className="r ledger-input">
                        <button className="btn btn-ghost" aria-label={`Hapus pengeluaran ${x.note || CATEGORY_LABEL[x.category]}`} onClick={() => removeExpense(x.id)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Belum ada catatan pengeluaran untuk filter ini.</p>
        )}
        {expenses.length > EXPENSE_LIMIT && (
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setAllExpenses((v) => !v)}>
            {allExpenses ? `Tampilkan ${EXPENSE_LIMIT} terbaru` : `Tampilkan semua (${expenses.length})`}
          </button>
        )}
      </section>
    </>
  );
}
