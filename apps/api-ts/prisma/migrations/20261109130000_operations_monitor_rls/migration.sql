-- Actor context is set only by the authenticated API, with transaction-local lifetime.
-- FORCE also subjects the ordinary migration/table owner to these policies.
CREATE FUNCTION operations_monitor_actor() RETURNS UUID LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT NULLIF(current_setting('app.monitor_actor_id', true), '')::uuid;
$$;
CREATE FUNCTION operations_monitor_reader() RETURNS BOOLEAN LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public."User" u WHERE u.id = operations_monitor_actor()
    AND u.active AND u.role IN ('COO', 'SYSTEM_ADMIN', 'OPERATIONS_COORDINATOR'));
$$;
CREATE FUNCTION operations_monitor_coo() RETURNS BOOLEAN LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public."User" u WHERE u.id = operations_monitor_actor() AND u.active AND u.role = 'COO');
$$;
CREATE FUNCTION operations_monitor_batch_visible(target_batch UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" actor JOIN public."Batch" b ON b.id = target_batch
    WHERE actor.id = operations_monitor_actor() AND actor.active
      AND (actor.role IN ('COO', 'SYSTEM_ADMIN') OR (actor.role = 'OPERATIONS_COORDINATOR' AND EXISTS (
        SELECT 1 FROM public."Agent" agent
        JOIN public."User" account ON account."agentProfileId" = agent.id
        JOIN public."User" pioneer ON pioneer.id = account."supervisorId"
        WHERE agent.id = b."agentId" AND agent.active AND account.active AND pioneer.active
          AND account.role = 'AGENT' AND pioneer.role = 'PIONEER_AGENT' AND pioneer."supervisorId" = actor.id
      )))
  );
$$;
CREATE FUNCTION operations_monitor_source_visible(payment_id UUID, history_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE
  SET search_path = pg_catalog, public AS $$
  SELECT CASE WHEN payment_id IS NOT NULL THEN EXISTS (
    SELECT 1 FROM public."Payment" p WHERE p.id = payment_id AND operations_monitor_batch_visible(p."batchId")
  ) ELSE EXISTS (
    SELECT 1 FROM public."GcashHistory" h WHERE h.id = history_id AND operations_monitor_batch_visible(h."batchId")
  ) END;
$$;

ALTER TABLE "OperationsMonitorPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperationsMonitorPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY monitor_policy_read ON "OperationsMonitorPolicy" FOR SELECT USING (operations_monitor_reader());
CREATE POLICY monitor_policy_insert ON "OperationsMonitorPolicy" FOR INSERT WITH CHECK (operations_monitor_coo());
CREATE POLICY monitor_policy_update ON "OperationsMonitorPolicy" FOR UPDATE USING (operations_monitor_coo()) WITH CHECK (operations_monitor_coo());

ALTER TABLE "OperationsFollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperationsFollowUp" FORCE ROW LEVEL SECURITY;
CREATE POLICY monitor_followup_read ON "OperationsFollowUp" FOR SELECT USING (operations_monitor_source_visible("paymentId", "historyId"));
CREATE POLICY monitor_followup_insert ON "OperationsFollowUp" FOR INSERT WITH CHECK (operations_monitor_source_visible("paymentId", "historyId"));
CREATE POLICY monitor_followup_update ON "OperationsFollowUp" FOR UPDATE USING (operations_monitor_source_visible("paymentId", "historyId")) WITH CHECK (operations_monitor_source_visible("paymentId", "historyId"));

ALTER TABLE "OperationsFollowUpEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperationsFollowUpEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY monitor_history_read ON "OperationsFollowUpEvent" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "OperationsFollowUp" f WHERE f.id = "followUpId")
);
CREATE POLICY monitor_history_insert ON "OperationsFollowUpEvent" FOR INSERT WITH CHECK (
  "actorId" = operations_monitor_actor() AND EXISTS (SELECT 1 FROM "OperationsFollowUp" f WHERE f.id = "followUpId")
);
-- No DELETE policy and no history UPDATE policy: normal application principals cannot erase history.
