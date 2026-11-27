"use client";

import { can, useMe } from "@/lib/useMe";
import AgentWithdrawalWorkspace from "./AgentWithdrawalWorkspace";

export function WithdrawalStaffWorkspace({
  requestId,
}: {
  requestId?: string;
}) {
  const me = useMe();

  if (!me) {
    return <p role="status">Checking your workspace…</p>;
  }

  return can(me, "WITHDRAWAL_READ") ? (
    <AgentWithdrawalWorkspace key={String(me.id)} />
  ) : (
    <p role="alert">No access to withdrawal requests.</p>
  );
}
