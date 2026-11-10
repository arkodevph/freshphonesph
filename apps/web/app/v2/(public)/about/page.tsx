import type { Metadata } from "next";
import Image from "next/image";
import DoodleIcon from "@/components/DoodleIcon";
import hero from "@/components/Hero.module.css";
import { VerifyAndBenefits } from "@/components/RecentLandingSections";
import AboutContactCard from "@/components/AboutContactCard";
import AboutPromises from "@/components/AboutPromises";
import VerificationGlass from "@/components/VerificationGlass";
import scene from "@/components/LandingContent.module.css";
import styles from "@/components/about-page.module.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "About Us · Fresh Phones PH",
  description:
    "Meet Dale John Garcia Tambong, owner of Fresh Phones PH and FP Gadget Center, and learn what guides the business.",
};

export default function AboutPage() {
  return (
    <>
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
                <p className={`${hero.eyebrow} font-display`}>
                  <DoodleIcon name="id-heart" size={20} /> Meet the owner
                </p>
                <h1 className={styles.heroTitle}>
                  A business built on{" "}
                  <span className={styles.trust}>trust.</span>
                </h1>
                <p className={styles.heroDescription}>
                  Fresh Phones PH is owned by{" "}
                  <strong className="text-blue-ink">
                    Mr. Dale John Garcia Tambong
                  </strong>{" "}
                  and operates under the DTI-registered business name FP Gadget
                  Center.
                </p>
                <a
                  href="#our-story"
                  className={`${hero.cta} ${styles.storyButton}`}
                >
                  <DoodleIcon name="chat-heart" size={28} />
                  Get to know us
                </a>
              </div>
              <div className={`${scene.joinCard} ${styles.founderCard}`}>
                <VerificationGlass className={scene.glassRefraction} />
                <div className="absolute left-8 top-8 z-30 max-w-xs">
                  <p
                    className={`${styles.founderEyebrow} font-display text-xs font-800 uppercase tracking-[.18em]`}
                  >
                    Fresh Phones PH
                  </p>
                  <h2 className={styles.founderTitle}>
                    Meet the person behind the promise.
                  </h2>
                </div>
                <DoodleIcon
                  name="phone-heart"
                  size={128}
                  className={`${styles.founderDoodle} ${styles.founderPhone}`}
                />
                <DoodleIcon
                  name="shield-heart"
                  size={104}
                  className={`${styles.founderDoodle} ${styles.founderShield}`}
                />
                <DoodleIcon
                  name="heart"
                  size={56}
                  className={`${styles.founderDoodle} ${styles.founderHeart}`}
                />
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
                <div aria-hidden="true" className={styles.founderFade} />
                <p
                  className={`${styles.founderName} font-display text-xl font-800`}
                >
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
              <p
                className={`${styles.sectionEyebrow} font-display text-xs font-800 uppercase tracking-[.22em]`}
              >
                What we stand for
              </p>
              <h2 className={styles.sectionTitle}>
                Four promises behind every{" "}
                <span className={styles.sectionAccent}>Fresh Phone.</span>
              </h2>
            </div>

            <AboutPromises />
          </div>
        </section>

        <VerifyAndBenefits />

        <AboutContactCard />
      </main>
    </>
  );
}
