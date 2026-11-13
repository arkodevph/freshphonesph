"use client";

import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () =>
      import("@/app/system/_role-designs/system_admin/app/system/customer-work/page"),
    { loading: RoleDesignLoading },
  ),
  coo: dynamic(
    () =>
      import("@/app/system/_role-designs/coo/app/system/customer-work/page"),
    { loading: RoleDesignLoading },
  ),
  finance_officer: dynamic(
    () =>
      import("@/app/system/_role-designs/finance_officer/app/system/customer-work/page"),
    { loading: RoleDesignLoading },
  ),
  records: dynamic(
    () =>
      import("@/app/system/_role-designs/records/app/system/customer-work/page"),
    { loading: RoleDesignLoading },
  ),
  csr: dynamic(
    () =>
      import("@/app/system/_role-designs/csr/app/system/customer-work/page"),
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
