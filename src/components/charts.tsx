import { WEEKDAYS, rpShort } from '../lib/format';

export interface Step {
  label: string;
  value: number; // signed: positive adds, negative takes away
  total?: boolean;
}

/** Omzet-to-profit bridge. Decreases red, totals carbon, every step labelled. */
export function Waterfall({ steps }: { steps: Step[] }) {
  const W = 760;
  const H = 300;
  const left = 56;
  const right = 12;
  const top = 28;
  const bottom = 64;
  let run = 0;
  const bars = steps.map((s) => {
    const a = s.total ? 0 : run;
    run = s.total ? s.value : run + s.value;
    return { ...s, a, b: run };
  });
  const rawLo = Math.min(0, ...bars.map((b) => Math.min(b.a, b.b)));
  const hi = Math.max(0, ...bars.map((b) => Math.max(b.a, b.b)));
  // Headroom below the lowest bar so its value label never meets the category labels.
  const lo = rawLo - (hi - rawLo) * 0.08;
  const span = hi - lo || 1;
  const Y = (v: number) => top + (hi - v) / span * (H - top - bottom);
  const band = (W - left - right) / bars.length;
  const bw = Math.min(64, band * 0.62);
  const X = (i: number) => left + i * band + (band - bw) / 2;
  const tickStep = niceStep(span / 4);
  const ticks: number[] = [];
  for (let t = Math.ceil(rawLo / tickStep) * tickStep; t <= hi + 1; t += tickStep) ticks.push(t);

  return (
    <div className="chart wide waterfall-columns">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dari omzet ${rpShort(steps[0]?.value ?? 0)} sampai profit ${rpShort(run)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? 'var(--ink-3)' : 'var(--line)'} strokeWidth={t === 0 ? 1.25 : 1} />
            <text x={left - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {rpShort(t).replace('Rp', '')}
            </text>
          </g>
        ))}
        {bars.map((b, i) =>
          i < bars.length - 1 ? <line key={`c${i}`} x1={X(i) + bw} x2={X(i + 1)} y1={Y(b.b)} y2={Y(b.b)} stroke="var(--line-strong)" strokeDasharray="3 3" /> : null,
        )}
        {bars.map((b, i) => {
          const y0 = Y(Math.max(b.a, b.b));
          const h = Math.max(2, Math.abs(Y(b.a) - Y(b.b)));
          const fill = b.total ? (b.b < 0 ? 'var(--loss)' : 'var(--carbon)') : b.value < 0 ? 'var(--loss)' : 'var(--gain)';
          const labelY = b.total ? (b.b < 0 ? y0 + h + 14 : y0 - 6) : y0 + h + 14;
          return (
            <g key={b.label}>
              <rect x={X(i)} y={y0} width={bw} height={h} rx="3" fill={fill} fillOpacity={b.total ? 1 : 0.55}>
                <title>{`${b.label}: ${rpShort(b.value)}`}</title>
              </rect>
              <text x={X(i) + bw / 2} y={labelY} textAnchor="middle" fontSize="12" fontWeight={b.total ? 700 : 500} fill="var(--ink)">
                {rpShort(b.value).replace('Rp', '')}
              </text>
              <text x={X(i) + bw / 2} y={H - 10} textAnchor="middle" fontSize="11.5" fontWeight={b.total ? 700 : 400} fill="var(--ink-2)">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function WeekdayBars({ data }: { data: { day: number; avg: number }[] }) {
  const W = 360;
  const H = 180;
  const max = Math.max(1, ...data.map((d) => d.avg));
  const best = data.reduce((a, b) => (b.avg > a.avg ? b : a), data[0]);
  const bw = 30;
  const gap = (W - data.length * bw) / (data.length + 1);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hari teramai ${WEEKDAYS[best?.day ?? 0]}`}>
        {data.map((d, i) => {
          const h = (d.avg / max) * (H - 56);
          const x = gap + i * (bw + gap);
          const isBest = d === best;
          return (
            <g key={d.day}>
              <rect x={x} y={H - 28 - h} width={bw} height={Math.max(1, h)} rx="3" fill={isBest ? 'var(--carbon)' : 'var(--carbon-mute)'} fillOpacity={isBest ? 1 : 0.55}>
                <title>{`${WEEKDAYS[d.day]}: rata-rata ${rpShort(d.avg)}`}</title>
              </rect>
              {isBest && (
                <text x={x + bw / 2} y={H - 34 - h} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">
                  {rpShort(d.avg).replace('Rp', '')}
                </text>
              )}
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="11.5" fontWeight={isBest ? 700 : 400} fill="var(--ink-2)">
                {WEEKDAYS[d.day]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DailyLine({ data }: { data: { date: string; sales: number }[] }) {
  const W = 760;
  const H = 180;
  const left = 8;
  const pad = 20;
  if (data.length < 2) return <p className="muted">Belum cukup hari untuk tren.</p>;
  const max = Math.max(...data.map((d) => d.sales));
  const peak = data.find((d) => d.sales === max)!;
  const t0 = Date.parse(data[0].date);
  const t1 = Date.parse(data[data.length - 1].date);
  const X = (d: string) => left + ((Date.parse(d) - t0) / (t1 - t0 || 1)) * (W - left * 2);
  const Y = (v: number) => pad + (1 - v / max) * (H - pad * 2);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${X(d.date).toFixed(1)} ${Y(d.sales).toFixed(1)}`).join(' ');
  const area = `${path} L${X(data[data.length - 1].date)} ${H - pad} L${X(data[0].date)} ${H - pad} Z`;
  const fmt = (s: string) => {
    const [, m, d] = s.split('-');
    return `${Number(d)}/${Number(m)}`;
  };
  return (
    <div className="chart wide">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Penjualan harian, puncak ${rpShort(max)} pada ${fmt(peak.date)}`}>
        <line x1={left} x2={W - left} y1={H - pad} y2={H - pad} stroke="var(--line)" />
        <path d={area} fill="var(--carbon)" fillOpacity="0.07" />
        <path d={path} fill="none" stroke="var(--carbon)" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={X(peak.date)} cy={Y(peak.sales)} r="4" fill="var(--carbon)" />
        <text x={X(peak.date)} y={Y(peak.sales) - 9} textAnchor={X(peak.date) > W - 80 ? 'end' : 'middle'} fontSize="11" fontWeight="700" fill="var(--ink)">
          {`${rpShort(max)} · ${fmt(peak.date)}`}
        </text>
        <text x={left} y={H - 4} fontSize="11" fill="var(--ink-3)">{fmt(data[0].date)}</text>
        <text x={W - left} y={H - 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmt(data[data.length - 1].date)}</text>
      </svg>
    </div>
  );
}

/** The same bridge as horizontal bars, for narrow screens: ends on profit without scrolling. */
export function WaterfallList({ steps }: { steps: Step[] }) {
  let run = 0;
  const bars = steps.map((s) => {
    const a = s.total ? 0 : run;
    run = s.total ? s.value : run + s.value;
    return { ...s, a, b: run };
  });
  const lo = Math.min(0, ...bars.map((b) => Math.min(b.a, b.b)));
  const hi = Math.max(0, ...bars.map((b) => Math.max(b.a, b.b)));
  const span = hi - lo || 1;
  const X = (v: number) => ((v - lo) / span) * 100;
  return (
    <ol className="waterfall-list" aria-label={`Dari omzet ${rpShort(steps[0]?.value ?? 0)} sampai profit ${rpShort(run)}`}>
      {bars.map((b) => {
        const from = X(Math.min(b.a, b.b));
        const width = Math.max(0.8, X(Math.max(b.a, b.b)) - from);
        const tone = b.total ? (b.b < 0 ? 'loss' : 'total') : b.value < 0 ? 'cost' : 'gain';
        return (
          <li key={b.label} className={b.total ? 'is-total' : undefined}>
            <span className="wl-label">{b.label}</span>
            <span className="wl-value num">{rpShort(b.value)}</span>
            <span className="wl-track">
              {lo < 0 && <span className="wl-zero" style={{ left: `${X(0)}%` }} />}
              <span className={`wl-bar ${tone}`} style={{ left: `${from}%`, width: `${width}%` }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export interface CashBar {
  key: string;
  label: string;
  inflow: number;
  ads: number;
  expense: number;
  balance: number | null;
}

/** Money in above the zero line, money out below it (ads and the seller's own expenses), balance as a line. */
export function CashChart({ periods }: { periods: CashBar[] }) {
  const W = Math.max(760, periods.length * 34 + 80);
  const H = 300;
  const left = 64;
  const right = 16;
  const top = 20;
  const bottom = 44;
  const balances = periods.map((p) => p.balance).filter((b): b is number => b !== null);
  const hi = Math.max(0, ...periods.map((p) => p.inflow), ...balances);
  const lo = Math.min(0, ...periods.map((p) => -(p.ads + p.expense)), ...balances);
  const span = hi - lo || 1;
  const Y = (v: number) => top + ((hi - v) / span) * (H - top - bottom);
  const band = (W - left - right) / Math.max(1, periods.length);
  const bw = Math.min(22, band * 0.6);
  const X = (i: number) => left + i * band + (band - bw) / 2;
  const tickStep = niceStep(span / 4);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / tickStep) * tickStep; t <= hi + 1; t += tickStep) ticks.push(t);
  const every = Math.ceil(periods.length / 12);
  const line = periods
    .map((p, i) => (p.balance === null ? null : `${X(i) + bw / 2},${Y(p.balance)}`))
    .filter(Boolean)
    .join(' ');
  const last = [...periods].reverse().find((p) => p.balance !== null);
  const lastIdx = last ? periods.indexOf(last) : -1;
  return (
    <div className="chart wide">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Arus kas ${periods.length} periode${last ? `, saldo akhir ${rpShort(last.balance ?? 0)}` : ''}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? 'var(--ink-3)' : 'var(--line)'} strokeWidth={t === 0 ? 1.25 : 1} />
            <text x={left - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {rpShort(t).replace('Rp', '')}
            </text>
          </g>
        ))}
        {periods.map((p, i) => (
          <g key={p.key}>
            {p.inflow > 0 && (
              <rect x={X(i)} y={Y(p.inflow)} width={bw} height={Math.max(1, Y(0) - Y(p.inflow))} rx="2" fill="var(--carbon)">
                <title>{`${p.label}: masuk ${rpShort(p.inflow)}`}</title>
              </rect>
            )}
            {p.ads > 0 && (
              <rect x={X(i)} y={Y(0)} width={bw} height={Math.max(1, Y(-p.ads) - Y(0))} fill="var(--ads-ink)">
                <title>{`${p.label}: iklan ${rpShort(-p.ads)}`}</title>
              </rect>
            )}
            {p.expense > 0 && (
              <rect x={X(i)} y={Y(-p.ads)} width={bw} height={Math.max(1, Y(-p.ads - p.expense) - Y(-p.ads))} fill="var(--manual-ink)">
                <title>{`${p.label}: pengeluaran ${rpShort(-p.expense)}`}</title>
              </rect>
            )}
            {i % every === 0 && (
              <text x={X(i) + bw / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
                {p.label}
              </text>
            )}
          </g>
        ))}
        {line && <polyline points={line} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />}
        {last && last.balance !== null && (
          <g>
            <circle cx={X(lastIdx) + bw / 2} cy={Y(last.balance)} r="4" fill="var(--ink)" />
            <text x={X(lastIdx) + bw / 2 - 8} y={Y(last.balance) - 10} textAnchor="end" fontSize="12" fontWeight="700" fill={last.balance < 0 ? 'var(--loss)' : 'var(--ink)'}>
              {`Saldo ${rpShort(last.balance)}`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
