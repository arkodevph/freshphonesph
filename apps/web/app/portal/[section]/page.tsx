import { notFound } from "next/navigation";
import { type PortalSection } from "../portal-view";

const sections: PortalSection[] = [
  "catalog",
  "membership",
  "schedule",
  "payments",
  "documents",
  "release",
  "notifications",
  "support",
  "settings",
];

export default async function PortalSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (
    !sections.some((item) => {
      return item === section;
    })
  ) {
    notFound();
  }

  return null;
}
