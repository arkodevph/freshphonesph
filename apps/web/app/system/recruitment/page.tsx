"use client";

import { can, useMe } from "@/lib/useMe";
import RecruitmentWorkspace from "./RecruitmentWorkspace";

export default function RecruitmentPage() {
  const me = useMe();
  if (!me) return <p role="status">Loading recruitment access…</p>;
  const canRecruit = can(me, "RECRUITMENT_MANAGE");
  const canAgents = can(me, "AGENT_MANAGE");
  const canReadApplicants = canRecruit && can(me, "HR_CONFIDENTIAL");
  return <RecruitmentWorkspace key={`${me.id}:${canRecruit}:${canAgents}:${canReadApplicants}`} canRecruit={canRecruit} canAgents={canAgents} canReadApplicants={canReadApplicants} />;
}
