import { Sparkle, ChatCircleDots, Phone } from "@phosphor-icons/react/dist/ssr";
import {
  GlossyStar,
  PinkStar,
  GlossyHeart,
  Sparkle as SparkleDecor,
  CloudBlob,
} from "./decor";
import Reveal from "./Reveal";

export default function CtaJoin() {
  return (
    <section id="join" className="px-4 py-20">
      <Reveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2f6bff] via-[#4f86ff] to-[#1f53e6] px-6 py-14 text-center shadow-[0_40px_80px_-30px_rgba(47,107,255,0.8)] sm:px-12 sm:py-16">
          {/* decor */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <CloudBlob className="absolute -left-8 -top-6 w-40 opacity-40" />
            <CloudBlob className="absolute -bottom-10 -right-6 w-44 opacity-40" />
            <GlossyStar className="absolute left-[8%] top-[30%] h-9 w-9 animate-[twinkle_2.6s_ease-in-out_infinite]" />
            <PinkStar className="absolute right-[10%] top-[24%] h-8 w-8 animate-[twinkle_3s_ease-in-out_infinite]" />
            <GlossyHeart className="absolute right-[16%] bottom-[18%] h-9 w-9 animate-[bob_4s_ease-in-out_infinite]" />
            <SparkleDecor className="absolute left-[18%] bottom-[20%] h-6 w-6 animate-twinkle" />
          </div>

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-700 text-white backdrop-blur">
              <Sparkle weight="fill" className="h-4 w-4" /> Slots are open now
            </span>
            <h2 className="font-display mx-auto mt-5 max-w-2xl text-4xl font-700 leading-tight tracking-tight text-white sm:text-5xl">
              Ready for your new device?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg font-500 text-white/90">
              Message our page and Mr. Dale John Tambong for more details. We&apos;ll
              walk you through everything.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="https://web.facebook.com/FreshPhonesPh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-700 text-blue-ink shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                <ChatCircleDots weight="fill" className="h-5 w-5 text-blue" />
                Message our page
              </a>
              <a
                href="tel:+639624791649"
                className="btn-bubblegum inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-700 sm:w-auto"
              >
                <Phone weight="fill" className="h-5 w-5" />
                0962 479 1649
              </a>
            </div>
            <p className="mt-4 text-xs font-600 text-white/70">
              Official and only page of Fresh Phones PH.
            </p>
            <p className="mt-6 text-sm text-white">Already a customer? <a href="/support" className="font-700 underline underline-offset-4">Start or follow a support request</a>.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
