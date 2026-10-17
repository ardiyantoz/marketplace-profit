import { monthKey } from './format';
import type { AdRow, Dataset, HppMap, IncomeRow, OrderLine } from './types';

// Synthetic demo shop. Every figure here is invented and labelled "Data contoh" in the UI.
const PRODUCTS: { name: string; price: number; hpp: number | null; weight: number; ads: boolean }[] = [
  { name: 'Wedang Rempah 700 Gram - Herbal Drink Premium Alami', price: 239000, hpp: 180000, weight: 10, ads: true },
  { name: 'Wedang Rempah 250 Gram - Herbal Drink Premium Alami', price: 78500, hpp: 47000, weight: 9, ads: true },
  { name: 'Wedang Rempah 250 Gram (Travel Size Anak)', price: 78500, hpp: 47000, weight: 5, ads: false },
  { name: 'Bubuk Matcha 500 Gram - Dark Matcha Powder Premium', price: 237000, hpp: 100000, weight: 2, ads: false },
  { name: 'Matcha Powder 100 Gram - Bubuk Murni Unsweetened', price: 75000, hpp: 41000, weight: 4, ads: true },
  { name: 'Matcha Powder 300 Gram - Bubuk Murni Unsweetened', price: 157000, hpp: 98000, weight: 2, ads: false },
  { name: 'Wedang Jahe Merah 320 Gram - Ginger Herbal Drink', price: 91000, hpp: 52000, weight: 4, ads: false },
  { name: 'Temulawak Herbal 250 Gram - Herbal Tonic Premium', price: 91000, hpp: 55000, weight: 3, ads: false },
  { name: 'Wedang Uwuh Herbal 500 Gram - Rempah Tradisional', price: 134000, hpp: 118000, weight: 3, ads: true },
  { name: 'Kunyit Asam Herbal 250 Gram - Herbal Drink', price: 60000, hpp: 51000, weight: 2, ads: false },
  { name: 'Bandrek Rempah Herbal 250 Gram', price: 72000, hpp: 40000, weight: 2, ads: false },
  { name: 'Bandrek Rempah Herbal 700 Gram', price: 189000, hpp: 118000, weight: 1, ads: false },
  { name: 'Secang Rempah Herbal 250 Gram', price: 70000, hpp: 39000, weight: 1, ads: false },
  { name: 'Kopi Rempah Herbal 320 Gram - Herbal Coffee Blend', price: 98000, hpp: null, weight: 1, ads: false },
  { name: 'Kopi Rempah Herbal 700 Gram - Herbal Coffee Blend', price: 215000, hpp: null, weight: 1, ads: false },
  { name: 'Wedang Rempah 700 Gram (Travel Size Anak)', price: 225000, hpp: null, weight: 1, ads: false },
];

const PAYMENTS: [string, number][] = [
  ['Online Payment', 35],
  ['Saldo ShopeePay', 30],
  ['QRIS', 13],
  ['SeaBank Bayar Instan', 8],
  ['SPayLater', 7],
  ['Kartu Kredit/Debit', 7],
];

const BUYERS = ['senyum.hub', 'anggun.place', 'gesit_36', 'damar524', 'senja974', 'evimulan', 'akmala.minha', 'kirana.vio', 'arum_59', 'kopi.sore', 'mbak.tari', 'rizky.dpn', 'naya.home', 'bu_endang', 'pakde.joko'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x <= 0) return item;
  }
  return items[items.length - 1][0];
}

export function sampleHpp(): HppMap {
  const out: HppMap = {};
  for (const p of PRODUCTS) if (p.hpp !== null) out[p.name] = p.hpp;
  return out;
}

export function sampleDataset(): Dataset {
  const r = rng(20260717);
  const orders: OrderLine[] = [];
  const income: IncomeRow[] = [];
  const ads: AdRow[] = [];
  const productWeights = PRODUCTS.map((p) => [p, p.weight] as [typeof p, number]);
  const plan: [number, number, number][] = [
    [2026, 4, 40],
    [2026, 5, 46],
    [2026, 6, 56],
  ];
  let seq = 0;
  let orderRow = 2;
  let incomeRow = 7;
  let adRow = 2;
  for (const [y, m, count] of plan) {
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < count; i++) {
      seq++;
      const day = 1 + Math.floor(r() * days);
      const date = new Date(y, m, day, 8 + Math.floor(r() * 14), Math.floor(r() * 60));
      const orderNo = `26${String(m + 1).padStart(2, '0')}${String(day).padStart(2, '0')}${(seq * 7919).toString(36).toUpperCase().padStart(6, 'X')}`;
      const cancelled = r() < 0.05;
      const payment = pick(r, PAYMENTS);
      const buyer = `${BUYERS[Math.floor(r() * BUYERS.length)]}${Math.floor(r() * 9000 + 1000)}`;
      const lineCount = r() < 0.18 ? 2 : 1;
      let orderSales = 0;
      const chosen = new Set<string>();
      for (let j = 0; j < lineCount; j++) {
        const p = pick(r, productWeights);
        if (chosen.has(p.name)) continue;
        chosen.add(p.name);
        const qty = r() < 0.15 ? 2 : 1;
        const discount = r() < 0.4 ? Math.round((p.price * (0.01 + r() * 0.05)) / 100) * 100 : 0;
        const unit = p.price - discount;
        orderSales += unit * qty;
        orders.push({
          orderNo,
          date,
          month: monthKey(date),
          status: cancelled ? 'Batal' : 'Selesai',
          cancelled,
          product: p.name,
          variant: '',
          qty,
          unitOriginal: p.price,
          unitDiscounted: unit,
          payment,
          buyer,
          row: orderRow++,
        });
      }
      const lateJuly = m === 6 && day > 27;
      if (cancelled || lateJuly) continue;
      const admin = Math.round(orderSales * 0.076);
      const service = Math.round(Math.min(orderSales * 0.07, 20000));
      const ams = r() < 0.35 ? Math.round(orderSales * 0.05) : 0;
      const processing = 1250;
      const shipping = r() < 0.3 ? Math.round((6000 + r() * 12000) / 500) * 500 : 0;
      const voucher = r() < 0.15 ? 5000 : 0;
      const other = r() < 0.1 ? 1500 : 0;
      const settled = new Date(y, m, Math.min(days, day + 3 + Math.floor(r() * 4)));
      income.push({
        orderNo,
        settled,
        admin,
        service,
        ams,
        processing,
        shipping,
        voucher,
        other,
        payout: orderSales - admin - service - ams - processing - shipping - voucher - other,
        row: incomeRow++,
      });
    }
    const campaigns = PRODUCTS.filter((p) => p.ads);
    for (let d = 1; d <= days; d++) {
      for (const c of campaigns) {
        if (r() < 0.35) continue;
        const date = new Date(y, m, d);
        const spend = Math.round((9000 + r() * 22000) / 100) * 100;
        ads.push({ date, month: monthKey(date), campaign: `Iklan ${c.name.split(' - ')[0]}`, product: c.name, spend, gmv: Math.round(spend * (1.5 + r() * 3)), row: adRow++ });
      }
    }
  }
  const meta = (name: string, rows: number, months: string[]) => ({ name, rows, months, warnings: [] });
  const ms = ['2026-05', '2026-06', '2026-07'];
  return {
    orders,
    income,
    ads,
    files: {
      order: meta('Order.all.contoh.xlsx', orders.length, ms),
      income: meta('Penghasilan.contoh.xlsx', income.length, ms),
      ads: meta('Iklan.contoh.csv', ads.length, ms),
    },
    sample: true,
  };
}
