import WithdrawalStaffWorkspace from "../_role-designs/withdrawals";

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    request?: string | string[];
    refund?: string | string[];
  }>;
}) {
  const { request, refund } = await searchParams;

  return (
    <WithdrawalStaffWorkspace
      key={`${typeof request === "string" ? request : "all"}:${refund === "outstanding"}`}
      refundOnly={refund === "outstanding"}
      requestId={typeof request === "string" ? request : undefined}
    />
  );
}
