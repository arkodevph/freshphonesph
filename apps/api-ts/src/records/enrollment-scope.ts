import { businessRole, type User } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";
import { batchScope, staffScope } from "./scope";

/** Current submitter scope, shared by request lists and overview aggregates. */
export function enrollmentScope(
  user: User,
): Prisma.EnrollmentRequestWhereInput {
  const role = businessRole(user.role);

  if (role === "SYSTEM_ADMIN" || role === "COO") {
    return {};
  }

  if (role === "BATCH_MANAGER") {
    return { batch: batchScope(user) };
  }

  if (role === "PIONEER_AGENT" || role === "OPERATIONS_COORDINATOR") {
    return { submittedBy: { ...staffScope(user), role: "AGENT" } };
  }

  return { submittedById: user.id };
}
