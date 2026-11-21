import CustomerWorkQueues from "@/app/system/_role-designs/finance_officer/app/system/CustomerWorkQueues";

export default function CustomerWorkPage() {
  return (
    <main>
      <header className="glass mb-4 rounded-3xl px-5 py-4">
        <h1 className="mt-1 font-display text-xl font-700 text-blue-ink">
          Ready for Finance
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Eligible payments appear oldest first. Records, assigned Manager and
          required evidence checks must be complete; handed-over memberships are
          read-only.
        </p>
      </header>
      <CustomerWorkQueues />
    </main>
  );
}
