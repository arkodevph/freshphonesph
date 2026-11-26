# Report charts by question

The reports overview uses a different chart composition for each category. CEO and COO keep their existing report access, shell, filters, detailed figures, saved reports and exports. Role report visual entry points use the common chart renderer so the data definitions stay consistent.

| Report | Visuals | Reading boundary |
| --- | --- | --- |
| Payments | Status ring and amount columns | Record counts and money are separate; pending claims do not reduce balances. |
| Batch & Collections | Period collection columns and ranked outstanding balances | Rankings cover up to six batches on the current page; current balances are not a partition of period collections. |
| Reconciliation | Signed credit waterfall and review-flag list | Original credit plus corrections equals net credit. Overlapping flags are not a part-of-whole chart. Missing legacy components remain unknown. |
| Tasks & KPI | Segmented workflow and submission-timing gauge | Gauge denominator is submitted tasks. Task timing creates no wage or disciplinary action. |
| Support | Ranked categories and segmented enquiry sources | Case counts, not amounts; absent historical source data is stated explicitly. |
| Installment earnings | Scheduled-obligation columns and schedule coverage | Obligations are not received collections or profit. Ranking is page-local; coverage uses all-page totals. |

Plots use exact labeled values, signed baselines where needed, empty states and reduced motion. Multi-entry columns scroll horizontally on narrow screens rather than compressing labels or currency amounts. Keyboard users can focus the plot and scroll or inspect an individual column. Existing tab springs are retained; chart entrances use the existing style spring.

## Inspected references

Baker inspected these live Dribbble pages through OpenCLI on November 21, 2026 and retained the original media for comparison. Publication dates were not established.

- Primary: [Fundcy — Finance Dashboard, firdausnurwachid / One Week Wonders](https://dribbble.com/shots/25178389-Fundcy-Finance-Dashboard). Rounded comparative columns, direct readouts, quiet grid and generous plotting space.
- Supporting: [Nivo — Personal Finance Dashboard, Dipa Inhouse](https://dribbble.com/shots/27809089-Nivo-Personal-Finance-Dashboard-UI-Design). Semicircular progress and categorical segmentation.

FreshPhones retains its existing blue/lilac palette, neutral surfaces and role navigation. The reference's decorative treatments and unsupported time series were not introduced. The supplied screenshot's repeated horizontal bars were the negative example: unrelated report questions looked interchangeable.

Local reference brief, source media, builds, screenshots and browser checks: `.local/report-charts-20261121/`. Automated fixture checks are explicitly synthetic and do not change database records. Production deployment and business acceptance are separate.
