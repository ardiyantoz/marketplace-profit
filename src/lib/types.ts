import type { Marketplace } from './marketplace';

// Where a number came from. Each source has its own ply colour in the UI.
export type Source = 'order' | 'income' | 'ads' | 'hpp' | 'manual';

export interface OrderLine {
  storeId: string;
  orderNo: string;
  date: Date;
  month: string; // YYYY-MM
  status: string;
  cancelled: boolean;
  product: string;
  variant: string;
  qty: number;
  unitOriginal: number;
  unitDiscounted: number;
  payment: string;
  buyer: string;
  row: number; // 1-based row in the source sheet
}

// All cost fields are positive amounts taken out of the seller's money.
export interface IncomeRow {
  storeId: string;
  orderNo: string;
  settled: Date | null;
  admin: number;
  service: number;
  ams: number;
  processing: number;
  shipping: number;
  voucher: number;
  other: number;
  payout: number;
  row: number;
}

export interface AdRow {
  storeId: string;
  date: Date | null;
  month: string | null;
  campaign: string;
  product: string;
  spend: number;
  gmv: number;
  row: number;
}

export interface FileMeta {
  name: string;
  rows: number;
  months: string[];
  warnings: string[];
}

export type FileSlot = 'order' | 'income' | 'ads';

export interface Store {
  id: string;
  name: string;
  marketplace: Marketplace;
  files: Partial<Record<FileSlot, FileMeta>>;
}

export interface Dataset {
  stores: Store[];
  orders: OrderLine[];
  income: IncomeRow[];
  ads: AdRow[];
  sample: boolean;
}

export type HppMap = Record<string, number>; // keyed by product id (see productId)

export type ExpenseCategory = 'stok' | 'gaji' | 'packaging' | 'sewa' | 'lainnya';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  storeId: string; // a store id, or 'all' to split by omzet
  note: string;
}

export interface Settings {
  hpp: HppMap;
  merges: Record<string, string>; // raw product key -> merged product name
  expenses: Expense[];
  opening: { date: string; amount: number } | null;
}

export const emptyDataset: Dataset = { stores: [], orders: [], income: [], ads: [], sample: false };
export const emptySettings: Settings = { hpp: {}, merges: {}, expenses: [], opening: null };

/** One product as sold in one store. */
export const rawKey = (storeId: string, product: string) => `${storeId}::${product}`;

/** The product the numbers roll up to: a merged group, or the store's own product. */
export function productId(settings: Settings, storeId: string, product: string): string {
  const merged = settings.merges[rawKey(storeId, product)];
  return merged ? `g::${merged}` : rawKey(storeId, product);
}

export function productLabel(id: string): string {
  return id.startsWith('g::') ? id.slice(3) : id.split('::').slice(1).join('::');
}
