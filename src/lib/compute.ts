import { productId, productLabel, rawKey, type AdRow, type Dataset, type Expense, type IncomeRow, type OrderLine, type Settings } from './types';

export type MonthFilter = 'all' | string;
export type StoreFilter = 'all' | string;

export interface ProductStat {
  id: string;
  product: string;
  stores: string[]; // store ids selling it
  orders: number;
  qty: number;
  salesOriginal: number;
  sales: number;
  marketplace: number;
  voucher: number;
  ads: number;
  other: number;
  hpp: number;
  hppUnit: number | null;
  hppEstimated: boolean;
  profit: number;
  margin: number;
}

export interface Fees {
  admin: number;
  service: number;
  ams: number;
  processing: number;
  shipping: number;
}

export interface Health {
  score: number;
  label: 'Sehat' | 'Cukup' | 'Buruk';
}

export interface Summary {
  month: MonthFilter;
  store: StoreFilter;
  orders: number;
  qty: number;
  salesOriginal: number;
  omzet: number;
  fees: Fees;
  marketplace: number;
  voucher: number;
  ads: number;
  other: number;
  opex: number; // manual operating costs (not stock purchases)
  opexRows: { expense: Expense; amount: number }[];
  hppKnown: number;
  hppEstimated: number;
  hppRatio: number;
  totalCost: number;
  profit: number;
  margin: number;
  payout: number;
  products: ProductStat[];
  missingHpp: string[];
  unsettled: OrderLine[];
  orphanIncome: IncomeRow[];
  payment: { method: string; orders: number }[];
  weekday: { day: number; avg: number }[];
  daily: { date: string; sales: number }[];
  health: Health;
  lines: OrderLine[];
  income: IncomeRow[];
  adRows: AdRow[];
  hasAds: boolean;
}

const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);
const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const okKey = (o: OrderLine) => `${o.storeId}|${o.orderNo}`;

export function allMonths(data: Dataset): string[] {
  return [...new Set(data.orders.map((o) => o.month).filter((m) => m !== 'tanpa-tanggal'))].sort();
}

/** Every product id that has sales, with its label and the stores it is sold in. */
export function allProducts(data: Dataset, settings: Settings): { id: string; label: string; raw: { storeId: string; product: string }[] }[] {
  const map = new Map<string, { id: string; label: string; raw: { storeId: string; product: string }[] }>();
  const seen = new Set<string>();
  for (const o of data.orders) {
    if (o.cancelled) continue;
    const rk = rawKey(o.storeId, o.product);
    if (seen.has(rk)) continue;
    seen.add(rk);
    const id = productId(settings, o.storeId, o.product);
    if (!map.has(id)) map.set(id, { id, label: productLabel(id), raw: [] });
    map.get(id)!.raw.push({ storeId: o.storeId, product: o.product });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'id'));
}

// Linear score between a "zero marks" and a "full marks" threshold.
function band(value: number, zeroAt: number, fullAt: number): number {
  const t = (value - zeroAt) / (fullAt - zeroAt);
  return Math.max(0, Math.min(1, t));
}

export function healthScore(s: Pick<Summary, 'margin' | 'ads' | 'omzet' | 'marketplace' | 'products' | 'hppKnown' | 'hppEstimated'>): Health {
  const omzet = s.omzet || 1;
  const losing = s.products.length ? s.products.filter((p) => p.profit < 0).length / s.products.length : 0;
  const hppCover = s.hppKnown + s.hppEstimated > 0 ? s.hppKnown / (s.hppKnown + s.hppEstimated) : 0;
  const score = Math.round(
    40 * band(s.margin, -0.1, 0.15) +
      20 * band(s.ads / omzet, 0.25, 0.08) +
      15 * band(s.marketplace / omzet, 0.25, 0.12) +
      15 * band(losing, 0.3, 0) +
      10 * band(hppCover, 0.5, 1),
  );
  return { score, label: score >= 70 ? 'Sehat' : score >= 40 ? 'Cukup' : 'Buruk' };
}

/** Omzet per store per month, used to split "Semua toko" expenses. */
export function omzetByStoreMonth(data: Dataset): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of data.orders) {
    if (o.cancelled) continue;
    const k = `${o.storeId}|${o.month}`;
    m.set(k, (m.get(k) ?? 0) + o.qty * o.unitDiscounted);
    m.set(`*|${o.month}`, (m.get(`*|${o.month}`) ?? 0) + o.qty * o.unitDiscounted);
  }
  return m;
}

