import { enrollmentApplicationForwardSchema } from "@freshphones/contracts";
import { ApiError, tsRequest } from "@/lib/ts-api";

export type EnrollmentPayload = {
  name: string;
  email: string;
  phone: string;
  batchId: string;
  memberId?: string;
};

export type EnrollmentReceipt = { id: string; status: string; version: number };

export type EnrollmentAttempt = { id: string; body: string };

export function newEnrollmentAttempt(
  payload: EnrollmentPayload,
): EnrollmentAttempt {
  const { version: _version, ...normalized } =
    enrollmentApplicationForwardSchema.parse({
      ...payload,
      version: 1,
      email: payload.email.trim(),
    });

  const id = crypto.randomUUID();

  return { id, body: JSON.stringify({ ...normalized, submissionId: id }) };
}

/** A network/server failure can occur after commit. Preserve exact command identity. */
export function uncertainEnrollmentFailure(failure: unknown) {
  return (
    !(failure instanceof ApiError) ||
    failure.status >= 500 ||
    [408, 409].includes(failure.status)
  );
}

export function sendEnrollmentAttempt(attempt: EnrollmentAttempt) {
  return tsRequest<EnrollmentReceipt>("/enrollment/requests", {
    method: "POST",
    headers: { "Idempotency-Key": attempt.id },
    body: attempt.body,
  });
}

/** Freeze both body and HTTP identity before the first application action. */
export function newApplicationCommand(
  applicationId: string,
  operation: "forward" | "close",
  payload: { version: number } & (EnrollmentPayload | { reason: string }),
) {
  const body = JSON.stringify(payload);

  const key = crypto.randomUUID();

  return () => {
    return tsRequest<unknown>(
      `/enrollment/applications/${encodeURIComponent(applicationId)}/${operation}`,
      { method: "POST", headers: { "Idempotency-Key": key }, body },
    );
  };
}
