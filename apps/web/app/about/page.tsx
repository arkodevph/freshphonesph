import type { Metadata } from "next";
import Image from "next/image";
import {
  CheckCircle,
  Heart,
  MessengerLogo,
  ShieldCheck,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { VerifyAndBenefits } from "@/components/RecentLandingSections";

export const metadata: Metadata = {
  title: "About Us · Fresh Phones PH",
  description:
    "Meet Dale John Garcia Tambong, owner of Fresh Phones PH and FP Gadget Center, and learn what guides the business.",
};

const commitments = [
  {
    icon: ShieldCheck,
    eyebrow: "Legit & accountable",
    title: "A registered local business",
    body: "Fresh Phones PH operates under the DTI-registered business name FP Gadget Center, giving customers a clear business identity behind every transaction.",
    className: "bg-[#3157c8] text-white",
  },
  {
    icon: UsersThree,
    eyebrow: "Customer-first",
    title: "Support that stays human",
    body: "Questions are welcome. From choosing a unit to understanding a payment schedule, our goal is to make every next step easy to follow.",
    className: "bg-[#67d2f1] text-blue-ink",
  },
  {
    icon: CheckCircle,
    eyebrow: "Clear process",
    title: "No confusing surprises",
    body: "We share unit details, requirements, payment options, and availability clearly before a customer commits to a paluwagan plan.",
    className: "bg-[#c7a6ff] text-blue-ink",
  },
  {
    icon: Heart,
    eyebrow: "The Fresh Phones way",
    title: "Gadgets made manageable",
    body: "The business is built around a simple purpose: help more Filipinos work toward a quality iPhone or iPad through manageable payment options.",
    className: "bg-[#ff92c8] text-blue-ink",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="top" className="overflow-hidden pt-24">
        <section className="relative px-4 pb-10 pt-4 sm:px-6 sm:pb-16">
          <div className="pointer-events-none absolute left-[3%] top-[8%] h-52 w-52 rounded-full bg-bubblegum/20 blur-3xl" />
          <div className="pointer-events-none absolute right-[5%] top-0 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <div className="relative z-10 grid min-h-[720px] items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
              <div className="max-w-xl py-4 lg:pl-3">
                <p className="flex items-center gap-2 text-xs font-800 uppercase tracking-[.2em] text-blue">
                  <Sparkle weight="fill" /> Meet the owner
                </p>
                <h1 className="mt-4 font-display text-4xl font-700 leading-[.98] text-blue-ink sm:text-6xl">
                  A business built on <span className="holo-text">trust.</span>
                </h1>
                <p className="mt-5 text-base font-600 leading-relaxed text-ink-soft sm:text-lg">
                  Fresh Phones PH is owned by <strong className="text-blue-ink">Mr. Dale John Garcia Tambong</strong> and operates under the DTI-registered business name FP Gadget Center.
                </p>
                <a
                  href="#our-story"
                  className="btn-candy mt-7 inline-flex rounded-full px-6 py-3 font-800"
                >
                  Get to know us
                </a>
              </div>
              <div className="relative mx-auto min-h-[650px] w-full max-w-[560px] self-end overflow-hidden rounded-[2.25rem] bg-[#394ba4] text-white">
                <div className="absolute left-8 top-8 z-30 max-w-xs">
                  <p className="text-xs font-800 uppercase tracking-[.18em] text-cyan">Fresh Phones PH</p>
                  <h2 className="mt-3 font-display text-3xl font-700 leading-tight">Meet the person behind the promise.</h2>
                </div>
                <div className="absolute -left-14 top-40 z-0 w-48 opacity-80 sm:w-60">
                  <Image
                    src="/about/glass-bubble.webp"
                    alt=""
                    width={1248}
                    height={1248}
                    className="h-auto w-full opacity-75"
                  />
                </div>
                <div className="absolute -right-10 top-48 z-20 w-36 sm:w-44">
                  <Image
                    src="/about/glossy-heart.webp"
                    alt=""
                    width={1248}
                    height={1248}
                    className="h-auto w-full drop-shadow-[0_20px_24px_rgba(255,95,168,.28)]"
                  />
                </div>
                <div className="absolute right-8 top-8 z-20 w-20 sm:w-24">
                  <Image
                    src="/about/chrome-sparkle.webp"
                    alt=""
                    width={1248}
                    height={1248}
                    className="h-auto w-full drop-shadow-[0_18px_22px_rgba(47,107,255,.2)]"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 h-[78%]">
                  <Image
                    src="/about/dale-tambong-cutout-v2.webp"
                    alt="Dale John Garcia Tambong, owner of Fresh Phones PH"
                    fill
                    priority
                    sizes="(max-width: 1024px) 90vw, 680px"
                    className="object-contain object-bottom"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[#394ba4] to-transparent" />
                <p className="absolute bottom-5 left-7 z-30 font-display text-xl font-700">Dale John Garcia Tambong</p>
              </div>
            </div>
          </div>
        </section>

        <section id="our-story" className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl sm:mb-14">
              <p className="text-xs font-800 uppercase tracking-[.22em] text-blue">What we stand for</p>
              <h2 className="mt-3 font-display text-4xl font-700 leading-tight text-blue-ink sm:text-6xl">
                Four promises behind every <span className="holo-text">Fresh Phone.</span>
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {commitments.map((item, index) => (
                <article
                  key={item.title}
                  className={`${item.className} relative flex min-h-[440px] flex-col overflow-hidden rounded-[2rem] p-7 sm:min-h-[480px] sm:p-8`}
                >
                  {index === 0 && (
                    <>
                      <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full border-[38px] border-white/16" />
                      <div className="absolute bottom-24 right-7 h-20 w-20 rounded-full bg-cyan/25" />
                    </>
                  )}
                  {index === 1 && (
                    <>
                      <div className="absolute -bottom-28 -left-20 h-72 w-72 rotate-45 rounded-[4rem] bg-white/14" />
                      <div className="absolute bottom-28 right-5 h-24 w-12 rotate-[35deg] rounded-full bg-blue/20" />
                      <div className="absolute bottom-40 right-20 h-16 w-9 rotate-[35deg] rounded-full bg-white/25" />
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <div className="absolute -bottom-16 left-1/2 h-52 w-52 -translate-x-1/2 rotate-45 rounded-[2.5rem] border-[28px] border-white/18" />
                      <div className="absolute bottom-36 left-8 h-14 w-14 rotate-45 bg-blue/12" />
                    </>
                  )}
                  {index === 3 && (
                    <>
                      <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-[48%_52%_0_0] bg-white/15" />
                      <div className="absolute bottom-16 left-0 h-20 w-full -rotate-6 bg-hotpink/22" />
                    </>
                  )}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-800 uppercase tracking-[.16em] opacity-80">{item.eyebrow}</p>
                      <span className="text-5xl font-800 opacity-20">0{index + 1}</span>
                    </div>
                    <h3 className="mt-8 font-display text-3xl font-700 leading-[1.05]">{item.title}</h3>
                    <p className="mt-5 font-600 leading-relaxed opacity-85">{item.body}</p>
                  </div>
                  <div
                    className={`relative z-10 mt-auto flex ${
                      index === 0
                        ? "justify-start"
                        : index === 1
                          ? "justify-end"
                          : index === 2
                            ? "justify-center"
                            : "justify-start"
                    }`}
                  >
                    <item.icon
                      weight={index === 1 ? "fill" : "duotone"}
                      className={`${index === 3 ? "h-24 w-24" : "h-20 w-20"} ${index === 1 ? "rounded-full bg-white/30 p-4" : ""}`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <VerifyAndBenefits />

        <section className="px-4 py-12 sm:px-6 sm:py-20">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] bg-blue-ink px-7 py-14 text-white sm:px-12 sm:py-20">
            <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full border-[56px] border-cyan/15" />
            <div className="relative z-10 max-w-3xl">
              <p className="text-xs font-800 uppercase tracking-[.22em] text-cyan">Talk to the official page</p>
              <h2 className="mt-4 font-display text-4xl font-700 leading-tight sm:text-6xl">Ready to ask about your next device?</h2>
              <p className="mt-5 max-w-2xl text-lg font-600 leading-relaxed text-white/75">
                Message Fresh Phones PH directly for current units, plan requirements, and available payment schedules.
              </p>
              <a
                href="https://m.me/FreshPhonesPh"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-800 text-blue-ink transition-transform hover:-translate-y-0.5"
              >
                <MessengerLogo weight="fill" className="h-5 w-5" /> Open Messenger
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
