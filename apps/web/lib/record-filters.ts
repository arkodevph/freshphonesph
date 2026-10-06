import { batchListQuerySchema, clientListQuerySchema } from '@freshphones/contracts';

export type RecordFiltersValue = { q: string; model: string; status: string; dateFrom: string; dateTo: string; handlerId: string; agentId: string };
export const emptyRecordFilters: RecordFiltersValue = { q: '', model: '', status: '', dateFrom: '', dateTo: '', handlerId: '', agentId: '' };

export function recordFilterQuery(kind: 'batch' | 'client', value: RecordFiltersValue, page: number, batchId = '') {
  const params: Record<string, string> = { page: String(page), q: value.q.trim() };
  for (const key of ['model', 'status', 'dateFrom', 'dateTo', 'handlerId', 'agentId'] as const) {
    const entry = value[key].trim();
    if (entry) params[key] = entry;
  }
  if (kind === 'client' && batchId) params.batchId = batchId;
  const result = (kind === 'batch' ? batchListQuerySchema : clientListQuerySchema).safeParse(params);
  return result.success ? { params, error: null } : { params: null, error: result.error.issues.map(issue => issue.message).join(' ') };
}