/** The part of an expense that belongs to a store filter (an "all stores" expense is split by that month's omzet). */
export function expenseShare(e: Expense, store: StoreFilter, omzet: Map<string, number>): number {
  if (store === 'all') return e.amount;
  if (e.storeId === store) return e.amount;
  if (e.storeId !== 'all') return 0;
  const month = e.date.slice(0, 7);
  const total = omzet.get(`*|${month}`) ?? 0;
  if (!total) return 0;
  return e.amount * ((omzet.get(`${store}|${month}`) ?? 0) / total);
}

export function summarize(data: Dataset, settings: Settings, month: MonthFilter, store: StoreFilter = 'all'): Summary {
  const inMonth = (m: string | null) => month === 'all' || m === month;
  const inStore = (id: string) => store === 'all' || id === store;
  const lines = data.orders.filter((o) => !o.cancelled && inMonth(o.month) && inStore(o.storeId));
  const orderKeys = new Set(lines.map(okKey));
  const incomeByOrder = new Map(data.income.map((r) => [`${r.storeId}|${r.orderNo}`, r]));
  const income = [...orderKeys].map((k) => incomeByOrder.get(k)).filter((r): r is IncomeRow => !!r);
  const allOrderKeys = new Set(data.orders.map(okKey));

  const orderSales = new Map<string, number>();
  for (const l of lines) orderSales.set(okKey(l), (orderSales.get(okKey(l)) ?? 0) + l.qty * l.unitDiscounted);
  const omzet = sum(lines, (l) => l.qty * l.unitDiscounted);
  const salesOriginal = sum(lines, (l) => l.qty * l.unitOriginal);

  // ---- Ads, allocated to order lines of the same store ----
  // A row naming a product goes to that product's lines in the same month; the rest is split
  // by sales across the store's lines that month. Undated rows spread over all the store's lines.
  const months = allMonths(data);
  const adRows = data.ads.filter((a) => inStore(a.storeId) && (a.month ? inMonth(a.month) : true));
  const lineAds = new Map<OrderLine, number>();
  const spread = (targets: OrderLine[], amount: number) => {
    const total = sum(targets, (l) => l.qty * l.unitDiscounted);
    if (!total) return false;
    for (const l of targets) lineAds.set(l, (lineAds.get(l) ?? 0) + amount * ((l.qty * l.unitDiscounted) / total));
    return true;
  };
  let unplaced = 0;
  for (const a of adRows) {
    const amount = a.month ? a.spend : month === 'all' ? a.spend : a.spend / Math.max(1, months.length);
    const pool = lines.filter((l) => l.storeId === a.storeId && (!a.month || l.month === a.month));
    const ak = keyOf(a.product);
    const named = ak ? pool.filter((l) => {
      const lk = keyOf(l.product);
      return lk.includes(ak) || ak.includes(lk);
    }) : [];
    if (!spread(named, amount) && !spread(pool, amount) && !spread(lines.filter((l) => l.storeId === a.storeId), amount)) unplaced += amount;
  }
  if (unplaced) spread(lines, unplaced);

  // ---- Per-product aggregation ----
  const byProduct = new Map<string, ProductStat>();
  const productOrders = new Map<string, Set<string>>();
  for (const l of lines) {
    const id = productId(settings, l.storeId, l.product);
    let s = byProduct.get(id);
    if (!s) {
      s = { id, product: productLabel(id), stores: [], orders: 0, qty: 0, salesOriginal: 0, sales: 0, marketplace: 0, voucher: 0, ads: 0, other: 0, hpp: 0, hppUnit: settings.hpp[id] ?? null, hppEstimated: false, profit: 0, margin: 0 };
      byProduct.set(id, s);
    }
    if (!s.stores.includes(l.storeId)) s.stores.push(l.storeId);
    const lineSales = l.qty * l.unitDiscounted;
    const share = lineSales / (orderSales.get(okKey(l)) || 1);
    const inc = incomeByOrder.get(okKey(l));
    s.qty += l.qty;
    s.sales += lineSales;
    s.salesOriginal += l.qty * l.unitOriginal;
    s.ads += lineAds.get(l) ?? 0;
    if (inc) {
      s.marketplace += share * (inc.admin + inc.service + inc.ams + inc.processing + inc.shipping);
      s.voucher += share * inc.voucher;
      s.other += share * inc.other;
    }
    if (!productOrders.has(id)) productOrders.set(id, new Set());
    productOrders.get(id)!.add(okKey(l));
  }
  const products = [...byProduct.values()];
  for (const p of products) p.orders = productOrders.get(p.id)?.size ?? 0;

  // HPP: known products use the seller's value; the rest use the HPP-to-sales ratio of all
  // known sales (every store, every month), so per-store figures add up to the combined one.
  let knownHpp = 0;
  let knownSales = 0;
  for (const o of data.orders) {
    if (o.cancelled) continue;
    const unit = settings.hpp[productId(settings, o.storeId, o.product)];
    if (unit === undefined) continue;
    knownHpp += o.qty * unit;
    knownSales += o.qty * o.unitDiscounted;
  }
  const hppRatio = knownSales > 0 ? knownHpp / knownSales : 0.6;
  for (const p of products) {
    if (p.hppUnit !== null) p.hpp = p.qty * p.hppUnit;
    else {
      p.hpp = p.sales * hppRatio;
      p.hppEstimated = true;
    }
    p.profit = p.sales - p.marketplace - p.voucher - p.ads - p.other - p.hpp;
    p.margin = p.sales ? p.profit / p.sales : 0;
  }
  products.sort((a, b) => b.profit - a.profit);

  // ---- Manual operating costs (stock purchases are cash only: HPP already counts them) ----
  const omzetMap = omzetByStoreMonth(data);
  const opexRows = settings.expenses
    .filter((e) => e.category !== 'stok' && (month === 'all' || e.date.slice(0, 7) === month))
    .map((expense) => ({ expense, amount: expenseShare(expense, store, omzetMap) }))
    .filter((x) => x.amount > 0);
  const opex = sum(opexRows, (x) => x.amount);

  const fees: Fees = {
    admin: sum(income, (r) => r.admin),
    service: sum(income, (r) => r.service),
    ams: sum(income, (r) => r.ams),
    processing: sum(income, (r) => r.processing),
    shipping: sum(income, (r) => r.shipping),
  };
  const marketplace = fees.admin + fees.service + fees.ams + fees.processing + fees.shipping;
  const voucher = sum(income, (r) => r.voucher);
  const other = sum(income, (r) => r.other);
  const ads = sum(products, (p) => p.ads);
  const hppKnown = sum(products.filter((p) => !p.hppEstimated), (p) => p.hpp);
  const hppEstimated = sum(products.filter((p) => p.hppEstimated), (p) => p.hpp);
  const totalCost = marketplace + voucher + ads + other + hppKnown + hppEstimated + opex;
  const profit = omzet - totalCost;

  const payMap = new Map<string, Set<string>>();
  for (const l of lines) {
    if (!payMap.has(l.payment)) payMap.set(l.payment, new Set());
    payMap.get(l.payment)!.add(okKey(l));
  }
  const payment = [...payMap].map(([method, set]) => ({ method, orders: set.size })).sort((a, b) => b.orders - a.orders);

  const dailyMap = new Map<string, number>();
  for (const l of lines) {
    if (Number.isNaN(l.date.getTime())) continue;
    const k = dayKey(l.date);
    dailyMap.set(k, (dailyMap.get(k) ?? 0) + l.qty * l.unitDiscounted);
  }
  const daily = [...dailyMap].map(([date, sales]) => ({ date, sales })).sort((a, b) => a.date.localeCompare(b.date));
  const weekday = [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const days = daily.filter((d) => new Date(d.date).getDay() === day);
    return { day, avg: days.length ? sum(days, (d) => d.sales) / days.length : 0 };
  });

  const partial = { margin: omzet ? profit / omzet : 0, ads, omzet, marketplace, products, hppKnown, hppEstimated };

  return {
    month,
    store,
    orders: orderKeys.size,
    qty: sum(lines, (l) => l.qty),
    salesOriginal,
    omzet,
    fees,
    marketplace,
    voucher,
    ads,
    other,
    opex,
    opexRows,
    hppKnown,
    hppEstimated,
    hppRatio,
    totalCost,
    profit,
    margin: partial.margin,
    payout: sum(income, (r) => r.payout),
    products,
    missingHpp: products.filter((p) => p.hppEstimated).map((p) => p.product),
    unsettled: lines.filter((l) => !incomeByOrder.has(okKey(l))),
    orphanIncome: data.income.filter((r) => inStore(r.storeId) && !allOrderKeys.has(`${r.storeId}|${r.orderNo}`)),
    payment,
    weekday,
    daily,
    health: healthScore(partial),
    lines,
    income,
    adRows,
    hasAds: data.ads.some((a) => inStore(a.storeId)),
  };
}

