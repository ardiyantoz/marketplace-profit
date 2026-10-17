import * as XLSX from 'xlsx';
import { monthKey } from './format';
import type { AdRow, FileMeta, HppMap, IncomeRow, OrderLine } from './types';

export type FileKind = 'order' | 'income' | 'ads' | 'hpp';

export type ParsedFile =
  | { kind: 'order'; rows: OrderLine[]; meta: FileMeta }
  | { kind: 'income'; rows: IncomeRow[]; meta: FileMeta }
  | { kind: 'ads'; rows: AdRow[]; meta: FileMeta }
  | { kind: 'hpp'; hpp: HppMap; meta: FileMeta };

type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Column names change between Shopee report versions (several were renamed
// from the July 2026 report onward), so every field accepts a list of aliases.
const ORDER_COLS = {
  orderNo: ['nopesanan', 'nomorpesanan', 'orderid', 'idpesanan'],
  status: ['statuspesanan', 'status'],
  date: ['waktupesanandibuat', 'tanggalpesanandibuat', 'waktupesanan', 'tanggalpesanan', 'createtime'],
  product: ['namaproduk', 'produk', 'productname'],
  variant: ['namavariasi', 'variasi'],
  qty: ['jumlah', 'jumlahproduk', 'qty', 'kuantitas', 'quantity'],
  unitOriginal: ['hargaawal', 'hargaasliproduk', 'hargaasli', 'originalprice'],
  unitDiscounted: ['hargasetelahdiskon', 'hargaproduk', 'hargadiskon', 'dealprice'],
  payment: ['metodepembayaran', 'paymentmethod'],
  buyer: ['usernamepembeli', 'username', 'buyerusername'],
};

const INCOME_COLS = {
  orderNo: ORDER_COLS.orderNo,
  settled: ['tanggaldanadilepaskan', 'waktudanadilepaskan', 'tanggalpenghasilandilepas', 'tanggalpenghasilan'],
  admin: ['biayaadministrasi'],
  service: ['biayalayanan'],
  ams: ['biayakomisiams', 'komisiams'],
  processing: ['biayaprosespesanan'],
  payout: ['totalpenghasilan', 'penghasilan', 'jumlahdilepaskan'],
};
const INCOME_SHIPPING = ['ongkirdibayarpembeli', 'diskonongkirditanggungjasakirim', 'gratisongkirdarishopee', 'ongkiryangditeruskanolehshopeekejasakirim', 'ongkoskirimpengembalianbarang', 'pengembalianbiayakirim', 'ongkirditanggungpenjual'];
const INCOME_VOUCHER = ['voucherdisponsorolehpenjual', 'vouchercofunddisponsorolehpenjual', 'cashbackkoindisponsorolehpenjual', 'cashbackkoincofunddisponsorolehpenjual', 'promogratisongkirdaripenjual'];
const INCOME_OTHER = ['premi', 'biayaprogramhematbiayakirim', 'biayatransaksi', 'biayakampanye', 'biayaisisaldootomatis', 'pengembaliandana', 'jumlahpengembaliandanakepembeli'];

const ADS_COLS = {
  date: ['tanggal', 'date', 'hari', 'waktu'],
  spend: ['biaya', 'biayaiklan', 'pengeluaran', 'spend', 'cost'],
  gmv: ['penjualanlangsunggmv', 'gmv', 'omzetiklan', 'penjualan', 'penjualanlangsung'],
  campaign: ['namaiklan', 'iklan', 'campaign', 'namakampanye'],
  product: ['namaproduk', 'produk', 'productname'],
};

/** Parses Indonesian-formatted numbers: "Rp1.234.567", "-1.570", "12,5". */
export function toNumber(v: Cell): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === '' || typeof v === 'boolean' || v instanceof Date) return 0;
  let s = String(v).trim().replace(/rp/i, '').replace(/\s/g, '').replace('−', '-');
  if (!s || s === '-') return 0;
  const negative = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[()]/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

export function toDate(v: Cell): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M) : null;
  }
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return null;
}

function findHeader(rows: Row[], mustHave: string[][]): number {
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map(norm);
    if (mustHave.every((aliases) => cells.some((c) => aliases.includes(c)))) return i;
  }
  return -1;
}

function indexOf(header: string[], aliases: string[]): number {
  for (const a of aliases) {
    const exact = header.indexOf(a);
    if (exact >= 0) return exact;
  }
  for (const a of aliases) {
    const partial = header.findIndex((h) => h.startsWith(a));
    if (partial >= 0) return partial;
  }
  return -1;
}

function columnMap<T extends Record<string, string[]>>(header: string[], spec: T) {
  const out = {} as Record<keyof T, number>;
  for (const key of Object.keys(spec) as (keyof T)[]) out[key] = indexOf(header, spec[key]);
  return out;
}

const cell = (row: Row, i: number): Cell => (i >= 0 ? row[i] : undefined);
const text = (row: Row, i: number) => String(cell(row, i) ?? '').trim();

function readSheets(buf: ArrayBuffer): Row[][] {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  return wb.SheetNames.map((n) => XLSX.utils.sheet_to_json<Row>(wb.Sheets[n], { header: 1, raw: true, defval: null }));
}

function months(dates: (Date | null)[]): string[] {
  return [...new Set(dates.filter((d): d is Date => !!d).map(monthKey))].sort();
}

