"use client";

import { useId } from 'react';
import type { RecordFiltersValue } from '@/lib/record-filters';
import { AssignmentFilters } from './AssignmentFilters';
import styles from './record-filters.module.css';

export function RecordFilters({ kind, value, onChange, onClear, onRefresh, loading, error, hasContext = false }: {
  kind: 'batch' | 'client'; value: RecordFiltersValue;
  onChange: (key: keyof RecordFiltersValue, value: string) => void;
  onClear: () => void; onRefresh: () => void; loading: boolean; error: string | null; hasContext?: boolean;
}) {
  const id = useId();
  const noun = kind === 'batch' ? 'batches' : 'clients';
  const date = kind === 'batch' ? 'Batch start' : 'Joined';
  const statuses = kind === 'batch' ? [['PLANNED', 'Forming'], ['ACTIVE', 'Active'], ['COMPLETED', 'Closed'], ['CANCELLED', 'Cancelled']]
    : [['ACTIVE', 'Active'], ['ON_HOLD', 'On hold'], ['COMPLETED', 'Completed']];
  const input = (key: 'q' | 'model' | 'dateFrom' | 'dateTo', label: string, placeholder = '') =>
    <label className={styles.field} htmlFor={`${id}-${key}`}>
      <span>{label}</span><input id={`${id}-${key}`} type={key.startsWith('date') ? 'date' : 'search'} value={value[key]}
        maxLength={key === 'q' || key === 'model' ? 100 : undefined} placeholder={placeholder}
        aria-invalid={key.startsWith('date') && error ? true : undefined}
        aria-describedby={key.startsWith('date') && error ? `${id}-error` : undefined}
        onChange={event => onChange(key, event.target.value)} />
    </label>;
  return <section aria-label={`${kind === 'batch' ? 'Batch' : 'Client'} filters`} className={styles.panel}>
    <div className={styles.heading}><h2>Filter {noun}</h2><div className={styles.actions}>
      <button type="button" onClick={onClear} disabled={!hasContext && !Object.values(value).some(Boolean)}>Clear filters</button>
      <button type="button" onClick={onRefresh} disabled={loading || Boolean(error)}>Refresh {noun}</button>
    </div></div>
    <div className={styles.grid}>
      {input('q', `Search ${noun}`, kind === 'batch' ? 'Batch number or model' : 'Name, email, phone or batch number')}
      {input('model', 'Filter by unit / model', 'e.g. iPhone 15')}
      <label className={styles.field} htmlFor={`${id}-status`}><span id={`${id}-status-label`}>Filter by status</span>
        <select id={`${id}-status`} aria-labelledby={`${id}-status-label`} value={value.status} onChange={event => onChange('status', event.target.value)}>
          <option value="">All statuses</option>{statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      {input('dateFrom', `${date} from`)}{input('dateTo', `${date} to`)}
    </div>
    <p className={styles.help}>Dates include both endpoints and use {kind === 'batch' ? 'the batch start date' : 'the client joined date'}. Unit/model matches part of the unit name.</p>
    {error && <p id={`${id}-error`} role="alert" className={styles.error}>{error}</p>}
    <AssignmentFilters handlerId={value.handlerId} agentId={value.agentId} onChange={onChange} />
  </section>;
}
