# Batch Manager dashboard — November 19, 2026

Batch Manager owns a dedicated dashboard in `apps/web/app/system/_role-designs/batch_manager/app/system/batch-manager-dashboard/`, composed of summary, task, loading and data-hook files. It displays assigned active batches, assigned clients, release readiness and open tasks using the existing API. Workspace links follow shared access policy. The role manifest includes all seven files.

The copied task workspace/detail, compact client filters, creation disclosures and native-select treatment now select Batch Manager instead of COO in this role folder. Task assignment remains gated by `TASK_ASSIGN`; no backend permission rules changed. Existing report-navigation edits from other work remain intact. Read `156-independent-role-designs.md` before changing role views.

## Verification

235/235 web tests pass, including role isolation; web TypeScript and whitespace checks pass. Dashboard and manifest formatting checked. Prior retained optimized-build log reports success. Restarted protected preview at http://localhost:3000, build `pb63N3mCntudV-IglESus` in `.next-preview-a`. Both COO and Batch Manager demo logins succeed; the latter shows 3 assigned active batches and 32 assigned clients. Browser evidence and logs live in `.local/batch-manager-20261119/`. Initial browser verifier hit a duplicate main landmark selector on Tasks; corrected the verifier to select the outer main. This does not establish accessibility acceptance for nested landmarks.

Responsive read-only browser checks pass at 1440, 390 and 320px for Dashboard, Tasks and Clients: no horizontal page overflow and no page errors.

## Remaining verification and context gaps

No financial or assignment mutation was performed. Form submission, full dark-theme/dialog interaction coverage and user acceptance remain unverified. Nami profile and project brain could not be resumed or saved: `/mnt/storage` returns `No such device`. Local DESIGNAGENT.md and developer updates 154/156 were read. Preserve the existing composition until the canonical design context is accessible; do not claim new reference research or full design acceptance. Local pnpm is unavailable, so tests used installed Node/tsx and TypeScript directly. No commit, push or deployment.
