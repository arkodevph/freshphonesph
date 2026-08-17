import Image from "next/image";
import { ShieldCheck, Sparkle, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  GlossyStar,
  PinkStar,
  GlossyHeart,
  Sparkle as SparkleDecor,
  CloudBlob,
  PixelHeart,
} from "./decor";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-4 pb-16 pt-24 lg:pb-24"
    >
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
          <CloudBlob className="absolute -left-10 top-24 w-40 opacity-80 animate-float sm:w-52" />
          <CloudBlob className="absolute right-[-3rem] top-44 w-36 opacity-70 animate-float-slow sm:w-48" />
          <GlossyStar className="absolute left-[10%] top-[44%] h-9 w-9 animate-twinkle" />
          <PixelHeart className="absolute bottom-[20%] left-[6%] h-7 w-7 animate-bob text-hotpink" />
          <PixelHeart className="absolute right-[6%] top-[58%] h-6 w-6 animate-bob text-blue" />
        </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-700 text-blue-ink">
            <ShieldCheck weight="fill" className="h-4 w-4 text-blue" />
            DTI registered iPhone &amp; iPad paluwagan
          </span>

          <h1 className="font-display mt-5 text-5xl font-700 leading-[1.02] tracking-tight text-blue-ink sm:text-6xl lg:text-7xl">
            Your next phone, <span className="holo-text">made manageable.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-lg font-500 text-ink-soft lg:mx-0">
            Choose a quality phone, join an approved paluwagan batch, and follow a clear payment schedule with support at every step.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#units"
              className="btn-candy inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-700 sm:w-auto"
            >
              <Sparkle weight="fill" className="h-5 w-5" />
              View Available Units
            </a>
            <a
              href="#how"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-blue/25 bg-white/70 px-7 py-3.5 text-base font-700 text-blue-ink backdrop-blur transition-colors hover:border-blue/50 hover:text-blue sm:w-auto"
            >
              How it Works
              <ArrowRight weight="bold" className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-800 text-blue transition-colors hover:bg-white/60 hover:text-blue-600 sm:w-auto"
            >
              Login to Portal
            </a>
          </div>
        </div>

        {/* Backgroundless brand artwork */}
        <div className="relative mx-auto grid min-h-[520px] w-full max-w-xl place-items-center sm:min-h-[600px]">
          <div className="absolute inset-[12%] -z-10 rounded-full bg-gradient-to-br from-bubblegum/45 via-lilac/55 to-cyan/45 blur-3xl" />
          <div className="absolute h-[72%] w-[92%] rotate-[-10deg] rounded-[50%] border-2 border-blue/10" aria-hidden />
          <div className="absolute h-[58%] w-[78%] rotate-[14deg] rounded-[50%] border border-bubblegum/30" aria-hidden />
          <Image
            src="/brand/fresh-phones-hero-cutout-trimmed.webp"
            alt="Fresh Phones PH Gadget Center brand artwork"
            width={1695}
            height={1532}
            priority
            draggable={false}
            className="h-auto w-[108%] max-w-none animate-float-slow drop-shadow-[0_32px_38px_rgba(47,107,255,.28)]"
          />

          {/* floating decor anchored to the frame */}
          <GlossyStar className="absolute -left-5 top-8 h-12 w-12 animate-twinkle" aria-hidden />
          <PinkStar className="absolute -right-4 top-1/3 h-10 w-10 animate-twinkle" aria-hidden />
          <GlossyHeart className="absolute -bottom-4 left-1/4 h-11 w-11 animate-bob" aria-hidden />
          <SparkleDecor className="absolute right-6 -top-3 h-7 w-7 animate-twinkle drop-shadow-lg" aria-hidden />

          {/* honest, on-brand sticker (no fake version/stock labels) */}
          <div className="absolute -right-3 bottom-10 rotate-12 rounded-2xl bg-white px-3 py-1.5 text-xs font-700 text-hotpink shadow-lg ring-2 ring-hotpink/20">
            0% interest
          </div>
        </div>
      </div>
    </section>
  );
}
