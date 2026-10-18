export type Marketplace = 'shopee' | 'tiktok';

export interface MarketplaceInfo {
  id: Marketplace | 'mixed';
  name: string;
  center: string; // seller dashboard name
  payoutLabel: string; // what the marketplace calls the money it releases
  cutLabel: string; // short name for the marketplace's fee cut
  fees: { admin: string; service: string; ams: string; processing: string; shipping: string };
  slots: { order: string; income: string; ads: string };
}

export const MARKETPLACES: Record<Marketplace, MarketplaceInfo> = {
  shopee: {
    id: 'shopee',
    name: 'Shopee',
    center: 'Shopee Seller Centre',
    payoutLabel: 'Total Penghasilan',
    cutLabel: 'Potongan Shopee',
    fees: { admin: 'Administrasi', service: 'Layanan', ams: 'Komisi AMS', processing: 'Proses pesanan', shipping: 'Ongkir ditanggung' },
    slots: {
      order: 'Wajib · Pesanan Saya › Export',
      income: 'Wajib · Penghasilan Saya › Laporan',
      ads: 'Opsional · Iklan Shopee › Laporan',
    },
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Shop',
    center: 'TikTok Shop Seller Center',
    payoutLabel: 'Total penyelesaian',
    cutLabel: 'Potongan TikTok Shop',
    fees: { admin: 'Komisi platform', service: 'Biaya layanan', ams: 'Komisi afiliasi', processing: 'Biaya transaksi', shipping: 'Ongkir ditanggung' },
    slots: {
      order: 'Wajib · Pesanan › Kelola pesanan › Ekspor',
      income: 'Wajib · Keuangan › Laporan penyelesaian › Ekspor',
      ads: 'Opsional · TikTok Ads Manager › Laporan',
    },
  },
};

/** Labels for a set of stores: the marketplace's own words when they share one, neutral words when mixed. */
export const MIXED: MarketplaceInfo = {
  id: 'mixed',
  name: 'Shopee & TikTok Shop',
  center: 'Seller Center',
  payoutLabel: 'Dana dilepas',
  cutLabel: 'Potongan marketplace',
  fees: { admin: 'Komisi / administrasi', service: 'Biaya layanan', ams: 'Komisi afiliasi / AMS', processing: 'Biaya proses / transaksi', shipping: 'Ongkir ditanggung' },
  slots: MARKETPLACES.shopee.slots,
};

export function infoFor(marketplaces: Marketplace[]): MarketplaceInfo {
  const set = [...new Set(marketplaces)];
  if (set.length === 1) return MARKETPLACES[set[0]];
  return set.length ? MIXED : MARKETPLACES.shopee;
}
