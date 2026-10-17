---
name: Profit Toko
description: Real Shopee shop profit, every rupiah tinted with the file it came from.
colors:
  carbon: "#1e2a78"
  carbon-deep: "#121a55"
  carbon-soft: "#c9cfee"
  carbon-mute: "#8f98d0"
  ink: "#141b4d"
  ink-2: "#3f4884"
  ink-3: "#5a628f"
  ground: "#e9ebf4"
  surface: "#ffffff"
  line: "#dde1f0"
  line-strong: "#b6bcdd"
  ply-order: "#ffffff"
  ply-order-edge: "#c3c8e2"
  ply-income: "#f6d3dd"
  ply-income-wash: "#fbeaf0"
  ply-income-edge: "#e2aebd"
  ply-ads: "#f6e59a"
  ply-ads-wash: "#fbf3cc"
  ply-ads-edge: "#dcc562"
  ply-hpp: "#dce3f7"
  ply-hpp-wash: "#eef1fb"
  ply-hpp-edge: "#b3bfe6"
  loss: "#b3123a"
  loss-wash: "#fbe7ec"
  gain: "#15703f"
  gain-wash: "#e3f3ea"
  warn: "#8a5a00"
  warn-wash: "#fff3d6"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
  ply-chip:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  chip: "4px"
  control: "6px"
  card: "8px"
  panel: "12px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.carbon-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.carbon}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  input-hpp-empty:
    backgroundColor: "{colors.ply-ads-wash}"
    width: "128px"
  rail:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.carbon-soft}"
    width: "248px"
    padding: "24px 16px"
  rail-step-active:
    backgroundColor: "{colors.ply-ads}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 8px"
  ply-chip-order:
    backgroundColor: "{colors.ply-order}"
    textColor: "{colors.ink}"
    typography: "{typography.ply-chip}"
    rounded: "{rounded.chip}"
    height: "20px"
    padding: "0 7px"
  ply-chip-income:
    backgroundColor: "{colors.ply-income}"
    textColor: "{colors.ink}"
    typography: "{typography.ply-chip}"
    rounded: "{rounded.chip}"
    height: "20px"
    padding: "0 7px"
  ply-chip-ads:
    backgroundColor: "{colors.ply-ads}"
    textColor: "{colors.ink}"
    typography: "{typography.ply-chip}"
    rounded: "{rounded.chip}"
    height: "20px"
    padding: "0 7px"
  ply-chip-hpp:
    backgroundColor: "{colors.ply-hpp}"
    textColor: "{colors.ink}"
    typography: "{typography.ply-chip}"
    rounded: "{rounded.chip}"
    height: "20px"
    padding: "0 7px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  stage-card-income:
    backgroundColor: "{colors.ply-income-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  stage-card-result:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  stat-tile-income:
    backgroundColor: "{colors.ply-income-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
  trace-panel-ads:
    backgroundColor: "{colors.ply-ads-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  status-ok:
    backgroundColor: "{colors.gain-wash}"
    textColor: "{colors.gain}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-todo:
    backgroundColor: "{colors.ply-ads-wash}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: Profit Toko

## Overview

**Creative North Star: "Nota Rangkap" (the three-ply carbon receipt book)**

