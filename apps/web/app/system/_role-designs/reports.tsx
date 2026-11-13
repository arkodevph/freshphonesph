"use client";

import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  ceo: dynamic(
    () => import("@/app/system/_role-designs/ceo/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  system_admin: dynamic(
    () =>
      import("@/app/system/_role-designs/system_admin/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  coo: dynamic(
    () => import("@/app/system/_role-designs/coo/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  finance_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/finance_officer/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  kpi_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/kpi_officer/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  csr: dynamic(
    () => import("@/app/system/_role-designs/csr/app/system/reports/page"),
    { loading: RoleDesignLoading },
  ),
  analytics: dynamic(
    () =>
      import("@/app/system/_role-designs/analytics/app/system/reports/page"),
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
