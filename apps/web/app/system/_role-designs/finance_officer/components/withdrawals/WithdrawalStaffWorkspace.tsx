"use client";

import { can, useMe } from "@/lib/useMe";
import { WithdrawalWorkspace } from "@/app/system/_role-designs/finance_officer/components/withdrawals/WithdrawalWorkspace";

export function WithdrawalStaffWorkspace({
  requestId,
  refundOnly = false,
}: {
  requestId?: string;
  refundOnly?: boolean;
}) {
  const me = useMe();

  if (!me) {
    return <p role="status">Checking your workspace…</p>;
  }

  return (
    <WithdrawalWorkspace
      key={`${me.id}:${requestId ?? "all"}:${refundOnly}`}
      requestId={requestId}
      refundOnly={refundOnly}
      enabled={can(me, "WITHDRAWAL_READ")}
    />
  );
}
