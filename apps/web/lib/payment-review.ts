import type { PaymentReviewDetail } from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getHandlerPaymentReview(
  paymentId: string | null,
  reviewId: string | null,
  signal?: AbortSignal,
) {
  if (
    !paymentId ||
    !reviewId ||
    !uuid.test(paymentId) ||
    !uuid.test(reviewId)
  ) {
    throw new Error("This payment review link is invalid.");
  }

  const review = await tsRequest<PaymentReviewDetail>(
    `/staff/alerts/reviews/${reviewId}`,
    { signal },
  );

  if (review.id !== reviewId || review.paymentId !== paymentId) {
    throw new Error(
      "This review belongs to a different payment. Open it from your current alerts.",
    );
  }

  return review;
}

export const paymentReviewStatusLabels = {
  PENDING: "Pending review",
  NEEDS_CLARIFICATION: "Needs clarification",
  VERIFIED: "Verified by Finance",
  REJECTED: "Rejected by Finance",
} as const;
