import RoleWorkspace from "../RoleWorkspace";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ request?: string | string[] }>;
}) {
  const { request } = await searchParams;

  return (
    <RoleWorkspace
      key={typeof request === "string" ? request : "all"}
      section="enrollments"
      requestId={typeof request === "string" ? request : undefined}
    />
  );
}
