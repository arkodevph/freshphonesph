# Incoming migration sources

These scripts are retained unchanged from incoming commit `fd3ff14`. They are reference
material rather than active Prisma migrations: the operations script recreates `Task`,
`KpiReview`, `SupportCase`, `CustomerDocument`, `Notification`, their enums, and `Agent`,
which the existing migration history already creates with working data and relationships.
Its September timestamp also places it before those established migrations on a fresh install.

`20261007010000_operations_reconcile` adds the new requirement, application, attachment,
report-history and template-delivery structures after the existing history. Separate
`RequirementDocument` and `StaffNotification` models preserve the existing customer document
reviews and portal delivery records. The reconciliation also permits a null upload actor
for public applicant attachments; authenticated uploads continue recording their actor.

The existing twenty migrations are unchanged. Verify applied migration names before using
this reconciled branch on any environment that recorded the two incoming migration names.
