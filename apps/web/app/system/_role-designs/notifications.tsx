"use client";

import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () =>
      import("@/app/system/_role-designs/system_admin/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  coo: dynamic(
    () =>
      import("@/app/system/_role-designs/coo/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  batch_manager: dynamic(
    () =>
      import("@/app/system/_role-designs/batch_manager/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  hr_payroll: dynamic(
    () =>
      import("@/app/system/_role-designs/hr_payroll/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  finance_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/finance_officer/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  records: dynamic(
    () =>
      import("@/app/system/_role-designs/records/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  kpi_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/kpi_officer/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  operations_coordinator: dynamic(
    () =>
      import("@/app/system/_role-designs/operations_coordinator/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  csr: dynamic(
    () =>
      import("@/app/system/_role-designs/csr/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  pioneer_agent: dynamic(
    () =>
      import("@/app/system/_role-designs/pioneer_agent/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  agent: dynamic(
    () =>
      import("@/app/system/_role-designs/agent/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  batch_handler: dynamic(
    () =>
      import("@/app/system/_role-designs/batch_handler/app/system/notifications/page"),
    { loading: RoleDesignLoading },
  ),
  analytics: dynamic(
    () =>
      import("@/app/system/_role-designs/analytics/app/system/notifications/page"),
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
