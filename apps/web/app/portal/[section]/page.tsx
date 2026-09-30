import { notFound } from "next/navigation";
import { TYPESCRIPT_API } from "@/lib/backend";
import PortalDashboard, { type PortalSection } from "../PortalDashboard";

const sections: PortalSection[] = ["membership", "schedule", "payments", "documents", "release", "notifications", "support", "settings"];

export default async function PortalSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.some((item) => item === section) || (!TYPESCRIPT_API && ["documents", "notifications"].includes(section))) notFound();
  return <PortalDashboard section={section as PortalSection} />;
}
