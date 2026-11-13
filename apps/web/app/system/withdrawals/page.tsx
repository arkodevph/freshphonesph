import WithdrawalStaffWorkspace from "../_role-designs/withdrawals";

export default async function WithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string | string[] }>;
}) {
  const { request } = await searchParams;

  return (
    <WithdrawalStaffWorkspace
      key={typeof request === "string" ? request : "all"}
      requestId={typeof request === "string" ? request : undefined}
    />
  );
}
