import './landing.css';

type Stub = 'order' | 'income' | 'ads' | 'hpp' | 'manual' | 'result';

interface Ledger {
  title: string;
  note: string;
  head: string[];
  rows: string[][];
  more: string;
  right: number[]; // columns aligned right
}

// Synthetic rows from the same fictional herbal stores as the app's "Data contoh".
const LEDGERS: Record<Stub, Ledger> = {
  order: {
    title: 'File pesanan',
    note: 'Omzet = harga setelah diskon × jumlah, pesanan batal tidak dihitung.',
    head: ['No. pesanan', 'Toko', 'Produk', 'Jml', 'Harga setelah diskon'],
    rows: [
      ['2610045XKQ8M2A', 'HU', 'Wedang Rempah 700 Gram', '2', 'Rp460.000'],
      ['2610047R3TBN6C', 'HH', 'Matcha Powder 100 Gram', '1', 'Rp75.000'],
      ['579412345678901236', 'HL', 'Kunyit Asam Herbal 250 Gram', '3', 'Rp147.000'],
    ],
    more: '… 277 baris lainnya dari 3 toko',
    right: [3, 4],
  },
  income: {
    title: 'File penghasilan',
    note: 'Potongan yang sudah diambil marketplace sebelum dana cair.',
    head: ['No. pesanan', 'Komisi / admin', 'Layanan', 'Ongkir', 'Dana cair'],
    rows: [
      ['2610045XKQ8M2A', '−Rp36.800', '−Rp18.400', '−Rp10.000', 'Rp384.000'],
      ['2610047R3TBN6C', '−Rp6.000', '−Rp3.375', 'Rp0', 'Rp64.500'],
      ['579412345678901236', '−Rp11.760', '−Rp5.880', '−Rp1.920', 'Rp127.440'],
    ],
    more: '… potongan semua pesanan: −Rp8.357.785',
    right: [1, 2, 3, 4],
  },
  ads: {
    title: 'File iklan',
    note: 'Dibayar dari saldo iklan, jadi tidak ada di laporan penghasilan.',
    head: ['Tanggal', 'Toko', 'Kampanye', 'Biaya'],
    rows: [
      ['4 Jun 2026', 'HU', 'Iklan Wedang Rempah', '−Rp125.000'],
      ['4 Jun 2026', 'HL', 'GMV Max Kunyit Asam', '−Rp48.000'],
      ['5 Jun 2026', 'HH', 'Iklan Matcha', '−Rp32.500'],
    ],
    more: '… total biaya iklan: −Rp7.438.800',
    right: [3],
  },
  hpp: {
    title: 'Modal per produk',
    note: 'Satu-satunya angka yang tidak ada di laporan marketplace mana pun. Diisi sekali.',
    head: ['Produk', 'Modal per unit', 'Terjual', 'Total modal'],
    rows: [
      ['Wedang Rempah 700 Gram', 'Rp180.000', '83', '−Rp14.940.000'],
      ['Matcha Powder 100 Gram', 'Rp41.000', '64', '−Rp2.624.000'],
      ['Kunyit Asam Herbal 250 Gram', 'Rp38.000', '57', '−Rp2.166.000'],
    ],
    more: '… 16 produk, 3 masih estimasi sampai modalnya diisi',
    right: [1, 2, 3],
  },
  manual: {
    title: 'Catatan pengeluaranmu',
    note: 'Pengeluaran untuk semua toko dibagi ke tiap toko menurut omzetnya.',
    head: ['Tanggal', 'Kategori', 'Untuk toko', 'Nominal'],
    rows: [
      ['1 Jun 2026', 'Gaji', 'Semua toko', '−Rp1.500.000'],
      ['3 Jun 2026', 'Packaging', 'Semua toko', '−Rp450.000'],
      ['1 Jul 2026', 'Gaji', 'Semua toko', '−Rp1.500.000'],
    ],
    more: '… belanja stok hanya masuk cashflow, tidak mengurangi profit',
    right: [3],
  },
  result: {
    title: 'Hitungan profit real',
    note: 'Setiap baris berasal dari satu file. Klik bagian lain untuk melihat barisnya.',
    head: ['Dari', 'Bagian', 'Jumlah'],
    rows: [
      ['Order', 'Omzet', 'Rp45.987.000'],
      ['Income', 'Potongan marketplace dan voucher', '−Rp8.357.785'],
      ['Iklan', 'Biaya iklan', '−Rp7.438.800'],
      ['HPP', 'Modal barang (termasuk estimasi)', '−Rp32.145.199'],
      ['Income · Catatan', 'Biaya lainnya dan operasional', '−Rp6.000.000'],
    ],
    more: 'Profit real: −Rp7.954.784 · margin −17,3%',
    right: [2],
  },
};

