"use client";

import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import { can, useMe } from "@/lib/useMe";
import { InquiriesWorkspace } from "@/app/system/_role-designs/coo/app/system/inquiries/InquiriesWorkspace";

export default function InquiriesPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading inquiry access…" />;
  }

  if (!can(me, "SUPPORT_MANAGE")) {
    return (
      <section>
        <h1>No access</h1>
        <p>Your role cannot view device inquiries.</p>
      </section>
    );
  }

  return <InquiriesWorkspace key={me.id} />;
}
