import type { RecordHistoryEntry } from '@freshphones/contracts';

const fields = {
  batch: { code: 'Batch number', model: 'Unit / model', status: 'Status', contractPrice: 'Contract price (PHP)',
    installmentCount: 'Installments', cadence: 'Cadence', startDate: 'Start date', endDate: 'End date',
    handlerId: 'Handler', agentId: 'Agent' },
  client: { name: 'Full name', email: 'Contact email', phone: 'Contact number', batchId: 'Batch',
    unitModel: 'Unit / model', status: 'Status', joinedAt: 'Joined date', releaseStatus: 'Release status' },
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
function value(snapshot: Record<string, unknown>, key: string) {
  const raw = snapshot[key];
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  if (['startDate', 'endDate', 'joinedAt', 'collectionDate'].includes(key)) return String(raw).slice(0, 10);
  // Prisma's JSON decimal snapshots may omit trailing zeroes.
  if (key === 'contractPrice') return String(raw).replace(/^(\d+)$/, '$1.00').replace(/^(\d+\.\d)$/, '$10');
  return String(raw);
}

/** Project only approved record fields; never return raw audit snapshots to the browser. */
export function historyChanges(entity: 'batch' | 'client', action: string, before: unknown, after: unknown): RecordHistoryEntry['changes'] {
  const previous = object(before);
  const next = object(after);
  if (action === 'schedule.generated') return [{ field: 'schedule', label: 'Installment schedule', before: null,
    after: `${Array.isArray(next.items) ? next.items.length : 0} installments issued` }];
  const selected = action === 'release.updated'
    ? { releaseStatus: 'Release status', note: 'Release note', collectionDate: 'Collection date' }
    : fields[entity];
  return Object.entries(selected).flatMap(([field, label]) => {
    const oldValue = value(previous, field);
    const newValue = action === 'release.updated' && field === 'releaseStatus' ? value(next, 'status') : value(next, field);
    if (oldValue === newValue) return [];
    const display = (snapshot: Record<string, unknown>, raw: string | null) => {
      if (!raw) return raw;
      if (field === 'batchId') return value(object(snapshot.batch), 'code') ?? raw;
      if (field === 'handlerId') return value(object(snapshot.handler), 'name') ?? raw;
      if (field === 'agentId') return value(object(snapshot.agent), 'name') ?? raw;
      return raw;
    };
    return [{ field, label,
      before: display(previous, oldValue), after: display(next, newValue) }];
  });
}