const ledger = document.getElementById('ledger') as HTMLElement;
const stubs = [...document.querySelectorAll<HTMLButtonElement>('.stub')];
let openStub: Stub | null = null;

function cell(tag: 'th' | 'td', text: string, right: boolean) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (tag === 'th') el.scope = 'col';
  if (right) el.className = 'r';
  return el;
}

function render(id: Stub) {
  const L = LEDGERS[id];
  ledger.className = `ledger ${id}`;
  ledger.replaceChildren();

  const head = document.createElement('div');
  head.className = 'ledger-head';
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${L.title} · data contoh. `;
  p.append(strong, L.note);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ledger-close';
  close.textContent = 'Tutup';
  close.addEventListener('click', () => toggle(id));
  head.append(p, close);

  const table = document.createElement('table');
  const thead = table.createTHead().insertRow();
  L.head.forEach((h, i) => thead.append(cell('th', h, L.right.includes(i))));
  const body = table.createTBody();
  for (const row of L.rows) {
    const tr = body.insertRow();
    row.forEach((v, i) => {
      const td = cell('td', v, L.right.includes(i));
      if (i === row.length - 1) td.classList.add('strong');
      tr.append(td);
    });
  }
  const more = body.insertRow();
  more.className = 'more';
  const td = more.insertCell();
  td.colSpan = L.head.length;
  td.textContent = L.more;

  const scroll = document.createElement('div');
  scroll.className = 'ledger-scroll';
  scroll.append(table);
  ledger.append(head, scroll);
}

function toggle(id: Stub) {
  openStub = openStub === id ? null : id;
  for (const s of stubs) s.setAttribute('aria-expanded', String(s.dataset.stub === openStub));
  if (!openStub) {
    ledger.hidden = true;
    stubs.find((s) => s.dataset.stub === id)?.focus();
    return;
  }
  render(openStub);
  ledger.hidden = false;
  // Replay the open motion on every switch.
  ledger.style.animation = 'none';
  void ledger.offsetHeight;
  ledger.style.animation = '';
  if (ledger.getBoundingClientRect().bottom > window.innerHeight) ledger.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

for (const s of stubs) s.addEventListener('click', () => toggle(s.dataset.stub as Stub));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openStub) toggle(openStub);
});

// Shopee / TikTok Shop menu paths
const segButtons = [...document.querySelectorAll<HTMLButtonElement>('.seg button')];
for (const b of segButtons) {
  b.addEventListener('click', () => {
    const mp = b.dataset.mp as 'shopee' | 'tiktok';
    for (const x of segButtons) x.setAttribute('aria-pressed', String(x === b));
    for (const p of document.querySelectorAll<HTMLElement>('.path')) p.textContent = p.dataset[mp] ?? p.textContent;
  });
}

// Returning seller: the app keeps its data in this browser (IndexedDB "profit-toko").
// Opening the database here must create the same store, or the app would find it missing.
function hasSavedData(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('profit-toko', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('state');
      req.onerror = () => resolve(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const get = db.transaction('state', 'readonly').objectStore('state').get('v2');
          get.onsuccess = () => {
            try {
              const v = get.result ? JSON.parse(get.result as string) : null;
              resolve(!!v && !v.data?.sample && (v.data?.stores?.length ?? 0) > 0);
            } catch {
              resolve(false);
            }
            db.close();
          };
          get.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      };
    } catch {
      resolve(false);
    }
  });
}

hasSavedData().then((saved) => {
  if (!saved) return;
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-cta-primary]')) {
    a.href = './app/';
    a.textContent = 'Lanjutkan ke dashboard';
  }
});
