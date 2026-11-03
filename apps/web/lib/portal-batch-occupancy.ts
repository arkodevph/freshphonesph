import type { PortalBatchSummary } from "@freshphones/contracts";

export type PortalBatchOccupancyState =
  | { status: "idle"; membershipId: null }
  | { status: "loading"; membershipId: string }
  | {
      status: "ready";
      membershipId: string;
      summary: PortalBatchSummary;
    }
  | { status: "error"; membershipId: string; message: string };

/** A batch read belongs to the membership captured when it started. */
export function createPortalBatchOccupancy(
  read: (membershipId: string) => Promise<PortalBatchSummary>,
  onChange: (state: PortalBatchOccupancyState) => void,
) {
  let selected: string | null = null;

  let requestVersion = 0;

  async function select(membershipId: string | null) {
    selected = membershipId;

    const request = ++requestVersion;

    if (!membershipId) {
      onChange({ status: "idle", membershipId: null });

      return;
    }

    onChange({ status: "loading", membershipId });

    try {
      const summary = await read(membershipId);

      if (request !== requestVersion || selected !== membershipId) {
        return;
      }

      if (summary.membershipId !== membershipId) {
        throw new Error(
          "The selected membership changed. Retry batch details.",
        );
      }

      onChange({ status: "ready", membershipId, summary });
    } catch (error) {
      if (request !== requestVersion || selected !== membershipId) {
        return;
      }

      onChange({
        status: "error",
        membershipId,
        message:
          error instanceof Error
            ? error.message
            : "We couldn’t load your batch details. Please retry.",
      });
    }
  }

  return {
    select,
    refresh() {
      return select(selected);
    },
    cancel() {
      ++requestVersion;

      selected = null;
    },
  };
}

export function portalBatchStatus(status: PortalBatchSummary["batchStatus"]) {
  return {
    PLANNED: "Forming",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  }[status];
}
