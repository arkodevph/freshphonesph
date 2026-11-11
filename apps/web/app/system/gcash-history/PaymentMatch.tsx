import Link from "next/link";
import type { GcashPaymentMatch } from "@freshphones/contracts";

const labels: Record<GcashPaymentMatch["status"], string> = {
  SUGGESTED: "Suggested match",
  AMBIGUOUS: "Ambiguous · duplicate reference",
  UNMATCHED: "No exact payment match",
  MISSING_REFERENCE: "Reference missing · check PDF",
  CHECK_DATE: "Date needs checking",
  NOT_INCOMING: "Not an incoming credit",
};

export function PaymentMatch({ match }: { match: GcashPaymentMatch }) {
  return (
    <>
      <span>{labels[match.status]}</span>
      {match.status === "SUGGESTED" && match.paymentId && (
        <small>
          <Link href={`/system/payments?payment=${match.paymentId}`}>
            Open payment
          </Link>
        </small>
      )}
    </>
  );
}
