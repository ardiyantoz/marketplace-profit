// Where a number came from. Each source has its own ply colour in the UI.
export type Source = 'order' | 'income' | 'ads' | 'hpp';

export interface OrderLine {
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

export interface Dataset {
  orders: OrderLine[];
  income: IncomeRow[];
  ads: AdRow[];
  files: Partial<Record<'order' | 'income' | 'ads', FileMeta>>;
  sample: boolean;
}

export type HppMap = Record<string, number>;

export const emptyDataset: Dataset = { orders: [], income: [], ads: [], files: {}, sample: false };
