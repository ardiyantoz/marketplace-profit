import { useMemo, useState, type ReactNode } from 'react';
import type { Tab } from '../App';
import { DailyLine, Waterfall, WaterfallList, WeekdayBars } from '../components/charts';
import { Icon, Plies, Ply, SOURCE_LABEL } from '../components/ui';
import type { ProductStat, Summary } from '../lib/compute';
import { dateLabel, monthLabel, num, pct, rp, rpShort } from '../lib/format';
import type { Insight } from '../lib/insights';
import type { Source } from '../lib/types';

type Stage = 'order' | 'income' | 'ads' | 'hpp' | 'other';

interface Props {
  summary: Summary;
  insights: Insight[];
  toolbar: ReactNode;
  goTo: (t: Tab) => void;
}

export function Dashboard({ summary: s, insights, toolbar, goTo }: Props) {
  const [open, setOpen] = useState<Stage | null>(null);
  const loss = s.profit < 0;
  const period = s.month === 'all' ? 'semua bulan' : monthLabel(s.month);

  const costs = [
    { key: 'ads', label: 'Biaya iklan', value: s.ads, color: 'var(--ads-ink)', source: 'ads' as Source },
    { key: 'admin', label: 'Administrasi', value: s.fees.admin, color: '#a8324f', source: 'income' as Source },
    { key: 'service', label: 'Layanan', value: s.fees.service, color: '#c4506d', source: 'income' as Source },
    { key: 'shipping', label: 'Ongkir ditanggung', value: s.fees.shipping, color: '#d6718b', source: 'income' as Source },
    { key: 'ams', label: 'Komisi AMS', value: s.fees.ams, color: '#e293a7', source: 'income' as Source },
    { key: 'processing', label: 'Proses pesanan', value: s.fees.processing, color: '#ebb1c0', source: 'income' as Source },
    { key: 'voucher', label: 'Voucher penjual', value: s.voucher, color: '#f2cbd5', source: 'income' as Source },
    { key: 'other', label: 'Lainnya', value: s.other, color: '#f7dfe6', source: 'income' as Source },
  ].sort((a, b) => b.value - a.value);
  const beforeHpp = s.omzet - s.marketplace - s.voucher - s.ads - s.other;
  const biggest = [{ label: 'HPP', value: s.hppKnown + s.hppEstimated }, ...costs].sort((a, b) => b.value - a.value)[0];

  const diagnoses = insights.filter((i) => i.tone !== 'info').slice(0, 3);
  const best = useMemo(() => [...s.products].sort((a, b) => b.qty - a.qty)[0], [s.products]);
  const topMargin = useMemo(() => [...s.products].filter((p) => p.qty >= 2).sort((a, b) => b.margin - a.margin)[0], [s.products]);
  const worst = s.products[s.products.length - 1];

  const stages: { id: Stage; source: Source; label: string; value: number; hint: string }[] = [
    { id: 'order', source: 'order', label: 'Omzet', value: s.omzet, hint: `${num(s.orders)} pesanan · ${num(s.qty)} pcs` },
    { id: 'income', source: 'income', label: 'Potongan Shopee + voucher', value: -(s.marketplace + s.voucher), hint: `${pct((s.marketplace + s.voucher) / (s.omzet || 1))} dari omzet` },
    { id: 'ads', source: 'ads', label: 'Biaya iklan', value: -s.ads, hint: s.hasAds ? `${pct(s.ads / (s.omzet || 1))} dari omzet` : 'File iklan belum diupload' },
    { id: 'hpp', source: 'hpp', label: s.hppEstimated ? `HPP + estimasi ${s.missingHpp.length} produk` : 'HPP', value: -(s.hppKnown + s.hppEstimated), hint: `${pct((s.hppKnown + s.hppEstimated) / (s.omzet || 1))} dari omzet` },
    { id: 'other', source: 'income', label: 'Biaya lainnya', value: -s.other, hint: 'Premi, transaksi, kampanye' },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Dashboard profit</h1>
          <p>
            {period === 'semua bulan' ? 'Semua bulan' : period}
          </p>
        </div>
        {toolbar}
      </header>

      <section className="panel verdict" aria-labelledby="v-title">
        <div className="verdict-main">
          <h2 id="v-title" className="verdict-label">
            Profit real, {period}
          </h2>
          <p className={`verdict-figure num ${loss ? 'loss' : 'gain'}`}>{rpShort(s.profit)}</p>
          <p className="verdict-line">
            {loss ? <b>Rugi.</b> : <b>Untung.</b>} Margin <b className="num">{pct(s.margin)}</b>. Shopee mencatat Total Penghasilan <b className="num">{rpShort(s.payout)}</b>, tapi setelah iklan dan HPP yang tersisa {rpShort(s.profit)}. Biaya terbesar: {biggest.label === 'HPP' ? 'HPP' : biggest.label.toLowerCase()} ({pct(biggest.value / (s.omzet || 1), 0)} dari omzet).
          </p>
          <div className="verdict-meta">
            <span className={`score ${s.health.label}`}>
              <span className="num">{`${s.health.score}/100`}</span> · {s.health.label}
            </span>
            <Plies label="Dihitung dari" sources={(['order', 'income', 'ads', 'hpp'] as Source[]).filter((x) => x !== 'ads' || s.hasAds)} />
          </div>
        </div>
        <div className="verdict-main">
          <h2 className="verdict-label">Yang paling menentukan</h2>
          {diagnoses.length ? (
            <ol className="diagnosis">
              {diagnoses.map((d) => (
                <li key={d.id}>
                  <span>
                    <b>{d.title}.</b> {d.impact > 0 ? `Potensi ${rpShort(d.impact)}.` : ''}
                    <span className="chips">
                      {d.sources.map((x) => (
                        <Ply key={x} source={x} />
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="verdict-line">Tidak ada masalah besar di periode ini.</p>
          )}
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => goTo('insight')}>
            Lihat semua saran
            <Icon name="arrow" />
          </button>
        </div>
      </section>

      <section aria-labelledby="flow" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        <div className="panel-head">
          <h2 id="flow" className="section-title">
            Dari omzet sampai profit
          </h2>
          <p className="muted">Warna kartu = file asalnya. Klik kartu untuk melihat baris yang membentuk angka itu.</p>
        </div>
        <div className="stages">
          {stages.map((st) => (
            <button key={st.id} className={`stage ${st.source}`} aria-expanded={open === st.id} aria-controls="trace" onClick={() => setOpen(open === st.id ? null : st.id)}>
              <Ply source={st.source} />
              <span className="label">{st.label}</span>
              <span className="value num">{rpShort(st.value)}</span>
              <span className="hint">{st.hint}</span>
            </button>
          ))}
          <div className={`stage result${loss ? ' loss' : ''}`} aria-live="polite">
            <span className="label">Profit real</span>
            <span className="value num">{rpShort(s.profit)}</span>
            <span className="hint">Margin {pct(s.margin)}</span>
          </div>
        </div>
        {open && <Trace stage={open} summary={s} onClose={() => setOpen(null)} />}
      </section>

      <section className="panel" aria-labelledby="leak">
        <div className="panel-head">
          <h2 id="leak">Profit kamu bocor di sini</h2>
          <p>Porsi tiap biaya terhadap omzet, sebelum HPP</p>
        </div>
        <div className="share-bar" role="img" aria-label={`Biaya terbesar ${costs[0].label} ${pct(costs[0].value / (s.omzet || 1))}; sisa sebelum HPP ${pct(beforeHpp / (s.omzet || 1))}`}>
          {costs.map((c) => (
            <span key={c.key} style={{ width: `${(c.value / (s.omzet || 1)) * 100}%`, background: c.color }} title={`${c.label}: ${rp(c.value)}`} />
          ))}
          <span style={{ width: `${Math.max(0, beforeHpp / (s.omzet || 1)) * 100}%`, background: 'transparent' }} title={`Sisa sebelum HPP: ${rp(beforeHpp)}`} />
        </div>
        <div className="legend">
          {costs
            .filter((c) => c.value > 0)
            .map((c) => (
              <span key={c.key} className="num">
                <i style={{ background: c.color }} />
                {c.label} {pct(c.value / (s.omzet || 1))} · {rpShort(c.value)}
              </span>
            ))}
          <span className="num">
            <i style={{ background: 'var(--line)' }} />
            Sisa sebelum HPP {pct(beforeHpp / (s.omzet || 1))} · {rpShort(beforeHpp)}
          </span>
        </div>
        <WaterfallList
          steps={[
            { label: 'Omzet', value: s.omzet, total: true },
            { label: 'Potongan Shopee', value: -s.marketplace },
            { label: 'Voucher', value: -s.voucher },
            { label: 'Iklan', value: -s.ads },
            { label: 'HPP', value: -s.hppKnown },
            { label: 'HPP estimasi', value: -s.hppEstimated },
            { label: 'Lainnya', value: -s.other },
            { label: 'Profit real', value: s.profit, total: true },
          ]}
        />
        <Waterfall
          steps={[
            { label: 'Omzet', value: s.omzet, total: true },
            { label: 'Potongan', value: -s.marketplace },
            { label: 'Voucher', value: -s.voucher },
            { label: 'Iklan', value: -s.ads },
            { label: 'HPP', value: -s.hppKnown },
            { label: 'HPP estimasi', value: -s.hppEstimated },
            { label: 'Lainnya', value: -s.other },
            { label: 'Profit', value: s.profit, total: true },
          ]}
        />
        <p className="muted">Merah = biaya yang mengurangi profit. Batang terakhir = profit real; di bawah garis nol berarti rugi.</p>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="p-top">
          <div className="panel-head">
            <h2 id="p-top">Produk paling menguntungkan</h2>
            <Plies sources={['order', 'hpp']} />
          </div>
          <ProfitBars products={s.products.filter((p) => p.profit > 0).slice(0, 8)} />
          {best && (
            <p className="muted">
              Terlaris: {best.product} ({num(best.qty)} pcs). {topMargin ? `Margin tertinggi: ${topMargin.product} (${pct(topMargin.margin, 0)}).` : ''}
            </p>
          )}
        </section>
        <section className="panel" aria-labelledby="p-loss">
          <div className="panel-head">
            <h2 id="p-loss">Produk yang menahan profit</h2>
            <Plies sources={['income', 'ads', 'hpp']} />
          </div>
          {s.products.some((p) => p.profit < 0) ? (
            <ProfitBars products={[...s.products].reverse().filter((p) => p.profit < 0).slice(0, 8)} />
          ) : (
            <p className="muted">Tidak ada produk yang merugi di periode ini.</p>
          )}
          {worst && worst.profit < 0 && (
            <p className="muted">
              Paling rugi: {worst.product}. Iklan {rpShort(worst.ads)}, HPP {rpShort(worst.hpp)}
              {worst.hppEstimated ? ' (estimasi)' : ''}.
            </p>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel" aria-labelledby="pay">
          <div className="panel-head">
            <h2 id="pay">Metode pembayaran</h2>
            <p className="num">{num(s.orders)} pesanan</p>
          </div>
          <div className="bars">
            {s.payment.map((p) => (
              <div key={p.method} className="bar-row">
                <span className="name">{p.method}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ display: 'block', width: `${(p.orders / (s.payment[0]?.orders || 1)) * 100}%` }} />
                </span>
                <span className="num">
                  {pct(p.orders / (s.orders || 1), 0)} · {num(p.orders)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel" aria-labelledby="days">
          <div className="panel-head">
            <h2 id="days">Hari teramai</h2>
            <p>Rata-rata sales per hari</p>
          </div>
          <WeekdayBars data={s.weekday} />
        </section>
      </div>

      <section className="panel" aria-labelledby="trend">
        <div className="panel-head">
          <h2 id="trend">Tren sales harian</h2>
          <p className="num">{num(s.daily.length)} hari berjualan</p>
        </div>
        <DailyLine data={s.daily} />
      </section>

      <ProductTable products={s.products} />
    </>
  );
}

function ProfitBars({ products }: { products: ProductStat[] }) {
  const max = Math.max(1, ...products.map((p) => Math.abs(p.profit)));
  return (
    <div className="bars">
      {products.map((p) => (
        <div key={p.product} className="bar-row">
          <span className="name" title={p.product}>
            {p.product.split(' - ')[0]}
          </span>
          <span className="bar-track">
            <span className={`bar-fill ${p.profit < 0 ? 'loss' : 'gain'}`} style={{ display: 'block', width: `${(Math.abs(p.profit) / max) * 100}%` }} />
          </span>
          <span className={`num ${p.profit < 0 ? 'neg' : 'pos'}`}>
            {rpShort(p.profit)}
            {p.hppEstimated ? '*' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

type SortKey = 'product' | 'qty' | 'sales' | 'marketplace' | 'ads' | 'hpp' | 'profit' | 'margin';

function ProductTable({ products }: { products: ProductStat[] }) {
  const [key, setKey] = useState<SortKey>('profit');
  const [asc, setAsc] = useState(false);
  const sorted = useMemo(() => {
    const val = (p: ProductStat): number | string => (key === 'product' ? p.product : key === 'qty' ? p.qty : key === 'sales' ? p.sales : key === 'marketplace' ? p.marketplace + p.voucher : key === 'ads' ? p.ads : key === 'hpp' ? p.hpp : key === 'profit' ? p.profit : p.margin);
    return [...products].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'string' ? x.localeCompare(y as string, 'id') : x - (y as number);
      return asc ? c : -c;
    });
  }, [products, key, asc]);
  const head = (k: SortKey, label: string, right = true) => (
    <th className={right ? 'r' : undefined} aria-sort={key === k ? (asc ? 'ascending' : 'descending') : 'none'}>
      <button
        className="sort-btn"
        onClick={() => {
          if (key === k) setAsc(!asc);
          else {
            setKey(k);
            setAsc(k === 'product');
          }
        }}
      >
        {label}
        <Icon name="sort" size={12} />
      </button>
    </th>
  );
  return (
    <section className="panel panel-flush" aria-labelledby="detail">
      <div className="panel-head">
        <h2 id="detail">Detail per produk</h2>
        <p>* HPP estimasi, belum diisi</p>
      </div>
      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              {head('product', 'Produk', false)}
              {head('qty', 'Terjual')}
              {head('sales', 'Sales')}
              {head('marketplace', 'Potongan Shopee')}
              {head('ads', 'Iklan')}
              {head('hpp', 'HPP')}
              {head('profit', 'Profit')}
              {head('margin', 'Margin')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.product} className={p.profit < 0 ? 'loss-row' : undefined}>
                <td className="product">
                  <span title={p.product}>{p.product}</span>
                </td>
                <td className="r" data-label="Terjual">{num(p.qty)}</td>
                <td className="r" data-label="Sales">{rp(p.sales)}</td>
                <td className="r" data-label="Potongan Shopee">{rp(-(p.marketplace + p.voucher))}</td>
                <td className="r" data-label="Iklan">{rp(-p.ads)}</td>
                <td className="r" data-label="HPP">
                  {rp(-p.hpp)}
                  {p.hppEstimated ? '*' : ''}
                </td>
                <td className={`r ${p.profit < 0 ? 'neg' : 'pos'}`} data-label="Profit">{rp(p.profit)}</td>
                <td className="r" data-label="Margin">{pct(p.margin, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TRACE_LIMIT = 200;

function Trace({ stage, summary: s, onClose }: { stage: Stage; summary: Summary; onClose: () => void }) {
  const source: Source = stage === 'other' ? 'income' : stage;
  let title = '';
  let body: ReactNode = null;
  let count = 0;

  if (stage === 'order') {
    const rows = [...s.lines].sort((a, b) => b.qty * b.unitDiscounted - a.qty * a.unitDiscounted);
    count = rows.length;
    title = `${num(rows.length)} baris order membentuk omzet ${rp(s.omzet)}`;
    body = (
      <table>
        <thead>
          <tr>
            <th>Baris</th>
            <th>No. pesanan</th>
            <th>Produk</th>
            <th className="r">Jumlah</th>
            <th className="r">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, TRACE_LIMIT).map((l) => (
            <tr key={`${l.orderNo}-${l.row}`}>
              <td className="num">{l.row}</td>
              <td>{l.orderNo}</td>
              <td className="product">
                <span title={l.product}>{l.product}</span>
              </td>
              <td className="r">{num(l.qty)}</td>
              <td className="r">{rp(l.qty * l.unitDiscounted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (stage === 'income' || stage === 'other') {
    const rows = stage === 'other' ? s.income.filter((r) => r.other > 0) : s.income;
    count = rows.length;
    title = stage === 'other' ? `${num(rows.length)} pesanan dengan biaya lain-lain` : `${num(rows.length)} baris income: potongan ${rp(s.marketplace)} + voucher ${rp(s.voucher)}`;
    body = (
      <table>
        <thead>
          <tr>
            <th>Baris</th>
            <th>No. pesanan</th>
            <th className="r">Admin</th>
            <th className="r">Layanan</th>
            <th className="r">AMS</th>
            <th className="r">Ongkir</th>
            <th className="r">Voucher</th>
            <th className="r">Lainnya</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, TRACE_LIMIT).map((r) => (
            <tr key={`${r.orderNo}-${r.row}`}>
              <td className="num">{r.row}</td>
              <td>{r.orderNo}</td>
              <td className="r">{rp(-r.admin)}</td>
              <td className="r">{rp(-r.service)}</td>
              <td className="r">{rp(-r.ams)}</td>
              <td className="r">{rp(-r.shipping)}</td>
              <td className="r">{rp(-r.voucher)}</td>
              <td className="r">{rp(-r.other)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (stage === 'ads') {
    const rows = [...s.adRows].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    count = rows.length;
    title = rows.length ? `${num(rows.length)} baris iklan, total ${rp(s.ads)}` : 'Belum ada file iklan';
    body = rows.length ? (
      <table>
        <thead>
          <tr>
            <th>Baris</th>
            <th>Tanggal</th>
            <th>Iklan</th>
            <th className="r">Biaya</th>
            <th className="r">GMV iklan</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, TRACE_LIMIT).map((a) => (
            <tr key={a.row + a.campaign + (a.date?.getTime() ?? 0)}>
              <td className="num">{a.row}</td>
              <td>{dateLabel(a.date)}</td>
              <td className="product">
                <span title={a.campaign}>{a.campaign || a.product || '–'}</span>
              </td>
              <td className="r">{rp(-a.spend)}</td>
              <td className="r">{rp(a.gmv)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="more muted">Upload file iklan supaya biaya iklan ikut terhitung. Tanpa itu, profit terlihat lebih besar dari aslinya.</p>
    );
  } else {
    const rows = [...s.products].sort((a, b) => b.hpp - a.hpp);
    count = rows.length;
    title = `HPP ${num(rows.length)} produk: ${rp(s.hppKnown)} pasti + ${rp(s.hppEstimated)} estimasi`;
    body = (
      <table>
        <thead>
          <tr>
            <th>Produk</th>
            <th className="r">Terjual</th>
            <th className="r">HPP per unit</th>
            <th className="r">Total HPP</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.product}>
              <td className="product">
                <span title={p.product}>{p.product}</span>
              </td>
              <td className="r">{num(p.qty)}</td>
              <td className="r">{p.hppUnit !== null ? rp(p.hppUnit) : '–'}</td>
              <td className="r">{rp(-p.hpp)}</td>
              <td>{p.hppEstimated ? <span className="status est">Estimasi {pct(s.hppRatio, 0)}</span> : <span className="status ok">Lengkap</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div id="trace" className={`trace ${stage === 'other' ? 'income' : stage}`} role="region" aria-label={`Asal angka dari file ${SOURCE_LABEL[source]}`}>
      <div className="trace-head">
        <h3>
          <Ply source={source} /> {title}
        </h3>
        <button className="btn btn-ghost" onClick={onClose}>
          <Icon name="close" size={16} />
          Tutup
        </button>
      </div>
      <div className="table-wrap">{body}</div>
      {count > TRACE_LIMIT && <p className="more muted">Menampilkan {num(TRACE_LIMIT)} baris terbesar dari {num(count)}. Semua baris ada di tab Order &amp; Income.</p>}
    </div>
  );
}
