import type { PaymentSortField } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

export function paymentListOrder(query: {
  sortBy?: PaymentSortField;
  sortDirection?: "asc" | "desc";
}): Prisma.PaymentOrderByWithRelationInput[] {
  const direction = query.sortDirection ?? "desc";

  switch (query.sortBy) {
    case "clientName":
      return [{ client: { name: direction } }, { id: direction }];
    case "paymentDate":
      return [{ paymentDate: direction }, { id: direction }];
    default:
      return [{ createdAt: direction }, { id: direction }];
  }
}
