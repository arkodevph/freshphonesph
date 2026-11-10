import { businessRole, type User } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

/** Intersect filters with this scope; a requested handler ID never replaces it. */
export function batchScope(user: User): Prisma.BatchWhereInput {
  switch (businessRole(user.role)) {
    case "SYSTEM_ADMIN":
    case "COO":
    case "RECORDS":
    case "FINANCE_OFFICER":
      return {};
    case "BATCH_HANDLER":
      return { handlerId: user.id };
    case "BATCH_MANAGER":
      return { managerId: user.id };
    case "AGENT":
      return {
        agent: {
          active: true,
          account: { id: user.id, active: true, role: "AGENT" },
        },
      };
    case "PIONEER_AGENT":
      return {
        agent: {
          active: true,
          account: { active: true, role: "AGENT", supervisorId: user.id },
        },
      };
    case "OPERATIONS_COORDINATOR":
      return {
        agent: {
          active: true,
          account: {
            active: true,
            role: "AGENT",
            supervisor: {
              active: true,
              role: "PIONEER_AGENT",
              supervisorId: user.id,
            },
          },
        },
      };
    case "CUSTOMER":
      return {
        clients: {
          some: { id: user.clientId ?? "00000000-0000-0000-0000-000000000000" },
        },
      };
    default:
      return { id: "00000000-0000-0000-0000-000000000000" };
  }
}

export function clientScope(user: User): Prisma.ClientWhereInput {
  if (user.role === "CUSTOMER") {
    return {
      AND: [{ id: user.clientId ?? "00000000-0000-0000-0000-000000000000" }],
    };
  }

  return { batch: batchScope(user) };
}

export function staffScope(
  user: Pick<User, "id" | "role">,
): Prisma.UserWhereInput {
  const role = businessRole(user.role);

  const businessStaff = {
    active: true,
    role: { notIn: ["SYSTEM_ADMIN", "CEO", "CUSTOMER"] as User["role"][] },
  };

  switch (role) {
    case "SYSTEM_ADMIN":
      return { active: true, role: { notIn: ["CEO", "CUSTOMER"] } };
    case "COO":
    case "HR_PAYROLL":
    case "KPI_OFFICER":
      return businessStaff;
    case "BATCH_MANAGER":
      return {
        ...businessStaff,
        OR: [
          { id: user.id },
          { supervisorId: user.id },
          { handledBatches: { some: { managerId: user.id } } },
        ],
      };
    case "OPERATIONS_COORDINATOR":
      return {
        ...businessStaff,
        OR: [
          { id: user.id },
          { supervisorId: user.id },
          { supervisor: { active: true, supervisorId: user.id } },
        ],
      };
    case "PIONEER_AGENT":
      return {
        ...businessStaff,
        OR: [{ id: user.id }, { role: "AGENT", supervisorId: user.id }],
      };
    case "RECORDS":
    case "FINANCE_OFFICER":
      return { ...businessStaff, role: user.role };
    default:
      return { AND: [{ id: user.id, active: true }] };
  }
}

export function taskScope(
  user: Pick<User, "id" | "role"> & { hrConfidentialAccess?: boolean },
): Prisma.TaskWhereInput {
  const role = businessRole(user.role);

  if (role === "SYSTEM_ADMIN") {
    return { assignee: { role: { notIn: ["CEO", "CUSTOMER"] } } };
  }

  if (
    ["COO", "KPI_OFFICER"].includes(role) ||
    (role === "HR_PAYROLL" && user.hrConfidentialAccess === true)
  ) {
    return {
      assignee: { role: { notIn: ["SYSTEM_ADMIN", "CEO", "CUSTOMER"] } },
    };
  }

  if (
    [
      "BATCH_MANAGER",
      "OPERATIONS_COORDINATOR",
      "PIONEER_AGENT",
      "RECORDS",
      "FINANCE_OFFICER",
    ].includes(role)
  ) {
    return { assignee: staffScope(user) };
  }

  return { assigneeId: user.id };
}
