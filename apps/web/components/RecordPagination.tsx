export function RecordPagination({ page, hasNext, loading, onPage, total, pageSize = 20 }: {
  page: number; hasNext: boolean; loading: boolean; onPage: (page: number) => void; total?: number; pageSize?: number;
}) {
  return (
    <nav aria-label="Record pages" className="mt-3 flex items-center justify-end gap-3 text-sm text-blue-ink">
      <button disabled={loading || page === 1} onClick={() => onPage(page - 1)} className="rounded-full bg-white/70 px-3 py-2 disabled:opacity-40">Previous</button>
      <span>Page {page}{total === undefined ? '' : ` of ${Math.max(1, Math.ceil(total / pageSize))}`}</span>
      <button disabled={loading || !hasNext} onClick={() => onPage(page + 1)} className="rounded-full bg-white/70 px-3 py-2 disabled:opacity-40">Next</button>
    </nav>
  );
}