The world is the Indonesian carbon-copy receipt book: carbon-ink blue for the binding and the writing, and a coloured ply for each copy. Here every source file is a ply. Order is the white top sheet, Income the pink copy, Iklan (ads) the yellow copy, HPP (the seller's own cost) the pale blue copy. Any figure, card, tile, file card, guide card or trace that comes from one file is tinted in that file's ply colour and carries a small ply chip naming it. Provenance is the decoration; there is no other ornament.

Density is that of a working tool, not a landing page: a fixed carbon rail on the left with six numbered steps and the stacked file plies, a cool blue-grey ground, white panels with a soft ambient shadow, and tabular numerals everywhere money appears. The one oversized element is the verdict figure. Loss red and gain green appear only where a sign carries meaning.

**Key Characteristics:**
- Carbon-blue rail and ink; cool blue-tinted ground (never warm paper).
- Four ply colours used strictly as source codes, as a full fill (chips, rail plies) or a wash (cards, tiles, traces).
- Public Sans throughout, weights 400 to 800, tabular numerals on every figure and table.
- Stage card opens a trace panel of the rows that produced it, in the same ply wash.
- Loss/gain colour is semantic only; the result card is solid carbon.

## Colors

A carbon-ink blue system with four pastel source plies and a strictly semantic loss/gain pair.

### Primary
- **Carbon Ink** (carbon): the rail background, primary buttons, active stage outline, diagnosis numerals, bar fills, chart totals and the solid result card. Hover deepens to **Carbon Deep** (carbon-deep).
- **Carbon Soft / Carbon Mute** (carbon-soft, carbon-mute): text and step numbers on the rail; carbon-mute also fills "previous period" bars.

### Secondary: the plies (source codes)
- **Order White** (ply-order, edge ply-order-edge): Order file. Its cards stay white with a blue-grey edge.
- **Income Pink** (ply-income, wash ply-income-wash, edge ply-income-edge): Income / Laporan Penghasilan file. The fee share bar extends this ply into a pink ramp (deep #a8324f to pale #f7dfe6), one step per fee line.
- **Iklan Yellow** (ply-ads, wash ply-ads-wash, edge ply-ads-edge): Ads file. Also the system highlight: active rail step, text selection, "Data contoh" tag, empty-HPP input and warning-rank badges.
- **HPP Pale Blue** (ply-hpp, wash ply-hpp-wash, edge ply-hpp-edge): seller-entered cost. Also the info notice and drop-zone hover ground.

Full ply colour is for small marks (chips, rail ply sheets). Larger surfaces take the wash plus the edge as a 1px border.

### Tertiary: state
- **Loss Red** (loss, loss-wash): negative profit figures, loss rows, critical insight rank, Buruk score.
- **Gain Green** (gain, gain-wash): positive profit, "potensi" gains, Sehat score, OK status.
- **Warn Amber** (warn, warn-wash): Cukup score, warning notices, "belum" status text.

### Neutral
- **Ink / Ink 2 / Ink 3** (ink, ink-2, ink-3): primary text, secondary labels, muted meta and table headers.
- **Cool Ground** (ground): app background, bar tracks, neutral score pill.
- **Surface** (surface): panels, inputs, sticky table headers.
- **Line / Line Strong** (line, line-strong): table rules and card edges; control borders and dashed drop zone.

### Named Rules
**The Ply Provenance Rule.** A ply colour means "this came from that file". Any figure derived from one source sits on that ply's wash and carries its chip; never use Income pink, Iklan yellow or HPP blue as decoration on unrelated content.

**The Carbon Result Rule.** The computed bottom line (Profit real) is never a ply: it sits on solid carbon, because it is the sum of all copies, not one of them.

**The Earned Red Rule.** Loss red and gain green appear only on signed figures, loss rows and state badges. A neutral total is ink or carbon.

## Typography

**Display Font:** Public Sans (with system-ui, sans-serif)
**Body Font:** Public Sans
**Label Font:** Public Sans

**Character:** One sturdy public-sector grotesque across the whole tool, so hierarchy comes from weight (400 to 800) and size alone. Numbers are tabular so rupiah columns align like a ledger.

### Hierarchy
- **Display** (800, 3.25rem, 1; 2.5rem at ≤560px): the verdict figure only, coloured loss or gain.
- **Headline** (800, 1.625rem, 1.2): page title, one per tab.
- **Figure** (800, 1.375rem): stage card values. Stat tiles use 700 at 1.125rem.
- **Title** (700, 1.125rem, 1.3): panel and section headings; insight titles at 1rem.
- **Body** (400, 0.875rem, 1.5): the working size for tables, verdict sentence (max 52ch), diagnoses, notices. 0.8125rem for meta and sub-lines.
- **Label** (600, 0.75rem): table headers, stat labels, rail notes; sentence case, never uppercase.
- **Ply chip** (700, 0.6875rem, +0.02em): the source chip text only.

### Named Rules
**The Tabular Rule.** Every number that can sit above another number uses tabular numerals (`font-variant-numeric: tabular-nums`); tables get it by default.

**The Sentence Case Rule.** Labels and headers stay in sentence case at 600 weight; the system has no uppercase tracked labels.

## Layout

App shell: a 248px sticky carbon rail plus a fluid main column (max 1320px, padding 32px top and clamp(16px, 3vw, 40px) sides, 24px gap between blocks). Spacing follows a 4px base scale (s1 to s7). Grids are intrinsic `auto-fit` with minimums: stage cards 168px, stat tiles 160px, file cards 240px, guide cards 280px, two-up panels 380px. The verdict panel splits 1.1fr / 1fr between figure and diagnoses.

At ≤900px the rail becomes a top band: steps scroll horizontally, the ply stack lies flat as one segmented bar, rail notes and footer hide, the verdict stacks. At ≤560px panels tighten to 16px padding, the waterfall chart swaps to a list of horizontal tracks, insight cards drop to two columns, and product-level ledger tables stack: header hidden, each row becomes a two-column grid with the product name as a bold first line and each figure prefixed by its column label.

### Named Rules
**The Stacked Ledger Rule.** Any table a seller must read per row on a phone stacks into labelled ledger lines at ≤560px; it does not scroll sideways.

## Elevation & Depth

Hybrid and quiet. Panels, insights and the empty state lift off the cool ground with one soft, carbon-tinted ambient shadow. Ply cards, tiles and traces are flat with a 1px edge in their ply colour, reading as sheets laid on the panel. Lift is a response to interaction: clickable stage cards and linked stat tiles rise 2px with a hover shadow. Focus is a 3px carbon ring (yellow on the rail).

### Shadow Vocabulary
- **Panel ambient** (`0 1px 2px rgba(20,27,77,0.08), 0 8px 24px rgba(20,27,77,0.06)`): panels, insight cards, empty state.
- **Hover lift** (`0 6px 16px rgba(20,27,77,0.1)` with translateY(-2px)): clickable stage cards and linked stat tiles.
- **Selected outline** (`0 0 0 2px #1e2a78`): the open stage card.
- **Focus ring** (`0 0 0 3px rgba(30,42,120,0.35)`): all focusable elements.

### Named Rules
**The Flat Ply Rule.** Ply-tinted sheets never carry the ambient shadow; their edge colour is their depth.

## Shapes

Small, even corners: 4px ply chips, 6px controls and rail steps, 8px cards, tiles, traces and notices, 12px panels and drop zone, full pills for score, status and sample tags. The rail ply stack offsets each sheet 4px further right and rounds only the outer corners, so the three copies read as a fanned receipt pad. Borders are 1px solid; dashed only for the empty drop zone and missing file cards. Icons are 1.75-stroke inline SVG line icons at 18px.

## Components

### Buttons
- **Shape:** 6px corners, 40px tall, 600 weight at 0.875rem.
- **Primary:** carbon fill, white text; hover carbon-deep.
- **Secondary:** white with line-strong border and carbon text; hover border turns carbon.
- **Ghost:** transparent carbon text; hover a 6% carbon tint. A 28px compact size appears in the sample bar.

### Chips
- **Ply chip:** 20px tall, 4px corners, full ply fill with 1px ply edge, ink text, names its file (Order, Income, Iklan, HPP) with a "Dari file ..." title. Grouped in rows of 6px gaps after a muted "Dihitung dari" label.
- **Status / score pills:** wash ground with the state colour as text (gain, warn, loss; HPP-wash for estimates).

### Cards / Containers
- **Panel:** white, 12px corners, ambient shadow, 24px padding, 16px internal gap; flush variant lets tables run edge to edge.
- **Stat tile:** ply wash and edge, 8px corners, label plus ply chip on top, 700 figure below; when linked, a whole-card link with a "Lihat baris" arrow cue and hover lift.
- **Notice:** 8px, wash ground (warn, info on HPP wash, loss), leading line icon.

### Inputs / Fields
- **Style:** 40px, white, 1px line-strong border, 6px corners; hover border carbon; focus carbon ring.
- **HPP input:** 128px, right-aligned tabular; when empty it takes the Iklan yellow wash and edge to ask for a value.

### Navigation
- **Rail:** carbon ground, brand in white 800, six numbered steps (tabular number, 0.875rem). Hover 8% white; active step is the yellow ply with ink 700 text. Below, the "File sumber" ply stack shows rows per file, dimmed to 45% when missing.
- **Mobile:** the rail collapses to a top band with a horizontally scrolling step row and a flat segmented ply bar.

### Stage card and trace (signature)
A row of "Dari omzet sampai profit" buttons, one per stage, each on its ply wash with its chip, a label, an 800 figure and a hint. The last card is the solid carbon result. Clicking a stage outlines it in carbon and slides a trace panel out from under the row (clip-path reveal, 260ms) in the same ply wash, listing the rows that produced the figure with a sticky header and a Tutup control. Reduced motion collapses the reveal.

### Ledger table
0.875rem tabular rows, 11px vertical padding, line rules, sticky label header, 24px outer padding; right-aligned money; loss rows on loss wash; profit cells bold red or green. Stacks per the Stacked Ledger Rule.

## Do's and Don'ts

### Do:
- **Do** tint any single-source figure, card or trace with its ply wash and edge, and add its ply chip.
- **Do** keep the computed bottom line on solid carbon.
- **Do** use tabular numerals for every rupiah and count.
- **Do** stack per-row tables into labelled ledger lines at ≤560px (`table.ledger` with `data-label` cells).
- **Do** express lift only on interaction: 2px rise plus hover shadow on clickable cards.

### Don't:
- **Don't** use ply colours as decoration on content that has no source file.
- **Don't** colour neutral totals red or green; loss and gain colours are reserved for signed values and states.
- **Don't** put the panel ambient shadow on ply-tinted sheets.
- **Don't** add uppercase tracked labels or eyebrow text above headings; labels stay sentence case.
- **Don't** give Iklan yellow further non-source roles beyond the existing highlight uses (active step, selection, sample tag, empty input, warning rank).
