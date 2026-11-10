import EnrollmentHome, { type EnrollmentView } from "./EnrollmentHome";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    request?: string | string[];
    application?: string | string[];
    view?: string | string[];
  }>;
}) {
  const { request, application, view } = await searchParams;

  const selected: EnrollmentView | undefined =
    typeof application === "string"
      ? "applications"
      : typeof request === "string"
        ? "requests"
        : view === "requests" || view === "applications" || view === "form"
          ? view
          : undefined;

  return (
    <EnrollmentHome
      view={selected}
      requestId={typeof request === "string" ? request : undefined}
      applicationId={typeof application === "string" ? application : undefined}
    />
  );
}
