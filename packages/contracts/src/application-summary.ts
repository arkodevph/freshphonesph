import type { BatchInput, Cadence, ClientInput } from "./index";

/** A customer's current membership record, separate from their signed agreement. */
export interface PortalApplicationSummary {
  title: "Application summary";
  generatedAt: string;
  notice: string;
  membership: {
    id: string;
    name: string;
    email: string;
    phone: string;
    joinedAt: string | null;
    status: ClientInput["status"];
    replacementCompletedAt: string | null;
    unitModel: string;
  };
  batch: {
    id: string;
    code: string;
    model: string;
    status: BatchInput["status"];
    startDate: string;
    endDate: string;
  };
  plan: {
    individual: boolean;
    startDate: string;
    endDate: string;
    cadence: Cadence | null;
    issuedSchedule: {
      installmentCount: number;
      firstDueDate: string;
      lastDueDate: string;
      originalTotal: string;
    } | null;
  };
}
