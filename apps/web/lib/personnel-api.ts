import type {
  PersonnelListQuery,
  PersonnelOnboarding,
  PersonnelPage,
  PersonnelSubmission,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export function getPersonnelOnboarding(query: PersonnelListQuery) {
  const params = new URLSearchParams({ page: String(query.page), q: query.q });

  if (query.status) {
    params.set("status", query.status);
  }

  return tsRequest<PersonnelPage>(`/personnel/onboarding?${params}`);
}

export function submitPersonnelOnboarding(input: PersonnelSubmission) {
  return tsRequest<PersonnelOnboarding>("/personnel/onboarding", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function enrollPersonnel(
  id: string,
  input: { version: number; password: string; agentProfileId?: string },
  idempotencyKey: string,
) {
  return tsRequest<PersonnelOnboarding>(
    `/personnel/onboarding/${encodeURIComponent(id)}/enroll`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    },
  );
}

export function rejectPersonnelOnboarding(
  id: string,
  input: { version: number; reason: string },
  idempotencyKey: string,
) {
  return tsRequest<PersonnelOnboarding>(
    `/personnel/onboarding/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    },
  );
}

export function getPersonnelOnboardingOptions() {
  return tsRequest<import("@freshphones/contracts").PersonnelOptions>(
    "/personnel/onboarding/options",
  );
}

export function getPersonnelOnboardingHistory(id: string) {
  return tsRequest<import("@freshphones/contracts").PersonnelHistoryEntry[]>(
    `/personnel/onboarding/${encodeURIComponent(id)}/history`,
  );
}
