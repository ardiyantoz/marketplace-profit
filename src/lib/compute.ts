import type { AdRow, Dataset, HppMap, IncomeRow, OrderLine } from './types';

export type MonthFilter = 'all' | string;

export interface ProductStat {
  product: string;
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
  orders: number;
  qty: number;
  salesOriginal: number;
  omzet: number;
  fees: Fees;
  marketplace: number;
  voucher: number;
  ads: number;
  other: number;
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

export function allMonths(data: Dataset): string[] {
  return [...new Set(data.orders.map((o) => o.month).filter((m) => m !== 'tanpa-tanggal'))].sort();
}

export function allProducts(data: Dataset): string[] {
  return [...new Set(data.orders.filter((o) => !o.cancelled).map((o) => o.product))].sort((a, b) => a.localeCompare(b, 'id'));
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

export function summarize(data: Dataset, hpp: HppMap, month: MonthFilter): Summary {
  const inMonth = (m: string | null) => month === 'all' || m === month;
  const lines = data.orders.filter((o) => !o.cancelled && inMonth(o.month));
  const orderNos = new Set(lines.map((l) => l.orderNo));
  const incomeByOrder = new Map(data.income.map((r) => [r.orderNo, r]));
  const income = [...orderNos].map((n) => incomeByOrder.get(n)).filter((r): r is IncomeRow => !!r);
  const allOrderNos = new Set(data.orders.map((o) => o.orderNo));

  // Order-level sales, used to split per-order fees across its lines.
  const orderSales = new Map<string, number>();
  for (const l of lines) orderSales.set(l.orderNo, (orderSales.get(l.orderNo) ?? 0) + l.qty * l.unitDiscounted);

  const omzet = sum(lines, (l) => l.qty * l.unitDiscounted);
  const salesOriginal = sum(lines, (l) => l.qty * l.unitOriginal);

  // Ads: rows with a month count in that month; undated rows spread evenly over all months.
  const months = allMonths(data);
  const adRows = data.ads.filter((a) => (a.month ? inMonth(a.month) : true));
  const adSpend = (a: AdRow) => (a.month ? a.spend : month === 'all' ? a.spend : a.spend / Math.max(1, months.length));

  const byProduct = new Map<string, ProductStat>();
  const stat = (p: string) => {
    let s = byProduct.get(p);
    if (!s) {
      s = { product: p, orders: 0, qty: 0, salesOriginal: 0, sales: 0, marketplace: 0, voucher: 0, ads: 0, other: 0, hpp: 0, hppUnit: hpp[p] ?? null, hppEstimated: false, profit: 0, margin: 0 };
      byProduct.set(p, s);
    }
    return s;
  };
  const productOrders = new Map<string, Set<string>>();
  for (const l of lines) {
    const s = stat(l.product);
    const lineSales = l.qty * l.unitDiscounted;
    const share = lineSales / (orderSales.get(l.orderNo) || 1);
    const inc = incomeByOrder.get(l.orderNo);
    s.qty += l.qty;
    s.sales += lineSales;
    s.salesOriginal += l.qty * l.unitOriginal;
    if (inc) {
      s.marketplace += share * (inc.admin + inc.service + inc.ams + inc.processing + inc.shipping);
      s.voucher += share * inc.voucher;
      s.other += share * inc.other;
    }
    if (!productOrders.has(l.product)) productOrders.set(l.product, new Set());
    productOrders.get(l.product)!.add(l.orderNo);
  }
  for (const [p, set] of productOrders) stat(p).orders = set.size;

  // Ads: a row naming a product goes to it; the rest is split by sales share.
  const products = [...byProduct.values()];
  const keyed = products.map((p) => ({ p, k: keyOf(p.product) }));
  let unassigned = 0;
  for (const a of adRows) {
    const ak = keyOf(a.product || a.campaign);
    const match = ak ? keyed.find(({ k }) => k && (k.includes(ak) || ak.includes(k))) : undefined;
    if (match && a.product) match.p.ads += adSpend(a);
    else unassigned += adSpend(a);
  }
  for (const p of products) p.ads += unassigned * (p.sales / (omzet || 1));

  // HPP: known products use the seller's value; the rest are estimated from the shop's HPP-to-sales ratio.
  const known = products.filter((p) => p.hppUnit !== null);
  const knownHpp = sum(known, (p) => p.qty * (p.hppUnit ?? 0));
  const knownSales = sum(known, (p) => p.sales);
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
  const ads = sum(adRows, adSpend);
  const hppKnown = sum(products.filter((p) => !p.hppEstimated), (p) => p.hpp);
  const hppEstimated = sum(products.filter((p) => p.hppEstimated), (p) => p.hpp);
  const totalCost = marketplace + voucher + ads + other + hppKnown + hppEstimated;
  const profit = omzet - totalCost;

  const payMap = new Map<string, Set<string>>();
  for (const l of lines) {
    if (!payMap.has(l.payment)) payMap.set(l.payment, new Set());
    payMap.get(l.payment)!.add(l.orderNo);
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
    orders: orderNos.size,
    qty: sum(lines, (l) => l.qty),
    salesOriginal,
    omzet,
    fees,
    marketplace,
    voucher,
    ads,
    other,
    hppKnown,
    hppEstimated,
    hppRatio,
    totalCost,
    profit,
    margin: partial.margin,
    payout: sum(income, (r) => r.payout),
    products,
    missingHpp: products.filter((p) => p.hppEstimated).map((p) => p.product),
    unsettled: lines.filter((l) => !incomeByOrder.has(l.orderNo)),
    orphanIncome: data.income.filter((r) => !allOrderNos.has(r.orderNo)),
    payment,
    weekday,
    daily,
    health: healthScore(partial),
    lines,
    income,
    adRows,
    hasAds: data.ads.length > 0,
  };
}
