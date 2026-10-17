import { useMemo, type ReactNode } from 'react';
import type { Tab } from '../App';
import { Icon, Ply } from '../components/ui';
import { summarize, type Summary } from '../lib/compute';
import { monthLabel, num, pct, prevMonth, rp, rpShort } from '../lib/format';
import { buildInsights, type Insight } from '../lib/insights';
import type { Dataset, HppMap } from '../lib/types';

interface Props {
  data: Dataset;
  hpp: HppMap;
  summary: Summary;
  previous: Summary | null;
  insights: Insight[];
  months: string[];
  toolbar: ReactNode;
  goTo: (t: Tab) => void;
}

export function Insights({ data, hpp, summary, previous, insights, months, toolbar, goTo }: Props) {
  // With "Semua bulan" selected, compare the latest month against the one before it.
  const pair = useMemo(() => {
    if (summary.month !== 'all') return previous ? { cur: summary, prev: previous } : null;
    const last = months[months.length - 1];
    if (!last || !months.includes(prevMonth(last))) return null;
    return { cur: summarize(data, hpp, last), prev: summarize(data, hpp, prevMonth(last)) };
  }, [summary, previous, months, data, hpp]);

  const list = summary.month === 'all' || !pair ? insights : buildInsights(summary, pair.prev);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Insight &amp; saran</h1>
          <p>Diurutkan dari dampak rupiah terbesar. Kerjakan dari atas.</p>
        </div>
        {toolbar}
      </header>

      {list.length ? (
        <ol className="insights">
          {list.map((i, n) => (
            <li key={i.id} className={`insight ${i.tone}`}>
              <span className="rank num">{n + 1}</span>
              <div>
                <h3>{i.title}</h3>
                <p>{i.detail}</p>
                <p className="act">{i.action}</p>
                <div className="meta">
                  <span className="chips">
                    {i.sources.map((s) => (
                      <Ply key={s} source={s} />
                    ))}
                  </span>
                  {i.link && (
                    <button className="btn btn-ghost" style={{ height: 32 }} onClick={() => goTo(i.link === 'produk' ? 'produk' : 'order')}>
                      {i.link === 'produk' ? 'Buka Produk & HPP' : 'Buka Order & Income'}
                      <Icon name="arrow" size={16} />
                    </button>
                  )}
                </div>
              </div>
              {i.impact > 0 && (
                <div className="gain-tag">
                  <b className="num">+{rpShort(i.impact)}</b>
                  <span>potensi profit</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty">
          <h2>Belum ada saran</h2>
          <p>Tidak ada omzet di periode ini. Pilih bulan lain atau upload file order.</p>
        </div>
      )}

      {pair ? <Compare cur={pair.cur} prev={pair.prev} /> : <p className="muted">Perbandingan bulan muncul kalau data mencakup dua bulan berurutan.</p>}
    </>
  );
}

function Delta({ cur, prev, unit, money = false, invert = false }: { cur: number; prev: number; unit: string; money?: boolean; invert?: boolean }) {
  const d = cur - prev;
  const ratio = prev > 0 ? d / prev : 0;
  const good = invert ? d < 0 : d > 0;
  if (!d) return <span className="muted">tetap</span>;
  const amount = money ? rpShort(Math.abs(d)) : `${num(Math.abs(d))} ${unit}`;
  return (
    <span className={`delta num ${good ? 'up' : 'down'}`}>
      <b>
        <Icon name={d > 0 ? 'up' : 'down'} size={14} /> {prev > 0 ? pct(Math.abs(ratio), 0) : d > 0 ? 'membaik' : 'memburuk'}
      </b>
      <small>
        {d > 0 ? 'naik' : 'turun'} {amount}
      </small>
    </span>
  );
}

function Compare({ cur, prev }: { cur: Summary; prev: Summary }) {
  const c = monthLabel(cur.month);
  const p = monthLabel(prev.month);
  const rows: { label: string; cur: number; prev: number; unit: string; money?: boolean; invert?: boolean }[] = [
    { label: 'Jumlah pesanan', cur: cur.orders, prev: prev.orders, unit: 'pesanan' },
    { label: 'Produk terjual', cur: cur.qty, prev: prev.qty, unit: 'pcs' },
    { label: 'Omzet', cur: cur.omzet, prev: prev.omzet, unit: '', money: true },
    { label: 'Total biaya', cur: cur.totalCost, prev: prev.totalCost, unit: '', money: true, invert: true },
    { label: 'Profit real', cur: cur.profit, prev: prev.profit, unit: '', money: true },
  ];

  const topQty = (s: Summary) => [...s.products].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const prevBy = new Map(prev.products.map((x) => [x.product, x.profit]));
  const topProfit = [...cur.products].filter((x) => !x.hppEstimated).sort((a, b) => b.profit - a.profit).slice(0, 5);
  const max = Math.max(1, ...topProfit.flatMap((x) => [Math.abs(x.profit), Math.abs(prevBy.get(x.product) ?? 0)]));

  return (
    <>
      <section className="panel panel-flush" aria-labelledby="mom">
        <div className="panel-head">
          <h2 id="mom">
            {c} dibanding {p}
          </h2>
          <p>Naik 12% artinya nilai {c} 12% lebih tinggi dari {p}</p>
        </div>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Ukuran</th>
                <th className="r">{p}</th>
                <th className="r">{c}</th>
                <th>Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="product">{r.label}</td>
                  <td className="r" data-label={p}>{r.money ? rp(r.prev) : num(r.prev)}</td>
                  <td className="r" data-label={c}>
                    <b>{r.money ? rp(r.cur) : num(r.cur)}</b>
                  </td>
                  <td data-label="Perubahan">
                    <Delta cur={r.cur} prev={r.prev} unit={r.unit} money={r.money} invert={r.invert} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="qty5">
          <div className="panel-head">
            <h2 id="qty5">Top 5 terlaris</h2>
            <Ply source="order" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--s4)' }}>
            {[prev, cur].map((s) => (
              <div key={s.month}>
                <h3 className="muted" style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>
                  {monthLabel(s.month)}
                </h3>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-md)' }}>
                  {topQty(s).map((x) => (
                    <li key={x.product}>
                      {x.product.split(' - ')[0]} <span className="muted num">({num(x.qty)} pcs)</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="profit5">
          <div className="panel-head">
            <h2 id="profit5">Top 5 profit</h2>
            <span className="chips">
              <Ply source="hpp" />
            </span>
          </div>
          <p className="muted">Hanya produk yang HPP-nya sudah diisi.</p>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--carbon-mute)' }} />
              {p}
            </span>
            <span>
              <i style={{ background: 'var(--carbon)' }} />
              {c}
            </span>
          </div>
          <div className="bars">
            {topProfit.map((x) => {
              const before = prevBy.get(x.product) ?? 0;
              return (
                <div key={x.product} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{x.product.split(' - ')[0]}</span>
                  {[
                    { v: before, cls: 'prev' },
                    { v: x.profit, cls: x.profit < 0 ? 'loss' : '' },
                  ].map((b) => (
                    <div key={b.cls || 'cur'} className="bar-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) 92px' }}>
                      <span className="bar-track">
                        <span className={`bar-fill ${b.cls}`} style={{ display: 'block', width: `${(Math.abs(b.v) / max) * 100}%` }} />
                      </span>
                      <span className="num r">{rp(b.v)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
