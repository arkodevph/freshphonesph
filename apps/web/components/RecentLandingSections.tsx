import { CalendarCheck, ChatCircleDots, CheckCircle, IdentificationCard, Receipt, ShieldCheck, UserCheck, Wallet } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import AgentVerification from "./AgentVerification";

const trust = [
  [UserCheck, "Verified agents", "Confirm who is officially registered before you transact."],
  [CalendarCheck, "Clear schedules", "Understand each payment amount and expected duration."],
  [ShieldCheck, "Organized records", "A secure foundation for account tracking."],
  [ChatCircleDots, "Human support", "Talk to the Fresh Phones PH team when you need help."],
] as const;

export function Trust() {
  return <section aria-label="Why customers trust us" className="px-4 py-8"><div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">{trust.map(([Icon, title, body]) => <article key={title} className="glass rounded-3xl p-5"><Icon weight="duotone" className="h-7 w-7 text-blue"/><h2 className="mt-3 font-display text-lg font-700 text-blue-ink">{title}</h2><p className="mt-1 text-sm font-500 leading-relaxed text-ink-soft">{body}</p></article>)}</div></section>;
}

const steps = ["Choose your unit", "Review requirements", "Contact Fresh Phones PH", "Application review", "Join an approved batch", "Follow your schedule", "Complete payments", "Receive your unit"];

export function Process() {
  return <section id="how" className="scroll-mt-24 px-4 py-20"><SectionHeading title={<>Paluwagan, made <span className="holo-text">easy to follow</span></>} subtitle="From choosing a phone to receiving your unit, you always know what comes next."/><ol className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{steps.map((step, index) => <li key={step} className="glass flex items-center gap-4 rounded-3xl p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue font-display font-800 text-white">{index + 1}</span><span className="font-display font-700 text-blue-ink">{step}</span></li>)}</ol></section>;
}

const requirements = ["Valid government-issued ID", "Proof of residency", "Proof of income, when applicable", "Recent customer photo", "Contact or reference person", "Other requirements after review"];

export function RequirementsAndPayments() {
  return <><section id="requirements" className="scroll-mt-24 px-4 py-20"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2"><div><SectionHeading center={false} title={<>Simple, clear <span className="holo-text">requirements</span></>} subtitle="Prepare these common items before applying. Final requirements may vary after review."/><ul className="mt-7 grid gap-3 sm:grid-cols-2">{requirements.map((item) => <li key={item} className="glass flex items-center gap-3 rounded-2xl p-4 font-700 text-blue-ink"><CheckCircle weight="fill" className="shrink-0 text-blue"/>{item}</li>)}</ul><p className="mt-4 text-sm font-700 text-ink-soft">Sensitive documents are never uploaded through the public website.</p></div><div className="glass rounded-[2.5rem] p-7 sm:p-9"><Wallet weight="duotone" className="h-10 w-10 text-blue"/><h2 className="mt-4 font-display text-3xl font-700 text-blue-ink">Payments happen through authorized channels.</h2><p className="mt-3 font-500 leading-relaxed text-ink-soft">Payments are coordinated through Fresh Phones PH&apos;s authorized channels and official Messenger group chats.</p><div className="mt-6 rounded-3xl bg-white/65 p-5"><h3 className="font-display text-lg font-700 text-blue-ink">Your portal helps you monitor</h3><p className="mt-2 text-sm font-600 leading-7 text-ink-soft">Payment records · verification status · remaining balance · due dates · paluwagan progress</p></div></div></div></section><section className="px-4 pb-20"><div className="mx-auto flex max-w-6xl flex-col gap-5 rounded-[2.5rem] bg-blue-ink p-7 text-white sm:p-10 lg:flex-row lg:items-center"><Receipt weight="duotone" className="h-12 w-12 shrink-0 text-cyan"/><div><h2 className="font-display text-2xl font-700">Statement of Account</h2><p className="mt-2 max-w-4xl text-sm font-500 leading-relaxed text-white/75">Review amounts due, schedules, verified payments, and remaining balances. Statements are for account reference and are not official BIR invoices.</p></div></div></section></>;
}

export function VerifyAndBenefits() {
  const benefits = [[ShieldCheck, "Transparent process"], [IdentificationCard, "Verified agents"], [CalendarCheck, "Organized paluwagan"], [ChatCircleDots, "Customer support"]] as const;
  return <section id="verify" className="scroll-mt-24 px-4 py-20"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.85fr_1.15fr]"><div><span className="pill inline-flex rounded-full px-4 py-1.5 text-sm font-800 text-blue">VERIFY BEFORE YOU TRANSACT</span><h2 className="mt-4 font-display text-4xl font-700 text-blue-ink">Is your agent official?</h2><p className="mt-3 font-500 leading-relaxed text-ink-soft">Enter their complete name or Agent ID before transacting. Private contact and identity records are never displayed.</p></div><AgentVerification /></div><div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(([Icon, title]) => <article key={title} className="rounded-3xl bg-white/55 p-5"><Icon className="h-7 w-7 text-blue" weight="duotone"/><h3 className="mt-3 font-display text-lg font-700 text-blue-ink">{title}</h3><p className="mt-1 text-sm font-500 text-ink-soft">Clear, human guidance designed to keep customers informed.</p></article>)}</div></section>;
}
