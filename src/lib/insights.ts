import { WEEKDAYS_FULL as WEEKDAYS, monthLabel, pct, rpShort, shortName } from './format';
import type { Summary } from './compute';
import type { MarketplaceInfo } from './marketplace';
import type { Source, Store } from './types';

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
export function buildInsights(s: Summary, prev: Summary | null, M: MarketplaceInfo): Insight[] {
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
      detail: `Bahkan sebelum iklan, harga jual dikurangi HPP dan ${M.cutLabel.toLowerCase()} sudah minus.`,
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

export interface StoreSummary {
  store: Store;
  s: Summary;
}

/** Rules that only make sense across several stores. */
export function buildStoreInsights(stores: StoreSummary[], all: Summary): Insight[] {
  const out: Insight[] = [];
  const active = stores.filter((x) => x.s.omzet > 0);
  if (active.length < 2 || !all.omzet) return out;

  for (const { store, s } of active.filter((x) => x.s.profit < 0).sort((a, b) => a.s.profit - b.s.profit)) {
    const causes = [
      { label: 'iklan', v: s.ads },
      { label: 'potongan marketplace', v: s.marketplace + s.voucher },
      { label: 'HPP', v: s.hppKnown + s.hppEstimated },
      { label: 'biaya operasional', v: s.opex },
    ].sort((a, b) => b.v - a.v);
    out.push({
      id: `store-loss-${store.id}`,
      title: `Toko ${store.name} rugi ${rpShort(s.profit)}`,
      detail: `Margin ${pct(s.margin)}. Biaya terbesar: ${causes[0].label} (${pct(causes[0].v / s.omzet, 0)} dari omzet toko ini).`,
      action: s.ads / s.omzet > AD_TARGET ? `Mulai dari iklan toko ini: rasionya ${pct(s.ads / s.omzet, 0)}, di atas batas ${pct(AD_TARGET, 0)}.` : 'Cek harga jual dan HPP produk terlaris toko ini.',
      impact: -s.profit,
      sources: ['order', 'income', 'ads'],
      tone: 'critical',
      link: 'produk',
    });
  }

  const overallAds = all.ads / all.omzet;
  const worstAds = [...active].sort((a, b) => b.s.ads / b.s.omzet - a.s.ads / a.s.omzet)[0];
  const worstRatio = worstAds.s.ads / worstAds.s.omzet;
  if (worstRatio > 0.12 && worstRatio > overallAds * 1.25) {
    out.push({
      id: 'store-ads',
      title: `Iklan toko ${worstAds.store.name} paling boros: ${pct(worstRatio, 0)} dari omzet`,
      detail: `Rata-rata semua toko ${pct(overallAds, 0)}. ${active.map((x) => `${x.store.name} ${pct(x.s.ads / x.s.omzet, 0)}`).join(' · ')}.`,
      action: `Turunkan iklan ${worstAds.store.name} ke rata-rata toko lain, atau pindahkan anggarannya ke toko yang iklannya lebih efisien.`,
      impact: (worstRatio - overallAds) * worstAds.s.omzet,
      sources: ['ads', 'order'],
      tone: 'warning',
    });
  }

  // Same (merged) product sold at different prices across stores.
  const gaps: { name: string; low: string; high: string; lowPrice: number; highPrice: number; gap: number }[] = [];
  const priceOf = new Map<string, { store: string; price: number; margin: number }[]>();
  for (const { store, s } of active) {
    for (const p of s.products) {
      if (!p.id.startsWith('g::') || !p.qty) continue;
      if (!priceOf.has(p.id)) priceOf.set(p.id, []);
      priceOf.get(p.id)!.push({ store: store.name, price: p.sales / p.qty, margin: p.margin });
    }
  }
  for (const [id, list] of priceOf) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.price - b.price);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const gap = hi.price / lo.price - 1;
    if (gap >= 0.08) gaps.push({ name: id.slice(3), low: lo.store, high: hi.store, lowPrice: lo.price, highPrice: hi.price, gap });
  }
  if (gaps.length) {
    gaps.sort((a, b) => b.gap - a.gap);
    out.push({
      id: 'store-price',
      title: `${gaps.length} produk dijual dengan harga berbeda antar toko`,
      detail: gaps
        .slice(0, 3)
        .map((g) => `${g.name}: ${rpShort(g.lowPrice)} di ${g.low} vs ${rpShort(g.highPrice)} di ${g.high} (${pct(g.gap, 0)})`)
        .join('; ') + '.',
      action: 'Pastikan harga termurah masih di atas modal plus potongan marketplace. Kalau tidak, naikkan harga di toko itu.',
      impact: 0,
      sources: ['order', 'hpp'],
      tone: 'warning',
      link: 'produk',
    });
  }

  const byOmzet = [...active].sort((a, b) => b.s.omzet - a.s.omzet);
  const share = byOmzet[0].s.omzet / all.omzet;
  out.push({
    id: 'store-share',
    title: `${pct(share, 0)} omzet datang dari toko ${byOmzet[0].store.name}`,
    detail: byOmzet.map((x) => `${x.store.name} ${pct(x.s.omzet / all.omzet, 0)} omzet, profit ${rpShort(x.s.profit)}`).join(' · ') + '.',
    action: share > 0.6 ? 'Tokomu bergantung pada satu toko. Kalau toko itu kena penalti atau turun, semua ikut turun; kembangkan toko kedua.' : 'Porsi omzet antar toko cukup seimbang.',
    impact: 0,
    sources: ['order'],
    tone: share > 0.6 ? 'warning' : 'info',
  });
  return out;
}
