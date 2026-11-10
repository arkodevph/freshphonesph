import type { Metadata } from "next";
import Link from "@/components/PublicNavigationLink";
import AgentVerification from "@/components/AgentVerification";
export const metadata: Metadata = {
  title: "Verify an agent · Fresh Phones PH",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5">
      <Link href="/v2" className="text-sm font-700 text-blue-ink">
        ← Back to Fresh Phones PH
      </Link>
      <header className="mb-8 mt-6">
        <p className="text-sm font-700 text-blue">Verify before you transact</p>
        <h1 className="mt-3 text-4xl font-800 text-blue-ink">
          Check your agent.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Confirm an agent by their complete name or code. Only their name,
          masked code and active status are shown.
        </p>
      </header>
      <AgentVerification />
    </main>
  );
}
