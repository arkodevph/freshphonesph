import type { ClientSortField } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

export function clientListOrder(query: {
  sortBy?: ClientSortField;
  sortDirection?: "asc" | "desc";
}): Prisma.ClientOrderByWithRelationInput[] {
  const direction = query.sortDirection ?? "desc";

  switch (query.sortBy) {
    case "name":
      return [{ name: direction }, { id: direction }];
    case "batchCode":
      return [{ batch: { code: direction } }, { id: direction }];
    default:
      return [{ createdAt: direction }, { id: direction }];
  }
}
