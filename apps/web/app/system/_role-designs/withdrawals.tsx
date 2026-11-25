"use client";

import dynamic from "next/dynamic";
import { WithdrawalStaffWorkspace as CooWithdrawalWorkspace } from "@/app/system/_role-designs/coo/components/withdrawals/WithdrawalStaffWorkspace";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";

const views = {
  system_admin: dynamic(
    () => {
      return import("@/app/system/_role-designs/system_admin/components/withdrawals/WithdrawalStaffWorkspace").then(
        (module) => {
          return module.WithdrawalStaffWorkspace;
        },
      );
    },
    { loading: RoleDesignLoading },
  ),
  coo: CooWithdrawalWorkspace,
  batch_manager: dynamic(
    () => {
      return import("@/app/system/_role-designs/batch_manager/components/withdrawals/WithdrawalStaffWorkspace").then(
        (module) => {
          return module.WithdrawalStaffWorkspace;
        },
      );
    },
    { loading: RoleDesignLoading },
  ),
  finance_officer: dynamic(
    () => {
      return import("@/app/system/_role-designs/finance_officer/components/withdrawals/WithdrawalStaffWorkspace").then(
        (module) => {
          return module.WithdrawalStaffWorkspace;
        },
      );
    },
    { loading: RoleDesignLoading },
  ),
  agent: dynamic(
    () => {
      return import("@/app/system/_role-designs/agent/components/withdrawals/WithdrawalStaffWorkspace").then(
        (module) => {
          return module.WithdrawalStaffWorkspace;
        },
      );
    },
    { loading: RoleDesignLoading },
  ),
};

export default function RolePage(props: {
  requestId?: string;
  refundOnly?: boolean;
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
