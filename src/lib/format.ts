const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const WEEKDAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Product name without Shopee's long SEO suffix. */
export const shortName = (p: string) => p.split(' - ')[0];

const MINUS = '−';

const grouped = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Full rupiah: Rp1.725.818 / −Rp41.000 */
export function rp(value: number): string {
  const sign = value < 0 ? MINUS : '';
  return `${sign}Rp${grouped.format(Math.round(Math.abs(value)))}`;
}

/** Short rupiah for headline figures: Rp22,7 jt / Rp390 rb */
export function rpShort(value: number): string {
  const sign = value < 0 ? MINUS : '';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}Rp${oneDecimal.format(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}Rp${oneDecimal.format(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}Rp${grouped.format(Math.round(abs / 1e3))} rb`;
  return `${sign}Rp${grouped.format(Math.round(abs))}`;
}

export function pct(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '–';
  const f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = ratio < 0 ? MINUS : '';
  return `${sign}${f.format(Math.abs(ratio * 100))}%`;
}

export function num(value: number): string {
  const sign = value < 0 ? MINUS : '';
  return `${sign}${grouped.format(Math.abs(value))}`;
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return `${(short ? MONTHS_SHORT : MONTHS)[m - 1]} ${y}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dateLabel(d: Date | null): string {
  if (!d) return '–';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function prevMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

export { MINUS };
