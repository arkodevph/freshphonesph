-- A consistency marker, never a cached response. Values remain in application RAM only.
CREATE TABLE "CooReadRevision" (
  id TEXT PRIMARY KEY,
  version BIGINT NOT NULL DEFAULT 0
);

INSERT INTO "CooReadRevision" (id) VALUES ('global');

CREATE FUNCTION bump_coo_read_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Match the existing business-write lock before acquiring row locks. The revision
  -- and source changes commit/roll back together, including writes from another API.
  PERFORM pg_advisory_xact_lock(740015);
  UPDATE "CooReadRevision" SET version = version + 1 WHERE id = 'global';
  RETURN NULL;
END;
$$;

DO $$
DECLARE source_table TEXT;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'User', 'Agent', 'Batch', 'Member', 'Client', 'ScheduleItem',
    'Payment', 'PaymentAdjustment', 'PaymentOperationalReview',
    'GcashHistory', 'GcashHistorySubmission', 'EvidenceRequirement',
    'OperationsMonitorPolicy', 'OperationsFollowUp', 'OperationsFollowUpEvent',
    'Task', 'KpiReview', 'SupportCase', 'SupportMessage',
    'ReportSnapshot', 'ReportAnalysis', 'AuditEntry',
    'WithdrawalRequest', 'WithdrawalScheduleRelease'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER coo_read_revision BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION bump_coo_read_revision()',
      source_table
    );
  END LOOP;
END;
$$;
