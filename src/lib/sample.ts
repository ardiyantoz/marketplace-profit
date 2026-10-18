import { monthKey } from './format';
import { rawKey, type AdRow, type Dataset, type Expense, type IncomeRow, type OrderLine, type Settings, type Store } from './types';

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

const PAYMENTS_TIKTOK: [string, number][] = [
  ['DANA', 26],
  ['GoPay', 22],
  ['Virtual Account', 18],
  ['COD (Bayar di tempat)', 14],
  ['PayLater', 11],
  ['OVO', 9],
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

const shortOf = (name: string) => name.split(' - ')[0];

interface StorePlan {
  store: Store;
  seed: number;
  products: number[]; // indexes into PRODUCTS
  rename: (name: string) => string; // how this store titles the product
  price: number; // price factor
  volume: number; // order volume factor
}

function generate(plan: StorePlan) {
  const { store } = plan;
  const tiktok = store.marketplace === 'tiktok';
  const r = rng(plan.seed);
  const orders: OrderLine[] = [];
  const income: IncomeRow[] = [];
  const ads: AdRow[] = [];
  const catalog = plan.products.map((i) => PRODUCTS[i]);
  const productWeights = catalog.map((p) => [p, p.weight] as [typeof p, number]);
  const plan3: [number, number, number][] = [
    [2026, 4, Math.round(40 * plan.volume)],
    [2026, 5, Math.round(46 * plan.volume)],
    [2026, 6, Math.round(56 * plan.volume)],
  ];
  let seq = 0;
  let orderRow = 2;
  let incomeRow = 7;
  let adRow = 2;
  for (const [y, m, count] of plan3) {
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < count; i++) {
      seq++;
      const day = 1 + Math.floor(r() * days);
      const date = new Date(y, m, day, 8 + Math.floor(r() * 14), Math.floor(r() * 60));
      const orderNo = tiktok
        ? `5794${pad2(m + 1)}${pad2(day)}${String(seq * 104729).padStart(10, '0')}`
        : `26${pad2(m + 1)}${pad2(day)}${(seq * 7919 + plan.seed).toString(36).toUpperCase().slice(-6).padStart(6, 'X')}`;
      const cancelled = r() < 0.05;
      const payment = pick(r, tiktok ? PAYMENTS_TIKTOK : PAYMENTS);
      const buyer = `${BUYERS[Math.floor(r() * BUYERS.length)]}${Math.floor(r() * 9000 + 1000)}`;
      const lineCount = r() < 0.18 ? 2 : 1;
      let orderSales = 0;
      const chosen = new Set<string>();
      for (let j = 0; j < lineCount; j++) {
        const p = pick(r, productWeights);
        if (chosen.has(p.name)) continue;
        chosen.add(p.name);
        const qty = r() < 0.15 ? 2 : 1;
        const price = Math.round((p.price * plan.price) / 500) * 500;
        const discount = r() < 0.4 ? Math.round((price * (0.01 + r() * 0.05)) / 100) * 100 : 0;
        const unit = price - discount;
        orderSales += unit * qty;
        orders.push({
          storeId: store.id,
          orderNo,
          date,
          month: monthKey(date),
          status: cancelled ? (tiktok ? 'Dibatalkan' : 'Batal') : 'Selesai',
          cancelled,
          product: plan.rename(p.name),
          variant: '',
          qty,
          unitOriginal: price,
          unitDiscounted: unit,
          payment,
          buyer,
          row: orderRow++,
        });
      }
      const late = m === 6 && day > 27;
      if (cancelled || late) continue;
      // Fee rates are illustrative, not either marketplace's real tariff.
      const admin = Math.round(orderSales * (tiktok ? 0.08 : 0.076));
      const service = tiktok ? Math.round(Math.min(orderSales * 0.04, 15000)) : Math.round(Math.min(orderSales * 0.07, 20000));
      const ams = r() < (tiktok ? 0.45 : 0.35) ? Math.round(orderSales * (tiktok ? 0.1 : 0.05)) : 0;
      const processing = tiktok ? Math.round(orderSales * 0.015) : 1250;
      const shipping = r() < (tiktok ? 0.25 : 0.3) ? Math.round((6000 + r() * 12000) / 500) * 500 : 0;
      const voucher = !tiktok && r() < 0.15 ? 5000 : 0;
      const other = !tiktok && r() < 0.1 ? 1500 : 0;
      const settled = new Date(y, m, Math.min(days, day + 3 + Math.floor(r() * 4)));
      income.push({
        storeId: store.id,
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
    for (let d = 1; d <= days; d++) {
      for (const c of catalog.filter((p) => p.ads)) {
        if (r() < 0.35 + (1 - plan.volume) * 0.9) continue;
        const date = new Date(y, m, d);
        const spend = Math.round(((9000 + r() * 22000) * (0.6 + plan.volume * 0.4)) / 100) * 100;
        ads.push({ storeId: store.id, date, month: monthKey(date), campaign: `${tiktok ? 'GMV Max' : 'Iklan'} ${shortOf(c.name)}`, product: plan.rename(c.name), spend, gmv: Math.round(spend * (1.5 + r() * 3)), row: adRow++ });
      }
    }
  }
  const meta = (name: string, rows: number) => ({ name, rows, months: ['2026-05', '2026-06', '2026-07'], warnings: [] });
  store.files = {
    order: meta(tiktok ? 'Pesanan-TikTokShop.contoh.csv' : 'Order.all.contoh.xlsx', orders.length),
    income: meta(tiktok ? 'Penyelesaian-TikTokShop.contoh.xlsx' : 'Penghasilan.contoh.xlsx', income.length),
    ads: meta(tiktok ? 'GMV-Max.contoh.csv' : 'Iklan.contoh.csv', ads.length),
  };
  return { orders, income, ads };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Three fictional stores selling overlapping products, with merges, HPP, expenses and an opening balance. */
export function sampleState(): { data: Dataset; settings: Settings } {
  const plans: StorePlan[] = [
    {
      store: { id: 'contoh-utama', name: 'Herbal Utama', marketplace: 'shopee', files: {} },
      seed: 20260717,
      products: PRODUCTS.map((_, i) => i),
      rename: (n) => n,
      price: 1,
      volume: 1,
    },
    {
      store: { id: 'contoh-hemat', name: 'Herbal Hemat', marketplace: 'shopee', files: {} },
      seed: 20260721,
      products: [0, 1, 4, 6, 7, 8, 9],
      rename: (n) => `${shortOf(n)} Original Murah`,
      price: 0.9,
      volume: 0.45,
    },
    {
      store: { id: 'contoh-live', name: 'Herbal Live', marketplace: 'tiktok', files: {} },
      seed: 20260719,
      products: [0, 1, 3, 4, 8, 13],
      rename: (n) => `${shortOf(n)} | Herbal Asli Indonesia`,
      price: 0.97,
      volume: 0.6,
    },
  ];
  const data: Dataset = { stores: [], orders: [], income: [], ads: [], sample: true };
  const settings: Settings = { hpp: {}, merges: {}, expenses: [], opening: { date: '2026-05-01', amount: 10000000 } };
  for (const plan of plans) {
    const g = generate(plan);
    data.stores.push(plan.store);
    data.orders.push(...g.orders);
    data.income.push(...g.income);
    data.ads.push(...g.ads);
    for (const i of plan.products) {
      const p = PRODUCTS[i];
      const merged = shortOf(p.name);
      settings.merges[rawKey(plan.store.id, plan.rename(p.name))] = merged;
      if (p.hpp !== null) settings.hpp[`g::${merged}`] = p.hpp;
    }
  }
  const exp = (date: string, category: Expense['category'], amount: number, storeId: string, note: string): Expense => ({ id: `contoh-${date}-${category}-${storeId}`, date, category, amount, storeId, note });
  for (const m of ['05', '06', '07']) {
    settings.expenses.push(
      exp(`2026-${m}-02`, 'stok', 5500000, 'all', 'Belanja bahan rempah'),
      exp(`2026-${m}-16`, 'stok', 3000000, 'all', 'Belanja matcha'),
      exp(`2026-${m}-25`, 'gaji', 1500000, 'all', 'Gaji admin packing'),
      exp(`2026-${m}-10`, 'packaging', 350000, 'contoh-utama', 'Bubble wrap dan kardus'),
      exp(`2026-${m}-12`, 'packaging', 150000, 'contoh-live', 'Pouch live'),
    );
  }
  return { data, settings };
}
