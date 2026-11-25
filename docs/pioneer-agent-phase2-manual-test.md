# Pioneer Agent Phase 2 — isolated review guide

This review uses synthetic data in a separate local database and worktree.
The retained Finance/main preview remains at <http://localhost:3000/login>.
Phase 2 is at <http://127.0.0.1:3002/login>; use that exact host so its browser
sign-in stays separate from the localhost session.

## Walkthrough

1. Open **Preview a workspace → Pioneer agent**. The requested Pioneer shortcut
   is configured for this isolated environment. Go to **Agent network**.
2. Confirm the current scope contains **503 Agents** and **105 assigned batches**.
   These are test fixtures. The team has **44 enrollment requests**: **16 pending**,
   **14 approved**, and **14 rejected**. Counts mean requests, not enrolled members.
3. Search `pa-0501`: Agent 0501 is beyond the former 500-account cap. Its linked
   profile is inactive, while its staff account remains in the current team.
   Agent 0502 has no linked profile and one pending request.
4. Clear search, open **Agent 0000**, and check its code, Pioneer, profile readiness
   and **43 requests** (**15 pending / 14 approved / 14 rejected**). Use the
   keyboard to open details; Escape should return focus to the initiating action.
5. Choose **View enrollment requests**. Change status, search member/Agent/batch,
   sort and page. Open a request and **Outcome** to inspect the recorded decision,
   reviewer and reason. This workspace is read-only for Pioneer; unavailable
   website-application actions are omitted, including for the linked test request.
6. Use **Back to Agent network**. Network search, sort, page and selected Agent
   should return. Use browser Back/Forward too. Changing a search/status/sort
   starts at page 1; a page removed by changing scope normalizes to a valid page.
7. Open **Assigned batches**, go to the last page or search `beyond`. Batch
   `PA-BATCH-104` is beyond the former 100-batch cap. Member counts remain separate
   from request totals.
8. Review both themes and narrow widths. Names/codes remain available, numeric
   counts stay readable, and every row action remains visible on touch screens.

Human visual/business acceptance and assistive-technology acceptance are pending.
The automated evidence and its scope are in the
[Phase 2 notebook](pioneer-agent-remaining-work-plan.md#phase-2-implementation-notebook--2026-11-25).

## Local ownership and later integration

Worktree: `/home/jaycee/Projects/freshphonesph-pioneer-phase-two`.
Branch: `feature/pioneer-agent-phase-two`, base `75d8771`; no Phase 2 commit or push.
The inherited source is a validation baseline, not a request to copy another
session's work. The main-run Phase 1 session retains ownership of its changes.

The source-only patch is `.local/pioneer-phase2-20261125/phase2-source.patch`.
It compares Phase 2 against the imported pending-source snapshot, not HEAD.
Review it after the other session stops editing shared seams. Check it with
`git apply --check <absolute-patch-path>` in the target checkout. If context has
changed, merge only the bounded additions rather than replacing entire files:

- Register `AgentNetworkController` / `AgentNetworkService` in `src/app.ts`.
- Add the `agent-network` contracts export and API test script/list entry.
- Union the new Pioneer-owned paths into the role manifest.
- Carry the Pioneer network route and enrollment request view changes forward.
- Preserve Phase 1's shared `enrollment-scope.ts` helper and existing grants.

The documentation changes stay in this worktree's existing Pioneer notebook,
role/access reference and this guide. Do not overwrite the other session's newer
Phase 1/3 documentation with the full imported notebook. No preview reset,
Agent submission-policy change, schema/index migration, merge or deployment is
part of this Phase 2 handoff.
