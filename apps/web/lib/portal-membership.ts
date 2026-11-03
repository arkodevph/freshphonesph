import type { Client } from "@freshphones/contracts";

/** Calendar labels and dates follow this membership's agreed terms. */
export function portalMembershipDetails(
  client: Pick<
    Client,
    | "status"
    | "replacementCompletedAt"
    | "joinedAt"
    | "membershipPlan"
    | "batch"
  >,
) {
  return {
    status: client.replacementCompletedAt
      ? "replacement joined"
      : client.status.toLowerCase(),
    joined_at: client.joinedAt,
    batch_start_date:
      client.membershipPlan?.startDate ?? client.batch.startDate,
    batch_end_date: client.membershipPlan?.endDate ?? client.batch.endDate,
    individual_plan: Boolean(client.membershipPlan),
  };
}
