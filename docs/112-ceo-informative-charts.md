# CEO dashboard: informative charts

The CEO portal now places collections in the first desktop row, alongside company totals and a payment-status ring. Monthly amount comparisons, ranked batch balances and the assistant occupy the second row. Existing business data, permission boundaries and reports remain the source of figures.

## Reference decision

The supplied navy/purple chart board establishes the capsule-track and ring vocabulary. Primary live reference: [SalesPilot by Mostofa](https://dribbble.com/shots/26852158-SalesPilot-Sales-Revenue-Dashboard-UI). Its wide main chart, narrower ring, rounded neutral chart tracks and hierarchy control the chart treatment. Retain Fresh Phones' existing glass shell and status semantics. All nine candidates were opened and their actual shot images inspected; original research assets and URLs are in ignored `.local/ceo-informative-charts/references/`.

| Reviewed reference | Decision |
| --- | --- |
| [SalesPilot](https://dribbble.com/shots/26852158-SalesPilot-Sales-Revenue-Dashboard-UI) | Primary: rounded chart tracks, wide main plot, adjacent ring |
| [Finance Dashboard, Craft Studio](https://dribbble.com/shots/16686560-Finance-Dashboard-Design-Dark-theme) | Rejected: stacked decorative cards and saturated competing accents |
| [Finance UI, Shemon](https://dribbble.com/shots/19266847-Finance-Dashboard-UI-Dark-Scheme) | Rejected: tilted mockup, excessive summary cards |
| [Financial Dashboard, Savitskiy](https://dribbble.com/shots/7559172-Financial-Dashboard-Design-Dark-Mode) | Rejected: exchange/trading composition does not fit collections |
| [Sediamac sales analytics](https://dribbble.com/shots/25276274-Sales-Analytics-Dashboard) | Relevant retail domain; geographic map has no supporting project data |
| [SalesPro analytics](https://dribbble.com/shots/27051074-Sales-Analytics-Dashboard) | Clear comparisons; less distinctive chart grammar |
| [Modern Analytics, Henry](https://dribbble.com/shots/25677491-Modern-Analytics-Dashboard) | Rejected: decorative textures and arbitrary multi-accent metrics |
| [Market Insight](https://dribbble.com/shots/20670135-Market-Insight-Interactive-Chart-Dashboard-SaaS) | Rejected: candlesticks imply market OHLC data the project does not have |
| [Sync Analytics](https://dribbble.com/shots/23141727-Analytics-Dashboard-for-a-Web-Ad-tech-Platform) | Clear capsule columns; equal-width small charts subordinate the main question |

## Fidelity and practical adaptations

- Composition: summary at left, wide collections in the center, status ring at right; ranked comparison below. On smaller screens preserve existing responsive navigation and single-column panels.
- Marks: rounded solid columns over muted capsule tracks replace thin outlined hatching. A ring replaces repeated horizontal status meters. Two monthly capsules share an amount-magnitude scale, with signed values and striped negative corrections.
- Typography: existing restrained sans typography and tabular money; large values precede charts. Axis text is HTML at 11px so SVG scaling cannot make it illegible on phones.
- Palette: cool low-saturation neutral panels; blue verified and analogous lilac pending. Amber and rose are exception markers with explicit text labels. Lightness contrast, rather than extra saturated backgrounds, separates data from tracks. Existing light/dark tokens stay consistent with report status meanings.
- Information: PHP axes, zero baseline, explicit pending readout, selectable monthly figures and exact data table. Negative Finance corrections retain signed geometry. Ring percentages represent record counts, not money or a collection target. Batch bars compare displayed balances against the largest shown, not a completion percentage.
- Motion: existing restrained 420ms geometry transitions; reduced motion disables the new ring and monthly transitions. No new dependencies.

## Verification evidence

`verify.cjs` and `checks.json` under `.local/ceo-informative-charts/` exercise six desktop/tablet/mobile sizes and themes, keyboard month selection, exact amount readouts, ring proportions, empty data, signed corrections and the 12-month selector at 320px. Screenshots use browser-only response fixtures; no business records were created. The existing skeleton comparison verifies six panel boxes before/after load. Existing executive/report chart tests cover signed, fractional and empty amounts. See session logs in `/tmp/fresh-ceo-charts-*`.

Visual comparison: the rendered dashboard preserves the primary reference's wide chart/narrow ring relationship and round marks over neutral tracks. Adaptations expose units, keep pending separate, retain accurate ring proportions and provide readable axes at narrow sizes. The existing Fresh Phones shell and company balance card remain recognizable.

Contrast sampling: 22 axis/legend/status-label samples over actual rendered backgrounds pass 4.5:1; minimum measured 5.44:1 in light mode and 5.83:1 in dark mode. This is browser screenshot sampling, not physical-display certification. Evidence: `.local/ceo-informative-charts/contrast.json`.
