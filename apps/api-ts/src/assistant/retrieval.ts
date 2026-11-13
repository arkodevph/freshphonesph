/** Narrow retrieval checks, not a classifier for every possible user request. */
export function retrievalGoal(question: string) {
  if (
    /\bbatch(?:es)?\b/i.test(question) &&
    /\b(how many|number|count|ilan)\b/i.test(question)
  ) {
    return {
      operations: ["records.batch_memberships", "records.clients"],
      instruction:
        "Finish the requested batch membership count with read_data records.batch_memberships and input {query:{batchId:the resolved batch UUID}}. It returns the exact total across all statuses. No status is required. Resolve a specific matching batch first using records.batches or reports.batches. If several batches match and the user did not ask for the first/latest, ask which batch. Never ask the user for an operation, schema field, or optional status. Never invent reports.clients: that operation does not exist.",
    };
  }

  if (
    /\b(catalog|listings)\b/i.test(question) &&
    /\b(fetch|show|list|availability|available)\b/i.test(question)
  ) {
    return {
      operations: ["catalog.list"],
      instruction:
        "Read current listings using read_data catalog.list with input {query:{}} or a user-requested search filter. Retrieve the authorized availability statuses before answering. There is no numeric inventory count in this listing API.",
    };
  }

  return null;
}
