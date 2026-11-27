"use client";

import type {
  NetworkAgent,
  NetworkBatch,
  NetworkPage,
  Page,
  PublicEnrollmentApplication,
  WithdrawalPage,
} from "@freshphones/contracts";
import { useAgentResource } from "@/lib/useAgentResource";
import type { EnrollmentPage } from "../enrollments/enrollment-types";

type TaskCount = { count: number };

export function useAgentDesk() {
  const profile = useAgentResource<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?page=1",
  );

  const batches = useAgentResource<NetworkPage<NetworkBatch>>(
    "/agent-network/batches?page=1",
  );

  const applications = useAgentResource<Page<PublicEnrollmentApplication>>(
    "/enrollment/applications?status=RECEIVED&page=1",
  );

  const requests = useAgentResource<EnrollmentPage>(
    "/enrollment/requests?page=1",
  );

  const withdrawals = useAgentResource<WithdrawalPage>(
    "/withdrawals?status=AWAITING_AGENT&page=1",
  );

  const todo = useAgentResource<TaskCount>("/tasks?status=TODO&page=1");

  const inProgress = useAgentResource<TaskCount>(
    "/tasks?status=IN_PROGRESS&page=1",
  );

  const resources = [
    profile,
    batches,
    applications,
    requests,
    withdrawals,
    todo,
    inProgress,
  ];

  function refresh() {
    for (const resource of resources) {
      void resource.refresh();
    }
  }

  return {
    profile,
    batches,
    applications,
    requests,
    withdrawals,
    todo,
    inProgress,
    refreshing: resources.some((resource) => {
      return resource.loading;
    }),
    refresh,
  };
}

export type AgentDesk = ReturnType<typeof useAgentDesk>;
