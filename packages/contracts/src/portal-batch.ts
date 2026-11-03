import type { BatchInput } from "./index";

/** Aggregate for the customer's selected membership; never a member roster. */
export interface PortalBatchSummary {
  membershipId: string;
  batchId: string;
  batchNumber: string;
  approvedMembers: number;
  capacity: number;
  remaining: number;
  isFull: boolean;
  batchStatus: BatchInput["status"];
}
