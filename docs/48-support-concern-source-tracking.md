# Support concern source tracking

Implemented locally for Customer Service scope §10. Every new support case records how the concern entered the system. Customer portal cases receive `CUSTOMER_PORTAL` on the server. Customer Service staff can log a concern from Messenger, Facebook, phone, walk-in, or another external source after selecting an existing customer. Staff cannot claim that a manual entry came from the customer portal.

The staff Support page searches customer names through a support-only endpoint that returns only ID, name and batch code. It lets staff log the category, concern description and contact source, and shows source in case lists and conversations. Status and source filters can be combined. The Support report and CSV/XLSX export aggregate cases by source alongside the existing category and turnaround figures; old report snapshots remain readable.

`SupportCase.source` is a PostgreSQL enum and immutable after creation. The migration labels preexisting cases `UNRECORDED`, because the original channel is unknown. Staff create calls require `SUPPORT_CREATE` and `SUPPORT_MANAGE`; customer portal creation ignores no client-supplied source and rejects extra fields. Both creation paths audit the source. A support case remains attached to its selected customer, and portal visibility is limited to that customer.

Messenger/Facebook/phone contacts do not create cases automatically. Staff must log them and choose the accurate original channel. `OTHER` is for a source outside the listed channels; staff should describe the channel in the concern text when needed. Source records provenance, not verification of what was said on the external channel.

Verification: migration `20261008050000_support_case_source` applied to a dedicated PostgreSQL test database and the local preview. Four preexisting preview cases all became `UNRECORDED`. The focused `test/support-source.integration.test.ts` passes and covers customer source spoofing, staff role/validation, source immutability, filtering, customer visibility, minimal client lookup and report totals. The 127 existing API integration tests, 59 API unit tests and 52 web tests pass; API and production web builds pass.

Business acceptance remains open for channel labels, named Customer Service UAT and retention policy. Production Neon and Better Auth provisioning are separate pending decisions; this local implementation continues to use the current TypeScript API and local PostgreSQL/auth setup.
