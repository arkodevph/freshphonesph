"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  NetworkAgent,
  NetworkBatch,
  NetworkBatchesQuery,
  NetworkPage,
} from "@freshphones/contracts";
import { useAgentResource } from "@/lib/useAgentResource";
import { batchFilters, batchQuery } from "./batch-query";

export function useAgentBatches() {
  const params = useSearchParams();

  const parsed = batchFilters(params);

  const filter: NetworkBatchesQuery = parsed.success
    ? parsed.data
    : { page: 1, q: "", sort: "code_asc" };

  const [search, setSearch] = useState(filter.q);

  const profile = useAgentResource<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?page=1",
  );

  const batches = useAgentResource<NetworkPage<NetworkBatch>>(
    `/agent-network/batches?${batchQuery(filter)}`,
  );

  useEffect(() => {
    setSearch(filter.q);
  }, [filter.q]);

  function navigate(next: Partial<NetworkBatchesQuery>) {
    const result = batchFilters(
      new URLSearchParams(batchQuery({ ...filter, ...next })),
    );

    if (result.success) {
      window.history.pushState(
        null,
        "",
        `/system/agent-network?${batchQuery(result.data)}`,
      );
    }
  }

  function refresh() {
    void profile.refresh();

    void batches.refresh();
  }

  return {
    filter,
    invalid: !parsed.success,
    search,
    setSearch,
    profile,
    batches,
    navigate,
    refresh,
  };
}
