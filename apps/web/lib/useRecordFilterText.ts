"use client";

import { useEffect, useState } from 'react';
import type { RecordFiltersValue } from './record-filters';

export function useRecordFilterText(value: RecordFiltersValue) {
  const q = value.q.trim(), model = value.model.trim();
  const [text, setText] = useState({ q, model });
  useEffect(() => {
    const timer = setTimeout(() => setText({ q, model }), 300);
    return () => clearTimeout(timer);
  }, [q, model]);
  return { ...text, pending: text.q !== q || text.model !== model };
}
