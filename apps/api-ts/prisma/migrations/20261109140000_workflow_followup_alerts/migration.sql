-- Staff alerts need the current open follow-up under the authenticated actor's
-- transaction context. This SELECT policy does not grant monitoring writes.
CREATE FUNCTION operations_workflow_batch_visible(target_batch UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" actor JOIN public."Batch" b ON b.id = target_batch
    WHERE actor.id = operations_monitor_actor() AND actor.active
      AND (actor.role IN ('RECORDS', 'FINANCE_OFFICER')
        OR (actor.role IN ('BATCH_HANDLER', 'CORE_HANDLER') AND b."handlerId" = actor.id)
        OR (actor.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER') AND b."managerId" = actor.id))
  );
$$;

CREATE POLICY workflow_followup_read ON "OperationsFollowUp" FOR SELECT USING (
  status = 'OPEN' AND (
    EXISTS (SELECT 1 FROM "Payment" p WHERE p.id = "paymentId" AND operations_workflow_batch_visible(p."batchId"))
    OR EXISTS (SELECT 1 FROM "GcashHistory" h WHERE h.id = "historyId" AND operations_workflow_batch_visible(h."batchId"))
  )
);

-- History remains restricted to monitoring staff even when a follow-up is
-- readable to produce an actionable bell alert.
ALTER POLICY monitor_history_read ON "OperationsFollowUpEvent" USING (
  operations_monitor_reader() AND EXISTS (
    SELECT 1 FROM "OperationsFollowUp" f WHERE f.id = "followUpId"
      AND operations_monitor_source_visible(f."paymentId", f."historyId")
  )
);

ALTER POLICY monitor_history_insert ON "OperationsFollowUpEvent" WITH CHECK (
  operations_monitor_reader() AND "actorId" = operations_monitor_actor() AND EXISTS (
    SELECT 1 FROM "OperationsFollowUp" f WHERE f.id = "followUpId"
      AND operations_monitor_source_visible(f."paymentId", f."historyId")
  )
);
