import CustomerWorkQueues from "../CustomerWorkQueues";

export default function CustomerWorkPage() {
  return <main>
    <header className="glass mb-4 rounded-3xl px-5 py-4">
      <p className="text-xs font-700 uppercase tracking-widest text-violet-700">Daily follow-up</p>
      <h1 className="mt-1 font-display text-xl font-700 text-blue-ink">Customer work queue</h1>
      <p className="mt-1 text-sm text-ink-soft">Oldest staff-owned items appear first. Waiting times show time since the last case update, document upload, or payment record; they are not promised response times.</p>
    </header>
    <CustomerWorkQueues />
  </main>;
}
