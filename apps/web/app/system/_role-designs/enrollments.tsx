"use client";

import CooPage from "@/app/system/_role-designs/coo/app/system/enrollments/EnrollmentHome";
import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () => {
      return import("@/app/system/_role-designs/system_admin/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
  coo: CooPage,
  batch_manager: dynamic(
    () => {
      return import("@/app/system/_role-designs/batch_manager/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
  records: dynamic(
    () => {
      return import("@/app/system/_role-designs/records/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
  operations_coordinator: dynamic(
    () => {
      return import("@/app/system/_role-designs/operations_coordinator/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
  pioneer_agent: dynamic(
    () => {
      return import("@/app/system/_role-designs/pioneer_agent/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
  agent: dynamic(
    () => {
      return import("@/app/system/_role-designs/agent/app/system/enrollments/EnrollmentHome");
    },
    { loading: RoleDesignLoading },
  ),
};

export default function RolePage(props: {
  view?: "requests" | "applications" | "form";
  requestId?: string;
  applicationId?: string;
}) {
  const me = useMe();

  if (!me) {
    return <RoleDesignLoading />;
  }

  const role = workspaceDesignRole(me.role);

  const View = role && role in views ? views[role as keyof typeof views] : null;

  if (!View) {
    return <p role="alert">No access to this workspace.</p>;
  }

  return <View key={me.id + ":" + role} {...props} />;
}
