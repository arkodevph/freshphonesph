"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import PortalDashboard from "./PortalDashboard";
import { portalNav } from "./portal-view";

// Layout ownership preserves navigation and loaded records between sections.
export default function PortalWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const sectionId =
    pathname === "/portal" ? "overview" : pathname.split("/")[2];

  const section = portalNav.find((item) => item.id === sectionId);

  if (!section) {
    return children;
  }

  return <PortalDashboard section={section.id} />;
}
