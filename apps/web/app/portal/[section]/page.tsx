import { notFound } from "next/navigation";
import PortalDashboard, { type PortalSection } from "../PortalDashboard";

const sections: PortalSection[] = [
  "membership",
  "schedule",
  "payments",
  "documents",
  "release",
  "notifications",
  "support",
  "withdrawals",
  "settings",
];

export function generateStaticParams() {
  return sections.map((section) => {
    return { section };
  });
}

export default async function PortalSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ request?: string | string[] }>;
}) {
  const { section } = await params;

  if (
    !sections.some((item) => {
      return item === section;
    })
  ) {
    notFound();
  }

  const { request } = await searchParams;

  return (
    <PortalDashboard
      section={section as PortalSection}
      withdrawalRequestId={typeof request === "string" ? request : undefined}
    />
  );
}
