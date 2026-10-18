import type { ReactNode } from 'react';
import { MARKETPLACES, type MarketplaceInfo } from '../lib/marketplace';
import type { Source, Store } from '../lib/types';

export const SOURCE_LABEL: Record<Source, string> = { order: 'Order', income: 'Income', ads: 'Iklan', hpp: 'HPP', manual: 'Catatan' };

export function Ply({ source }: { source: Source }) {
  return (
    <span className={`ply ply-${source}`} title={`Dari file ${SOURCE_LABEL[source]}`}>
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function Plies({ sources, label }: { sources: Source[]; label?: string }) {
  return (
    <span className="chips">
      {label && <span className="muted">{label}</span>}
      {sources.map((s) => (
        <Ply key={s} source={s} />
      ))}
    </span>
  );
}

const paths = {
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M5 20h14',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  download: 'M12 4v12m0 0 5-5m-5 5-5-5M5 20h14',
  close: 'M6 6l12 12M18 6 6 18',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  sort: 'M8 9l4-4 4 4M16 15l-4 4-4-4',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  up: 'M12 19V5m0 0-6 6m6-6 6 6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  merge: 'M6 4v5a6 6 0 0 0 6 6h6m0 0-3-3m3 3-3 3M6 20v-5',
  down: 'M12 5v14m0 0-6-6m6 6 6-6',
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function Notice({ tone, children }: { tone: 'warn' | 'info' | 'loss'; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'info' ? 'note' : 'status'}>
      <Icon name={tone === 'info' ? 'info' : 'alert'} />
      <div>{children}</div>
    </div>
  );
}

export function NoData({ M, onUpload, onSample }: { M: MarketplaceInfo; onUpload: () => void; onSample: () => void }) {
  return (
    <div className="empty">
      <h2>Belum ada data toko</h2>
      <p>Upload file pesanan dan penghasilan dari {M.center}. Semua dihitung di browser ini, file tidak dikirim ke mana pun. Mau lihat dulu cara kerjanya? Pakai data contoh.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={onUpload}>
          <Icon name="upload" />
          Upload data
        </button>
        <button className="btn btn-secondary" onClick={onSample}>
          Pakai data contoh
        </button>
      </div>
    </div>
  );
}

/** A figure tile that names its source file and links to the rows behind it. */
export function Stat({ source, label, value, href, onOpen, open }: { source: Source; label: string; value: ReactNode; href?: string; onOpen?: () => void; open?: boolean }) {
  return (
    <div className={`stat ${source}${open ? ' open' : ''}`}>
      <dt>
        {onOpen ? (
          <button className="stat-link" aria-expanded={!!open} aria-controls="cash-trace" onClick={onOpen}>
            {label}
          </button>
        ) : href ? (
          <a className="stat-link" href={href}>
            {label}
          </a>
        ) : (
          <span>{label}</span>
        )}
        <Ply source={source} />
      </dt>
      <dd className="num">{value}</dd>
      {(href || onOpen) && (
        <dd className="stat-cue" aria-hidden="true">
          {open ? 'Tutup baris' : 'Lihat baris'} <Icon name="arrow" size={14} />
        </dd>
      )}
    </div>
  );
}

/** A store's monogram: identity by initials, never by colour (colour means "source file"). */
export function StoreMark({ store, size = 'md' }: { store: Store; size?: 'sm' | 'md' }) {
  const initials = store.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span className={`store-mark ${size}`} title={`${store.name} · ${MARKETPLACES[store.marketplace].name}`} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

export function StoreTag({ store }: { store: Store }) {
  return (
    <span className="store-tag">
      <StoreMark store={store} size="sm" />
      <span>{store.name}</span>
      <span className="mp">{store.marketplace === 'tiktok' ? 'TikTok' : 'Shopee'}</span>
    </span>
  );
}
