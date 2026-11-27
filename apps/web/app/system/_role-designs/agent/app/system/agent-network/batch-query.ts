import {
  networkBatchesQuery,
  type NetworkBatchesQuery,
} from "@freshphones/contracts";

export function batchFilters(params: Pick<URLSearchParams, "get">) {
  return networkBatchesQuery.safeParse({
    page: params.get("page") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });
}

export function batchQuery(values: NetworkBatchesQuery) {
  const query = new URLSearchParams({
    page: String(values.page),
    sort: values.sort,
  });

  if (values.q) {
    query.set("q", values.q);
  }

  return query.toString();
}
