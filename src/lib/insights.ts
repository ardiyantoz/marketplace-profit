import { WEEKDAYS_FULL as WEEKDAYS, monthLabel, pct, rpShort, shortName } from './format';
import type { Summary } from './compute';
import type { Source } from './types';

export interface Insight {
  id: string;
  title: string;
  detail: string;
  action: string;
  impact: number; // estimated profit gain in rupiah, 0 when not priced
  sources: Source[];
  tone: 'critical' | 'warning' | 'info';
  link?: 'produk' | 'order';
}

const AD_TARGET = 0.15;

/** Deterministic rules over the summary, ranked by rupiah impact. */
export function buildInsights(s: Summary, prev: Summary | null): Insight[] {
  const out: Insight[] = [];
  if (!s.omzet) return out;

  const adRatio = s.ads / s.omzet;
  if (adRatio > AD_TARGET) {
    const gain = (adRatio - AD_TARGET) * s.omzet;
    const newMargin = (s.profit + gain) / s.omzet;
    const worst = s.products.filter((p) => p.ads > 0 && p.sales > 0 && p.ads / p.sales > AD_TARGET).sort((a, b) => b.ads - a.ads).slice(0, 3);
    out.push({
      id: 'ads',
      title: `Biaya iklan ${pct(adRatio, 0)} dari omzet`,
      detail: `Batas sehat di bawah ${pct(AD_TARGET, 0)}. Kalau turun ke ${pct(AD_TARGET, 0)}, profit naik sekitar ${rpShort(gain)} dan margin jadi ${pct(newMargin)}.`,
      action: worst.length ? `Kurangi atau jeda iklan untuk: ${worst.map((p) => shortName(p.product)).join(', ')}.` : 'Jeda kampanye dengan ROAS paling rendah lebih dulu.',
      impact: gain,
      sources: ['ads', 'order'],
      tone: 'critical',
    });
  }

  const losing = s.products.filter((p) => p.profit < 0);
  if (losing.length) {
    const loss = -losing.reduce((t, p) => t + p.profit, 0);
    out.push({
      id: 'losing',
      title: `${losing.length} produk merugi, total ${rpShort(-loss)}`,
      detail: losing.map((p) => `${shortName(p.product)} (${rpShort(p.profit)})`).join('; ') + '.',
      action: 'Naikkan harga, tekan HPP, atau hentikan iklan untuk produk ini.',
      impact: loss,
      sources: ['hpp', 'income'],
      tone: 'critical',
      link: 'produk',
    });
  }

  const belowCost = s.products.filter((p) => p.qty > 0 && !p.hppEstimated && p.sales / p.qty - (p.hppUnit ?? 0) - (p.marketplace + p.voucher) / p.qty < 0);
  if (belowCost.length) {
    out.push({
      id: 'below-cost',
      title: `${belowCost.length} produk dijual di bawah modal`,
      detail: 'Bahkan sebelum iklan, harga jual dikurangi HPP dan potongan Shopee sudah minus.',
      action: belowCost.slice(0, 3).map((p) => `${shortName(p.product)}: harga minimal ${rpShort((p.hppUnit ?? 0) + (p.marketplace + p.voucher) / p.qty)}`).join('; ') + '.',
      impact: 0,
      sources: ['hpp', 'income'],
      tone: 'warning',
      link: 'produk',
    });
  }

  const shipRatio = s.fees.shipping / s.omzet;
  if (shipRatio > 0.04) {
    out.push({
      id: 'shipping',
      title: `Ongkir yang kamu tanggung ${pct(shipRatio)} dari omzet`,
      detail: `Total ${rpShort(s.fees.shipping)} ongkir keluar dari kantongmu, bukan pembeli.`,
      action: 'Pasang minimal belanja untuk gratis ongkir, atau batasi gratis ongkir di produk murah.',
      impact: s.fees.shipping - 0.04 * s.omzet,
      sources: ['income'],
      tone: 'warning',
    });
  }

  if (s.missingHpp.length) {
    out.push({
      id: 'hpp',
      title: `${s.missingHpp.length} dari ${s.products.length} produk belum ada HPP`,
      detail: `Profit produk itu masih estimasi (${pct(s.hppRatio, 0)} dari harga jual, rata-rata tokomu).`,
      action: 'Isi HPP di tab Produk & HPP supaya angkanya pasti.',
      impact: 0,
      sources: ['hpp'],
      tone: 'info',
      link: 'produk',
    });
  }

  if (prev && prev.omzet) {
    const delta = s.profit - prev.profit;
    if (delta < 0 && Math.abs(delta) > 0.1 * Math.abs(prev.profit || 1)) {
      const prevBy = new Map(prev.products.map((p) => [p.product, p.profit]));
      const drivers = s.products
        .map((p) => ({ p, d: p.profit - (prevBy.get(p.product) ?? 0) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .filter((x) => x.d < 0);
      out.push({
        id: 'mom',
        title: `Profit turun ${rpShort(delta)} dari ${monthLabel(prev.month)}`,
        detail: drivers.length ? `Paling turun: ${drivers.map((x) => `${shortName(x.p.product)} (${rpShort(x.d)})`).join('; ')}.` : 'Penurunan merata di banyak produk.',
        action: 'Cek perubahan harga, iklan, dan stok produk di atas.',
        impact: 0,
        sources: ['order', 'income'],
        tone: 'warning',
      });
    }
  }

  const top = [...s.products].sort((a, b) => b.profit - a.profit)[0];
  const positive = s.products.filter((p) => p.profit > 0).reduce((t, p) => t + p.profit, 0);
  if (top && positive > 0 && top.profit / positive > 0.4) {
    out.push({
      id: 'concentration',
      title: `${pct(top.profit / positive, 0)} profit datang dari satu produk`,
      detail: `${shortName(top.product)} menopang tokomu.`,
      action: 'Jaga stoknya, dan kembangkan satu produk lain sebagai andalan kedua.',
      impact: 0,
      sources: ['order', 'hpp'],
      tone: 'info',
    });
  }

  const best = [...s.weekday].sort((a, b) => b.avg - a.avg)[0];
  if (best && best.avg > 0) {
    out.push({
      id: 'weekday',
      title: `Hari ${WEEKDAYS[best.day]} paling ramai`,
      detail: `Rata-rata penjualan ${rpShort(best.avg)} per hari ${WEEKDAYS[best.day]}.`,
      action: `Jadwalkan promo atau flash sale di hari ${WEEKDAYS[best.day]}.`,
      impact: 0,
      sources: ['order'],
      tone: 'info',
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => b.impact - a.impact || rank[a.tone] - rank[b.tone]);
}
