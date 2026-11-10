"use client";

import { can, useMe } from "@/lib/useMe";
import { WithdrawalWorkspace } from "./WithdrawalWorkspace";

export function WithdrawalStaffWorkspace({
  requestId,
}: {
  requestId?: string;
}) {
  const me = useMe();

  if (!me) {
    return <p role="status">Checking your workspace…</p>;
  }

  return (
    <WithdrawalWorkspace
      key={`${me.id}:${requestId ?? "all"}`}
      requestId={requestId}
      enabled={can(me, "WITHDRAWAL_READ")}
    />
  );
}
