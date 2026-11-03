"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import PortalDashboard from "./PortalDashboard";
import { portalNav } from "./portal-view";

// Layout ownership preserves navigation and loaded records between sections.
function PortalWorkspaceContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const request = useSearchParams().get("request") ?? undefined;

  const sectionId =
    pathname === "/portal" ? "overview" : pathname.split("/")[2];

  const section = portalNav.find((item) => item.id === sectionId);

  if (!section) {
    return children;
  }

  return <PortalDashboard section={section.id} withdrawalRequestId={request} />;
}

export default function PortalWorkspace({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalWorkspaceContent>{children}</PortalWorkspaceContent>
    </Suspense>
  );
}
