import type { BatchSortField } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

/** Sort the scoped query before paging; unset monetary terms stay last in either direction. */
export function batchListOrder(query: {
  sortBy?: BatchSortField;
  sortDirection?: "asc" | "desc";
}): Prisma.BatchOrderByWithRelationInput[] {
  const direction = query.sortDirection ?? "desc";

  switch (query.sortBy ?? "createdAt") {
    case "contractPrice":
      return [
        { contractPrice: { sort: direction, nulls: "last" } },
        { id: direction },
      ];
    case "installmentCount":
      return [
        { installmentCount: { sort: direction, nulls: "last" } },
        { id: direction },
      ];
    case "code":
      return [{ code: direction }, { id: direction }];
    case "model":
      return [{ model: direction }, { id: direction }];
    default:
      return [{ createdAt: direction }, { id: direction }];
  }
}
