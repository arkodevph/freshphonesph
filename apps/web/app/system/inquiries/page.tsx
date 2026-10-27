"use client";

import { can, useMe } from "@/lib/useMe";
import { InquiriesWorkspace } from "./InquiriesWorkspace";

export default function InquiriesPage() {
  const me = useMe();

  if (!me) {
    return <p role="status">Loading inquiry access…</p>;
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
