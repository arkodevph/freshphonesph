import type {
  NetworkAgent,
  NetworkBatch,
  NetworkEnrollmentPage,
  NetworkPage,
} from "@freshphones/contracts";
import { tsRequest } from "@/lib/ts-api";

export const readNetworkAgents = (query: string) => {
  return tsRequest<NetworkPage<NetworkAgent>>(`/agent-network/agents?${query}`);
};

export const readNetworkBatches = (query: string) => {
  return tsRequest<NetworkPage<NetworkBatch>>(
    `/agent-network/batches?${query}`,
  );
};

export const readNetworkAgent = (id: string) => {
  return tsRequest<NetworkAgent>(
    `/agent-network/agents/${encodeURIComponent(id)}`,
  );
};

export const readNetworkRequests = (query: string) => {
  return tsRequest<NetworkEnrollmentPage>(`/agent-network/requests?${query}`);
};
