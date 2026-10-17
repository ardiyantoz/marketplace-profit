import type { ReactNode } from 'react';
import type { Source } from '../lib/types';

export const SOURCE_LABEL: Record<Source, string> = { order: 'Order', income: 'Income', ads: 'Iklan', hpp: 'HPP' };

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

export function NoData({ onUpload, onSample }: { onUpload: () => void; onSample: () => void }) {
  return (
    <div className="empty">
      <h2>Belum ada data toko</h2>
      <p>Upload file Order dan Income dari Shopee Seller Centre. Semua dihitung di browser ini, file tidak dikirim ke mana pun. Mau lihat dulu cara kerjanya? Pakai data contoh.</p>
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
export function Stat({ source, label, value, href }: { source: Source; label: string; value: ReactNode; href?: string }) {
  return (
    <div className={`stat ${source}`}>
      <dt>
        {href ? (
          <a className="stat-link" href={href}>
            {label}
          </a>
        ) : (
          <span>{label}</span>
        )}
        <Ply source={source} />
      </dt>
      <dd className="num">{value}</dd>
      {href && (
        <dd className="stat-cue" aria-hidden="true">
          Lihat baris <Icon name="arrow" size={14} />
        </dd>
      )}
    </div>
  );
}
