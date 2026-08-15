"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const faqs = [
  {
    q: "What is the Fresh Phones PH paluwagan?",
    a: "It's a friendly, flexible way to own an iPhone or iPad. Instead of paying the full price upfront, you pay in small amounts on a schedule that suits you, until the device is yours.",
  },
  {
    q: "Is this legit? How do I know I won't get scammed?",
    a: "Fresh Phones PH is DTI registered under FP Gadget Center and owned by Mr. Dale John Garcia Tambong. This is our official and only page. Message us anytime and we'll gladly answer your questions.",
  },
  {
    q: "Are the devices pre-owned or brand new?",
    a: "Both! We offer quality pre-owned units and brand-new units. Every device is tested, checked, and in excellent condition before it reaches you.",
  },
  {
    q: "What payment options do you offer?",
    a: "You can pay weekly, twice a month (15 & 30), or monthly, with rates as low as a few pesos a day. Pay through GCash, Maya, or bank transfer.",
  },
  {
    q: "Do you buy old devices?",
    a: "Yes, we buy units! If you have an old iPhone or iPad, message us with the details and we'll give you a fair quote.",
  },
  {
    q: "How do I receive my device?",
    a: "We deliver fast and smooth, right to your doorstep. Just message our page and we'll walk you through the whole process.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            Frequently asked <span className="holo-text">questions</span>
          </>
        }
        subtitle="Everything you need to feel confident before reserving your slot."
      />

      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 50}>
              <div className="glass overflow-hidden rounded-3xl">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base font-700 text-blue-ink sm:text-lg">
                    {f.q}
                  </span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full chrome text-blue-ink transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <Plus weight="bold" className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm font-500 leading-relaxed text-ink-soft">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
