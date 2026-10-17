import { useMemo, useState, type ReactNode } from 'react';
import { Notice, Ply, Stat } from '../components/ui';
import type { MonthFilter, Summary } from '../lib/compute';
import { dateLabel, num, rp } from '../lib/format';
import type { Dataset } from '../lib/types';

const PAGE = 50;

export function OrderIncome({ data, summary, month, toolbar }: { data: Dataset; summary: Summary; month: MonthFilter; toolbar: ReactNode }) {
  const [q, setQ] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [orderLimit, setOrderLimit] = useState(PAGE);
  const [incomeLimit, setIncomeLimit] = useState(PAGE);

  const needle = q.trim().toLowerCase();
  const orders = useMemo(() => {
    const base = data.orders.filter((o) => (month === 'all' || o.month === month) && (showCancelled || !o.cancelled));
    if (!needle) return base;
    return base.filter((o) => o.orderNo.toLowerCase().includes(needle) || o.product.toLowerCase().includes(needle) || o.buyer.toLowerCase().includes(needle));
  }, [data.orders, month, showCancelled, needle]);

  const income = useMemo(() => (needle ? summary.income.filter((r) => r.orderNo.toLowerCase().includes(needle)) : summary.income), [summary.income, needle]);
  const cancelled = data.orders.filter((o) => o.cancelled && (month === 'all' || o.month === month)).length;
  const f = summary.fees;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Order &amp; Income</h1>
          <p>Cek data mentah sebelum dianalisis. Satu baris order = satu produk dalam pesanan.</p>
        </div>
        {toolbar}
      </header>

      <div className="toolbar">
        <label htmlFor="cari" className="visually-hidden">
          Cari
        </label>
        <input id="cari" className="input" style={{ width: 'min(100%, 340px)' }} placeholder="Cari no. pesanan, produk, atau username" value={q} onChange={(e) => setQ(e.target.value)} />
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 'var(--fs-md)', color: 'var(--ink)' }}>
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Tampilkan pesanan batal ({num(cancelled)})
        </label>
      </div>

      {summary.unsettled.length > 0 && (
        <Notice tone="info">
          {num(new Set(summary.unsettled.map((u) => u.orderNo)).size)} pesanan belum ada di file income (dana belum dilepas). Biaya Shopee untuk pesanan itu belum ikut terhitung.
        </Notice>
      )}
      {summary.orphanIncome.length > 0 && <Notice tone="warn">{num(summary.orphanIncome.length)} baris income tidak punya pesanan di file order. Mungkin file order belum mencakup bulan itu.</Notice>}

      <section className="panel panel-flush" aria-labelledby="t-order">
        <div className="panel-head">
          <h2 id="t-order">
            Pratinjau order <Ply source="order" />
          </h2>
          <p className="num">
            {num(orders.length)} baris · {num(summary.orders)} pesanan · {num(summary.qty)} pcs terjual · omzet {rp(summary.omzet)}
          </p>
        </div>
        <div className="table-wrap" style={{ maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                <th>No. pesanan</th>
                <th>Tanggal</th>
                <th>Produk</th>
                <th className="r">Harga awal</th>
                <th className="r">Harga jual</th>
                <th className="r">Jumlah</th>
                <th className="r">Subtotal</th>
                <th>Status</th>
                <th>Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, orderLimit).map((o) => (
                <tr key={`${o.orderNo}-${o.row}`}>
                  <td>{o.orderNo}</td>
                  <td>{dateLabel(o.date)}</td>
                  <td className="product">
                    <span title={o.product}>{o.product}</span>
                  </td>
                  <td className="r">{rp(o.unitOriginal)}</td>
                  <td className="r">{rp(o.unitDiscounted)}</td>
                  <td className="r">{num(o.qty)}</td>
                  <td className="r">{rp(o.qty * o.unitDiscounted)}</td>
                  <td>{o.status || '–'}</td>
                  <td>{o.payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="more muted">Tidak ada baris yang cocok dengan pencarian.</p>}
        </div>
        {orders.length > orderLimit && (
          <div className="more">
            <button className="btn btn-secondary" onClick={() => setOrderLimit((n) => n + PAGE)}>
              Tampilkan {num(Math.min(PAGE, orders.length - orderLimit))} baris lagi
            </button>
          </div>
        )}
      </section>

      <dl className="stats">
        <Stat source="income" label="Total penghasilan" value={rp(summary.payout)} href="#t-income" />
        <Stat source="income" label="Biaya administrasi" value={rp(f.admin)} href="#t-income" />
        <Stat source="income" label="Biaya layanan" value={rp(f.service)} href="#t-income" />
        <Stat source="income" label="Komisi AMS" value={rp(f.ams)} href="#t-income" />
        <Stat source="income" label="Proses pesanan" value={rp(f.processing)} href="#t-income" />
        <Stat source="income" label="Ongkir ditanggung" value={rp(f.shipping)} href="#t-income" />
      </dl>

      <section className="panel panel-flush" aria-labelledby="t-income">
        <div className="panel-head">
          <h2 id="t-income">
            Pratinjau income <Ply source="income" />
          </h2>
          <p className="num">{num(income.length)} pesanan sudah dilepas</p>
        </div>
        <div className="table-wrap" style={{ maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                <th>No. pesanan</th>
                <th>Dana dilepas</th>
                <th className="r">Administrasi</th>
                <th className="r">Layanan</th>
                <th className="r">Komisi AMS</th>
                <th className="r">Proses</th>
                <th className="r">Ongkir</th>
                <th className="r">Voucher</th>
                <th className="r">Penghasilan</th>
              </tr>
            </thead>
            <tbody>
              {income.slice(0, incomeLimit).map((r) => (
                <tr key={`${r.orderNo}-${r.row}`}>
                  <td>{r.orderNo}</td>
                  <td>{dateLabel(r.settled)}</td>
                  <td className="r">{rp(-r.admin)}</td>
                  <td className="r">{rp(-r.service)}</td>
                  <td className="r">{rp(-r.ams)}</td>
                  <td className="r">{rp(-r.processing)}</td>
                  <td className="r">{rp(-r.shipping)}</td>
                  <td className="r">{rp(-r.voucher)}</td>
                  <td className="r">
                    <b>{rp(r.payout)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {income.length === 0 && <p className="more muted">Belum ada baris income untuk filter ini.</p>}
        </div>
        {income.length > incomeLimit && (
          <div className="more">
            <button className="btn btn-secondary" onClick={() => setIncomeLimit((n) => n + PAGE)}>
              Tampilkan {num(Math.min(PAGE, income.length - incomeLimit))} baris lagi
            </button>
          </div>
        )}
      </section>

      <p className="muted">Ada sel kosong di beberapa kolom? Itu wajar: Shopee mengganti nama sejumlah kolom mulai laporan Juli 2026, jadi file lama dan baru punya kolom berbeda. Profit Toko membaca keduanya.</p>
    </>
  );
}
