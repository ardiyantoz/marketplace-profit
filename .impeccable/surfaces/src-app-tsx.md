---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Profit Toko app (six tabs, multi-store, profit + cashflow)

Mode: Operate. Audience: Indonesian online seller running one main store plus several smaller stores (Shopee and TikTok Shop mixed) that often sell the same products; checks real profit and cash after month end, laptop first, phone second. Task: add one card per store and upload its order, income and ads files; merge the same product across stores and fill HPP once; read the combined verdict, compare stores, follow cash by week; record expenses; act on ranked fixes. Constraints: Bahasa Indonesia, Rupiah, all processing and storage in the browser (IndexedDB), sample data labelled "Data contoh". Build path: code-led. Original roll ran degraded; user chose Nota Rangkap. Multi-store and cashflow are an extension inside the same world.

## Direction contract

THESIS: Every rupiah shows the paper it came from, across every store. Refuses the category default of anonymous KPI tiles and colour-coded store dashboards.

OWN-WORLD: The three-ply carbon receipt book. Carbon-ink blue (#1E2A78) rail and primary ink; ply colours as source codes: Order white, Income pink (#F6D3DD), Iklan yellow (#F6E59A), HPP pale blue (#DCE3F7), Catatan lavender (#E4DAF5) for the seller's own expense notes. Stores are told apart by outlined carbon monograms and names, never by colour. Cool blue-tinted ground. Public Sans, tabular numerals. Loss red #B3123A, gain green #15703F only where they carry meaning; derived results sit on solid carbon.

STORY: The seller sees whether all stores together made money, which store pulls it down and why, which file each number came from, and when the cash actually arrives; then opens the rows behind any figure and goes to the ranked fixes.

FIRST VIEWPORT: Left carbon rail with six numbered steps and the store list (Semua toko plus one row per store: monogram, name, marketplace, three ply ticks for its files; clicking filters). Main: title + store and month selects; Profit / Cashflow view tabs; on Profit the verdict card (Profit real, margin, cause sentence, source chips) beside the three diagnoses, then the "Dari omzet sampai profit" row of ply-coloured stage cards ending in the carbon result card, then the per-store comparison.

FORM: Standard web app shell (side rail, tabs, tables, selects, segmented control). Signature move: ply provenance, a stage card or figure opens the rows that produced it, tinted in its ply colour. Position 4 of the grounded list; seed: seed:65fa43c149537a4a

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
