"use client";

import WorkspaceProgress from "@/components/WorkspaceProgress";
import { can, useMe } from "@/lib/useMe";
import RecruitmentWorkspace from "./RecruitmentWorkspace";

export default function RecruitmentPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading recruitment access…" />;
  }

  const canRecruit = can(me, "RECRUITMENT_MANAGE");

  const canAgents = can(me, "AGENT_MANAGE");

  const canReadApplicants = canRecruit && can(me, "HR_CONFIDENTIAL");

  return (
    <RecruitmentWorkspace
      isCoo={me.role === "coo"}
      key={`${me.id}:${canRecruit}:${canAgents}:${canReadApplicants}`}
      canRecruit={canRecruit}
      canAgents={canAgents}
      canReadApplicants={canReadApplicants}
    />
  );
}
