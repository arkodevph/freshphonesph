# Total collections: remove misleading background columns

The user rejected the Total collections rendering in
`/tmp/codex-clipboard-qfqojX.png` and explicitly requested Nami handle the fix.
The visible problem was full-height gray column tracks in every month, including
months with zero amounts. Those tracks had no budget/target meaning in the data.
Tall capsule ends and a scale divided directly from the observed maximum also
made the chart look unnecessarily ornamental and produced awkward19.7K steps.

Nami's controlling guidance is `/home/nami/DESIGNAGENT.md`. Keep the existing
Pay Key portal composition and blue/lilac verified/pending palette. The retained
[Ocupite finance dashboard](https://dribbble.com/shots/27319213-Finance-Dashboard-Web-App-UI)
provides the grouped timeline reference; it was inspected under
`.local/ceo-nami-flow/references/ocupite-loaded.png`. This change adopts its clear
paired-column reading while omitting budget/target decoration because Freshphones
has no corresponding target series. It is not a full-dashboard recreation.

- Gray full-height tracks are removed; zero amounts have zero visible bar height.
- Data columns use a shared, rounded currency scale and compact3px corners.
- Tick spacing uses1/2/2.5/5/10 steps, retaining a signed axis for corrections.
- Group widths adapt to3/6/12-month density while staying inside each month slot.
- All months, exact amounts, period controls, keyboard-operable month inspection,
  summary readout and exact-figure disclosure are retained.

Compared with the rejected screenshot, the sample now reads0/20K/40K/60K/80K;
June through September have no fabricated column shapes. The lighter grid stays
secondary to the real October and November amounts. The timeline's empty months
remain visible intentionally: they represent actual zero periods, not missing data.
The existing negative, empty and fractional-value tests pass; two added regressions
cover rounded sparse-chart ticks and twelve-month group spacing. Full web
regression totals192 passing tests. Web types, formatting/whitespace and384-file
client credential checks pass.

Browser evidence is in `.local/ceo-collections-cleanup/`. Checks at1440 light/dark,
390 dark and320 light verify rounded labels, removed tracks, zero-month inspection,
no overflow and no runtime page errors. Final acceptance is against port3000 after
its protected optimized build/restart; source-preview screenshots alone are not
used as evidence that the user's running preview changed.

The scope is visual and client geometry only. No database values, permissions or
Finance verification behavior change; no new chart package is installed. Other
browser engines and production deployment remain unverified.
