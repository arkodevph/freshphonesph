import { SquaresFour } from "@phosphor-icons/react/dist/ssr";
import DashboardCards from "./DashboardCards";
import PaymentsCta from "./PaymentsCta";

export default function DashboardPage() {
  return (
    <>
      <header className="glass mb-4 flex items-center justify-between rounded-3xl px-5 py-3.5">
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            System Dashboard
          </h1>
          <p className="text-xs text-ink-soft">Session active</p>
        </div>
      </header>

      <div className="mb-4">
        <DashboardCards />
      </div>

      <section className="glass rounded-3xl p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl chrome">
            <SquaresFour weight="fill" className="h-8 w-8 text-blue" />
          </span>
          <h2 className="font-display text-2xl font-700 tracking-tight text-blue-ink">
            Welcome to the Fresh Phones PH system
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Module screens plug in here as each is built. The first live module is
            Payments &amp; Finance.
          </p>

          <PaymentsCta />
        </div>
      </section>
    </>
  );
}
