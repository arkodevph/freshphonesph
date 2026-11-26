"use client";

import CooPage from "@/app/system/_role-designs/coo/app/system/notification-settings/page";
import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () => {
      return import("@/app/system/_role-designs/system_admin/app/system/notification-settings/page");
    },
    { loading: RoleDesignLoading },
  ),
  coo: CooPage,
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
