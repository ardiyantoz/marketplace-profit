# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React + TypeScript, plain CSS with custom properties, SheetJS (`xlsx`) for parsing Excel/CSV in the browser. Chosen because all processing must stay client-side, React suits a multi-tab working tool, and hand-drawn SVG charts keep every chart exact without a chart library.

## Users

A solo Indonesian online seller (small to mid shop, roughly 50 to 5,000 orders a month) checking the real profit of their own Shopee store. They are not accountants. They export files from Shopee Seller Centre, usually at month end or when sales feel "busy but broke", and work on a laptop, sometimes checking results on a phone.

## Product Purpose

Turn Shopee's raw exports (order file, income file, optional ads file) plus the seller's own product cost (HPP) into the true profit per order, product and month, then tell the seller what to fix first. Success: upload to a clear verdict in under three minutes, numbers that reconcile with Shopee's own payout total, and every loss arriving with a cause and a next action.

## Positioning

Shopee shows "Total Penghasilan", which sellers mistake for profit. This tool subtracts what Shopee never subtracts (ad spend paid from the wallet, HPP) and explains the gap in rupiah, entirely in the browser so files never leave the seller's device.

## Operating Context

- Inputs: Shopee Order export (.xlsx), Income report "Laporan Penghasilan" (.xlsx, multi-sheet with summary header rows), Ads report (.csv, optional), HPP per product typed in the app or uploaded from a two-column template.
- Shopee renamed several columns from the July 2026 report onward; older and newer files mix in one upload.
- Orders join to income on No. Pesanan; an order can settle in a later month.
- Typical flow: Panduan, Upload Data, Order & Income review, Data Produk & HPP, Dashboard Profit, Insight & Rekomendasi.

## Capabilities and Constraints

- Shopee and TikTok Shop (incl. Tokopedia stores on TikTok Shop Seller Center) on one data model; one marketplace per analysis. Lazada later.
- All parsing and computation in the browser; no backend, no login, no server storage.
- Month filter and month-over-month comparison.
- Undecided: HPP varying by period, ad spend allocation rule, accrual vs settlement-date month.

## Brand Commitments

UI language is Bahasa Indonesia, Rupiah formatting (Rp22,7 jt; Rp1.725.818). No product name has been set yet.

## Evidence on Hand

No real seller data in the repo. Demonstration data must be synthetic and labelled as sample data ("Data contoh"). Do not invent customers, testimonials, pricing, or partnerships.

## Product Principles

1. Verdict first, ledger second: the seller sees whether they made money before any table.
2. Every number traces back to the rows that produced it.
3. Every negative comes with a cause and an action, priced in rupiah.
4. The seller's files stay on the seller's device.
5. Missing data degrades gracefully: estimate, label the estimate, and point to the fix.
