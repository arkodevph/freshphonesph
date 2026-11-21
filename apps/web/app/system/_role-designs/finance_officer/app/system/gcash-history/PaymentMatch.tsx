import Link from "next/link";
import { financeGcashHref, financePaymentHref } from "@/lib/finance-navigation";
import type { GcashPaymentMatch } from "@freshphones/contracts";

const labels: Record<GcashPaymentMatch["status"], string> = {
  SUGGESTED: "Suggested match",
  AMBIGUOUS: "Ambiguous · duplicate reference",
  UNMATCHED: "No exact payment match",
  MISSING_REFERENCE: "Reference missing · check PDF",
  CHECK_DATE: "Date needs checking",
  NOT_INCOMING: "Not an incoming credit",
};

export function PaymentMatch({
  match,
  historyId,
  submissionId,
  sourcePage = 1,
}: {
  match: GcashPaymentMatch;
  historyId: string;
  submissionId: string;
  sourcePage?: number;
}) {
  return (
    <>
      <span>{labels[match.status]}</span>
      {match.status === "SUGGESTED" && match.paymentId && (
        <small>
          <Link
            href={financePaymentHref({
              id: match.paymentId,
              returnTo: financeGcashHref(
                typeof window === "undefined" ? "" : window.location.search,
                historyId,
                submissionId,
                sourcePage,
              ),
            })}
          >
            Open payment
          </Link>
        </small>
      )}
    </>
  );
}
