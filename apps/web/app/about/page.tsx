import type { Metadata } from "next";
import Image from "next/image";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { VerifyAndBenefits } from "@/components/RecentLandingSections";
import AboutContactCard from "@/components/AboutContactCard";
import AboutPromises from "@/components/AboutPromises";
import styles from "@/components/about-page.module.css";
import { landingV2Font } from "@/components/font";
import typography from "@/components/typography.module.css";
import "@/components/landing-v2.css";

export const metadata: Metadata = {
  title: "About Us · Fresh Phones PH",
  description:
    "Meet Dale John Garcia Tambong, owner of Fresh Phones PH and FP Gadget Center, and learn what guides the business.",
};

export default function AboutPage() {
  return (
    <div
      data-landing-version="2"
      className={`${styles.page} ${landingV2Font.variable} ${typography.root}`}
    >
      <Navbar />
      <main id="top" className={styles.main}>
        <section className="relative px-4 pb-10 pt-4 sm:px-6 sm:pb-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[3%] top-[8%] h-52 w-52 rounded-full bg-cyan/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[5%] top-0 h-72 w-72 rounded-full bg-cyan/20 blur-3xl"
          />
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
                  Fresh Phones PH is owned by{" "}
                  <strong className="text-blue-ink">
                    Mr. Dale John Garcia Tambong
                  </strong>{" "}
                  and operates under the DTI-registered business name FP Gadget
                  Center.
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
                  <p className="text-xs font-800 uppercase tracking-[.18em] text-cyan">
                    Fresh Phones PH
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-700 leading-tight">
                    Meet the person behind the promise.
                  </h2>
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
                <p className="absolute bottom-5 left-7 z-30 font-display text-xl font-700">
                  Dale John Garcia Tambong
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="our-story"
          className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl sm:mb-14">
              <p className="text-xs font-800 uppercase tracking-[.22em] text-blue">
                What we stand for
              </p>
              <h2 className="mt-3 font-display text-4xl font-700 leading-tight text-blue-ink sm:text-6xl">
                Four promises behind every{" "}
                <span className="holo-text">Fresh Phone.</span>
              </h2>
            </div>

            <AboutPromises />
          </div>
        </section>

        <VerifyAndBenefits />

        <AboutContactCard />
      </main>
      <Footer />
    </div>
  );
}
