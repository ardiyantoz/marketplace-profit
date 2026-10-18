import { expenseShare, omzetByStoreMonth, type MonthFilter, type StoreFilter } from './compute';
import { MONTHS_SHORT } from './format';
import type { AdRow, Dataset, ExpenseCategory, IncomeRow, OrderLine, Settings } from './types';

export type Grain = 'day' | 'week' | 'month';

export interface CashPeriod {
  key: string; // first day of the period, YYYY-MM-DD
  label: string;
  inflow: number;
  ads: number;
  expense: number;
  net: number;
  balance: number | null; // null before the opening balance date
}

export interface PendingStore {
  storeId: string;
  orders: number;
  estimate: number;
  feeRate: number;
  oldest: Date | null;
}

export interface Cashflow {
  periods: CashPeriod[];
  inflow: number;
  ads: number;
  expense: number;
  expenseByCategory: Record<ExpenseCategory, number>;
  net: number;
  closing: number | null;
  pending: { total: number; orders: number; byStore: PendingStore[]; lines: OrderLine[] };
  undatedAds: number;
  // The rows behind each figure, for the trace panel.
  inflowRows: IncomeRow[];
  adRows: AdRow[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Start of the period a date falls in. Weeks start on Monday. */
export function periodStart(d: Date, grain: Grain): string {
  if (grain === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  if (grain === 'day') return iso(d);
  const day = (d.getDay() + 6) % 7;
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - day));
}

function label(key: string, grain: Grain): string {
  const d = fromIso(key);
  if (grain === 'month') return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  if (grain === 'day') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
  return d.getMonth() === end.getMonth() ? `${d.getDate()}–${end.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
}

function next(key: string, grain: Grain): string {
  const d = fromIso(key);
  if (grain === 'month') return iso(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (grain === 'week' ? 7 : 1)));
}

/** Money actually moving: released funds in, ad spend and the seller's own expenses out. */
export function cashflow(data: Dataset, settings: Settings, grain: Grain, month: MonthFilter, store: StoreFilter): Cashflow {
  const inStore = (id: string) => store === 'all' || id === store;
  const inMonth = (d: Date) => month === 'all' || iso(d).slice(0, 7) === month;
  const buckets = new Map<string, { inflow: number; ads: number; expense: number }>();
  const bucket = (k: string) => {
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = { inflow: 0, ads: 0, expense: 0 }));
    return b;
  };

  const inflowRows: IncomeRow[] = [];
  for (const r of data.income) {
    if (!inStore(r.storeId) || !r.settled || !inMonth(r.settled)) continue;
    bucket(periodStart(r.settled, grain)).inflow += r.payout;
    inflowRows.push(r);
  }
  const adRows: AdRow[] = [];
  let undatedAds = 0;
  for (const a of data.ads) {
    if (!inStore(a.storeId)) continue;
    if (!a.date) {
      undatedAds += a.spend;
      continue;
    }
    if (inMonth(a.date)) {
      bucket(periodStart(a.date, grain)).ads += a.spend;
      adRows.push(a);
    }
  }
  const omzet = omzetByStoreMonth(data);
  const expenseByCategory: Record<ExpenseCategory, number> = { stok: 0, gaji: 0, packaging: 0, sewa: 0, lainnya: 0 };
  for (const e of settings.expenses) {
    const d = fromIso(e.date);
    if (!inMonth(d)) continue;
    const amount = expenseShare(e, store, omzet);
    if (!amount) continue;
    bucket(periodStart(d, grain)).expense += amount;
    expenseByCategory[e.category] += amount;
  }

  // Fill gaps so the series has every period between the first and the last.
  const keys = [...buckets.keys()].sort();
  const opening = settings.opening;
  if (opening && (month === 'all' || opening.date.slice(0, 7) === month)) keys.push(periodStart(fromIso(opening.date), grain));
  keys.sort();
  const periods: CashPeriod[] = [];
  if (keys.length) {
    const last = keys[keys.length - 1];
    let balance: number | null = null;
    const openKey = opening ? periodStart(fromIso(opening.date), grain) : null;
    // Flows dated before the opening day are already inside the opening balance.
    if (opening && month !== 'all' && opening.date.slice(0, 7) < month) balance = opening.amount;
    for (let k = keys[0]; k <= last; k = next(k, grain)) {
      const b = buckets.get(k) ?? { inflow: 0, ads: 0, expense: 0 };
      const net = b.inflow - b.ads - b.expense;
      if (opening && k === openKey) balance = opening.amount;
      if (balance !== null && (!openKey || k >= openKey)) balance += net;
      periods.push({ key: k, label: label(k, grain), inflow: b.inflow, ads: b.ads, expense: b.expense, net, balance: openKey && k < openKey ? null : balance });
    }
  }

  // Pending funds: sold, not yet released. Estimated with each store's own fee rate so far.
  const settledKeys = new Set(data.income.map((r) => `${r.storeId}|${r.orderNo}`));
  const byStore: PendingStore[] = [];
  const pendingLines: OrderLine[] = [];
  for (const s of data.stores) {
    if (!inStore(s.id)) continue;
    const lines = data.orders.filter((o) => o.storeId === s.id && !o.cancelled);
    const settled = lines.filter((o) => settledKeys.has(`${s.id}|${o.orderNo}`));
    const settledSales = settled.reduce((t, o) => t + o.qty * o.unitDiscounted, 0);
    const settledPayout = data.income.filter((r) => r.storeId === s.id).reduce((t, r) => t + r.payout, 0);
    const feeRate = settledSales ? Math.max(0, Math.min(0.6, 1 - settledPayout / settledSales)) : 0.15;
    const open = lines.filter((o) => !settledKeys.has(`${s.id}|${o.orderNo}`));
    if (!open.length) continue;
    pendingLines.push(...open);
    const sales = open.reduce((t, o) => t + o.qty * o.unitDiscounted, 0);
    const dates = open.map((o) => o.date).filter((d) => !Number.isNaN(d.getTime()));
    byStore.push({
      storeId: s.id,
      orders: new Set(open.map((o) => o.orderNo)).size,
      estimate: sales * (1 - feeRate),
      feeRate,
      oldest: dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
    });
  }

  const inflow = periods.reduce((t, p) => t + p.inflow, 0);
  const ads = periods.reduce((t, p) => t + p.ads, 0);
  const expense = periods.reduce((t, p) => t + p.expense, 0);
  const withBalance = periods.filter((p) => p.balance !== null);
  return {
    periods,
    inflow,
    ads,
    expense,
    expenseByCategory,
    net: inflow - ads - expense,
    closing: withBalance.length ? withBalance[withBalance.length - 1].balance : null,
    pending: { total: byStore.reduce((t, p) => t + p.estimate, 0), orders: byStore.reduce((t, p) => t + p.orders, 0), byStore, lines: pendingLines },
    undatedAds,
    inflowRows: inflowRows.sort((a, b) => (b.settled?.getTime() ?? 0) - (a.settled?.getTime() ?? 0)),
    adRows: adRows.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)),
  };
}

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  stok: 'Belanja stok',
  gaji: 'Gaji',
  packaging: 'Packaging',
  sewa: 'Sewa',
  lainnya: 'Lainnya',
};
