"use client";

import { SkeletonLine } from "@/components/WorkspaceProgress";

export default function RoleDesignLoading() {
  return (
    <div
      role="status"
      aria-label="Loading workspace…"
      aria-busy="true"
      style={{ display: "grid", gap: 20, paddingBlock: 16 }}
    >
      <SkeletonLine width="24ch" />
      <SkeletonLine width="100%" />
      <SkeletonLine width="80%" />
    </div>
  );
}
