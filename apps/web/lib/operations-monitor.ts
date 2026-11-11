import type {
  MonitorDetail,
  MonitorFollowUpInput,
  MonitorPage,
  MonitorSource,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";
export function getOperationsMonitor(query: URLSearchParams) {
  return tsRequest<MonitorPage>(`/operations/monitor?${query}`);
}

export function getMonitorDetail(source: MonitorSource, id: string, page = 1) {
  return tsRequest<MonitorDetail>(
    `/operations/monitor/${source}/${id}?page=${page}`,
  );
}

export function saveMonitorFollowUp(
  source: MonitorSource,
  id: string,
  input: MonitorFollowUpInput,
) {
  return tsRequest(`/operations/monitor/${source}/${id}/follow-up`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveMonitorPolicy(version: number, reviewDueHours: number) {
  return tsRequest("/operations/monitor/policy", {
    method: "POST",
    body: JSON.stringify({ version, reviewDueHours }),
  });
}