function parseOrders(rows: Row[], h: number, name: string): ParsedFile {
  const header = rows[h].map(norm);
  const c = columnMap(header, ORDER_COLS);
  const warnings: string[] = [];
  if (c.unitDiscounted < 0) warnings.push('Kolom harga setelah diskon tidak ditemukan; harga awal dipakai.');
  if (c.date < 0) warnings.push('Kolom waktu pesanan tidak ditemukan; bulan tidak bisa dibaca.');
  const out: OrderLine[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const orderNo = text(r, c.orderNo);
    const product = text(r, c.product);
    if (!orderNo || !product) continue;
    const date = toDate(cell(r, c.date)) ?? new Date(NaN);
    const status = text(r, c.status);
    const unitOriginal = toNumber(cell(r, c.unitOriginal));
    const discounted = toNumber(cell(r, c.unitDiscounted));
    out.push({
      orderNo,
      date,
      month: Number.isNaN(date.getTime()) ? 'tanpa-tanggal' : monthKey(date),
      status,
      cancelled: /batal|cancel/i.test(status),
      product,
      variant: text(r, c.variant),
      qty: toNumber(cell(r, c.qty)) || 1,
      unitOriginal: unitOriginal || discounted,
      unitDiscounted: discounted || unitOriginal,
      payment: text(r, c.payment) || 'Tidak diketahui',
      buyer: text(r, c.buyer),
      row: i + 1,
    });
  }
  return { kind: 'order', rows: out, meta: { name, rows: out.length, months: months(out.map((o) => o.date)), warnings } };
}

function parseIncome(rows: Row[], h: number, name: string): ParsedFile {
  const header = rows[h].map(norm);
  const c = columnMap(header, INCOME_COLS);
  const group = (aliases: string[]) => aliases.map((a) => header.indexOf(a)).filter((i) => i >= 0);
  const ship = group(INCOME_SHIPPING);
  const voucher = group(INCOME_VOUCHER);
  const other = group(INCOME_OTHER);
  const warnings: string[] = [];
  if (c.payout < 0) warnings.push('Kolom Total Penghasilan tidak ditemukan.');
  const out: IncomeRow[] = [];
  const cost = (r: Row, i: number) => Math.max(0, -toNumber(cell(r, i)));
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const orderNo = text(r, c.orderNo);
    if (!orderNo || /total/i.test(orderNo)) continue;
    const shipNet = ship.reduce((s, j) => s + toNumber(r[j]), 0);
    out.push({
      orderNo,
      settled: toDate(cell(r, c.settled)),
      admin: cost(r, c.admin),
      service: cost(r, c.service),
      ams: cost(r, c.ams),
      processing: cost(r, c.processing),
      shipping: Math.max(0, -shipNet),
      voucher: voucher.reduce((s, j) => s + Math.abs(toNumber(r[j])), 0),
      other: other.reduce((s, j) => s + Math.abs(toNumber(r[j])), 0),
      payout: toNumber(cell(r, c.payout)),
      row: i + 1,
    });
  }
  return { kind: 'income', rows: out, meta: { name, rows: out.length, months: months(out.map((o) => o.settled)), warnings } };
}

function parseAds(rows: Row[], h: number, name: string): ParsedFile {
  const header = rows[h].map(norm);
  const c = columnMap(header, ADS_COLS);
  const warnings: string[] = [];
  if (c.date < 0) warnings.push('File iklan tidak punya kolom tanggal; biaya dibagi rata ke semua bulan.');
  const out: AdRow[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const spend = toNumber(cell(r, c.spend));
    if (!spend) continue;
    const date = toDate(cell(r, c.date));
    out.push({
      date,
      month: date ? monthKey(date) : null,
      campaign: text(r, c.campaign),
      product: text(r, c.product),
      spend: Math.abs(spend),
      gmv: toNumber(cell(r, c.gmv)),
      row: i + 1,
    });
  }
  return { kind: 'ads', rows: out, meta: { name, rows: out.length, months: months(out.map((a) => a.date)), warnings } };
}

function parseHpp(rows: Row[], h: number, name: string): ParsedFile {
  const header = rows[h].map(norm);
  const p = indexOf(header, ['namaproduk', 'produk']);
  const v = indexOf(header, ['hppperunit', 'hpp', 'modal', 'hargapokok']);
  const hpp: HppMap = {};
  for (let i = h + 1; i < rows.length; i++) {
    const product = text(rows[i], p);
    const value = toNumber(cell(rows[i], v));
    if (product && value > 0) hpp[product] = value;
  }
  return { kind: 'hpp', hpp, meta: { name, rows: Object.keys(hpp).length, months: [], warnings: [] } };
}

/** Reads one uploaded file and decides which Shopee report it is from its headers. */
export async function parseFile(file: File): Promise<ParsedFile> {
  const sheets = readSheets(await file.arrayBuffer());
  for (const rows of sheets) {
    let h = findHeader(rows, [['nopesanan', 'nomorpesanan', 'orderid', 'idpesanan'], ['totalpenghasilan', 'penghasilan', 'biayaadministrasi']]);
    if (h >= 0) return parseIncome(rows, h, file.name);
    h = findHeader(rows, [['nopesanan', 'nomorpesanan', 'orderid', 'idpesanan'], ORDER_COLS.product]);
    if (h >= 0) return parseOrders(rows, h, file.name);
    h = findHeader(rows, [['namaproduk', 'produk'], ['hppperunit', 'hpp', 'modal', 'hargapokok']]);
    if (h >= 0) return parseHpp(rows, h, file.name);
    h = findHeader(rows, [ADS_COLS.spend]);
    if (h >= 0) return parseAds(rows, h, file.name);
  }
  throw new Error(`${file.name}: kolom laporan Shopee tidak dikenali. Pastikan ini file Order, Income (Penghasilan) atau Iklan dari Seller Centre.`);
}

export function downloadHppTemplate(products: string[], hpp: HppMap) {
  const rows = [['Nama Produk', 'HPP per unit'], ...products.map((p) => [p, hpp[p] ?? ''])];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 60 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'HPP');
  XLSX.writeFile(wb, 'template-hpp.xlsx');
}
