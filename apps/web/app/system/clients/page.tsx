import { Suspense } from 'react';
import ClientsDashboard from './ClientsDashboard';

export default function ClientsPage() {
  return <Suspense fallback={<p className="p-5 text-sm text-ink-soft">Loading clients…</p>}><ClientsDashboard /></Suspense>;
}
