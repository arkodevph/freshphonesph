"use client";

import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () =>
      import("@/app/system/_role-designs/system_admin/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
  coo: dynamic(
    () => import("@/app/system/_role-designs/coo/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
  hr_payroll: dynamic(
    () =>
      import("@/app/system/_role-designs/hr_payroll/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
  kpi_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/kpi_officer/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
  operations_coordinator: dynamic(
    () =>
      import("@/app/system/_role-designs/operations_coordinator/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
  pioneer_agent: dynamic(
    () =>
      import("@/app/system/_role-designs/pioneer_agent/app/system/personnel/page"),
    { loading: RoleDesignLoading },
  ),
};

export default function RolePage(props: Record<string, never>) {
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
