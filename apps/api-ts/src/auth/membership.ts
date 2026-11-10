import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { User } from "@freshphones/contracts";
import type { Database } from "../database";

/** A request-local selection; never mutate the login's primary membership. */
export async function selectMembership(
  db: Pick<Database, "client">,
  user: User,
  clientId: string,
): Promise<User> {
  if (user.role !== "CUSTOMER") {
    throw new ForbiddenException("A customer account is required.");
  }

  const membership = await db.client.findFirst({
    where: {
      id: clientId,
      retentionErasedAt: null,
      member: { account: { id: user.id, active: true, role: "CUSTOMER" } },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new NotFoundException(
      "Membership not found. Choose one of your batches.",
    );
  }

  return { ...user, clientId: membership.id };
}
