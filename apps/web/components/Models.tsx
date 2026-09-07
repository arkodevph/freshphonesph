"use client";

import { useState } from "react";
import { ArrowUpRight, AppleLogo } from "@phosphor-icons/react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

type Color = { name: string; hex: string };
type Availability = "In stock" | "Few left" | "Reserves fast";

type Unit = {
  name: string;
  type: "iPhone" | "iPad";
  condition: "Pre-Owned" | "Brand New";
  daily: number;
  tag?: string;
  storage: string[];
  colors: Color[];
  availability: Availability;
  grade?: string;
};

// Illustrative catalog for the marketing landing — not the real inventory system.
const units: Unit[] = [
  {
    name: "iPhone 11",
    type: "iPhone",
    condition: "Pre-Owned",
    daily: 59,
    tag: "Lowest daily",
    storage: ["64GB", "128GB", "256GB"],
    colors: [
      { name: "Black", hex: "#1f2124" },
      { name: "White", hex: "#f2f1ec" },
      { name: "Purple", hex: "#d4c8e8" },
      { name: "Green", hex: "#cfe6d7" },
    ],
    availability: "In stock",
    grade: "Grade A · Like new",
  },
  {
    name: "iPhone 12",
    type: "iPhone",
    condition: "Pre-Owned",
    daily: 69,
    storage: ["64GB", "128GB", "256GB"],
    colors: [
      { name: "Blue", hex: "#284b6d" },
      { name: "Black", hex: "#1f2124" },
      { name: "White", hex: "#f2f1ec" },
      { name: "Purple", hex: "#b8a7d9" },
    ],
    availability: "In stock",
    grade: "Grade A · Excellent",
  },
  {
    name: "iPhone 13",
    type: "iPhone",
    condition: "Pre-Owned",
    daily: 89,
    storage: ["128GB", "256GB", "512GB"],
    colors: [
      { name: "Midnight", hex: "#2a2f36" },
      { name: "Starlight", hex: "#f6f1e7" },
      { name: "Pink", hex: "#f4d8dc" },
      { name: "Blue", hex: "#48586b" },
    ],
    availability: "Few left",
    grade: "Grade A · Like new",
  },
  {
    name: "iPad 10th Gen",
    type: "iPad",
    condition: "Pre-Owned",
    daily: 89,
    storage: ["64GB", "256GB"],
    colors: [
      { name: "Silver", hex: "#e4e5e8" },
      { name: "Blue", hex: "#6fa3c7" },
      { name: "Pink", hex: "#e7b7bf" },
      { name: "Yellow", hex: "#f2d98f" },
    ],
    availability: "In stock",
    grade: "Grade A · Excellent",
  },
  {
    name: "iPad A16",
    type: "iPad",
    condition: "Brand New",
    daily: 95,
    tag: "Brand new",
    storage: ["128GB", "256GB"],
    colors: [
      { name: "Silver", hex: "#e4e5e8" },
      { name: "Blue", hex: "#7fb0d4" },
      { name: "Pink", hex: "#eabec5" },
      { name: "Yellow", hex: "#f4dd97" },
    ],
    availability: "Reserves fast",
  },
  {
    name: "iPhone 13 Pro",
    type: "iPhone",
    condition: "Pre-Owned",
    daily: 105,
    tag: "Top pick",
    storage: ["128GB", "256GB", "512GB", "1TB"],
    colors: [
      { name: "Graphite", hex: "#45464a" },
      { name: "Sierra Blue", hex: "#a7c3dd" },
      { name: "Gold", hex: "#e6cfa6" },
      { name: "Silver", hex: "#e6e7e2" },
    ],
    availability: "Few left",
    grade: "Grade A+ · Pristine",
  },
];

const filters = ["All", "iPhone", "iPad", "Brand New"] as const;
type Filter = (typeof filters)[number];

const availabilityDot: Record<Availability, string> = {
  "In stock": "bg-emerald-500",
  "Few left": "bg-amber-500",
  "Reserves fast": "bg-hotpink",
};

// Shift a #rrggbb hex lighter (positive) or darker (negative) for the body gradient.
function shade(hex: string, percent: number) {
  const n = parseInt(hex.slice(1), 16);
  const d = Math.round((255 * percent) / 100);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + d);
  const g = clamp(((n >> 8) & 0xff) + d);
  const b = clamp((n & 0xff) + d);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function DevicePreview({ unit, color }: { unit: Unit; color: string }) {
  const isPad = unit.type === "iPad";
  const isPro = unit.name.includes("Pro");
  const cameraCount = isPad ? 1 : isPro ? 3 : 2;

  return (
    <div className="unit-device relative h-full w-full" aria-hidden="true">
      {/* Back of the device — shows the Apple logo and camera plateau */}
      <div
        className={`absolute left-[16%] top-[24%] h-[94%] overflow-hidden border border-black/10 shadow-[0_18px_40px_rgba(20,38,107,.28)] ${isPad ? "w-[44%] rounded-[20px]" : "w-[36%] rounded-[30px]"}`}
        style={{ background: `linear-gradient(155deg, ${shade(color, 8)} 0%, ${color} 45%, ${shade(color, -20)} 100%)` }}
      >
        <div className={`absolute left-[8%] top-[4%] grid gap-1.5 rounded-2xl bg-black/15 p-2 backdrop-blur-sm ${cameraCount === 3 ? "grid-cols-2" : "grid-cols-1"}`}>
          {Array.from({ length: cameraCount }, (_, i) => (
            <span key={i} className="h-4 w-4 rounded-full border-[3px] border-black/40 bg-[#0a1120] shadow-inner" />
          ))}
        </div>
        <AppleLogo weight="fill" className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white/80 mix-blend-soft-light drop-shadow-[0_1px_2px_rgba(0,0,0,.25)]" />
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.35),transparent_42%)]" />
      </div>

      {/* Front of the device — reflective screen */}
      <div className={`absolute left-[50%] top-[20%] h-[98%] border-[4px] border-[#20293c] bg-[#070d18] p-1 shadow-[0_22px_44px_rgba(20,38,107,.3)] ${isPad ? "w-[46%] rounded-[21px]" : "w-[37%] rounded-[31px]"}`}>
        <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[linear-gradient(150deg,#e80066_3%,#ff3154_34%,#f0ded6_58%,#0064b9_82%,#003b88_100%)]">
          {!isPad && (
            <span className={`absolute left-1/2 top-0 h-3 -translate-x-1/2 bg-[#070d18] ${isPro ? "w-9 rounded-b-full" : "w-11 rounded-b-xl"}`} />
          )}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.4),transparent_38%)]" />
        </div>
      </div>
    </div>
  );
}

function UnitCard({ unit }: { unit: Unit }) {
  const [color, setColor] = useState(unit.colors[0]);

  return (
    <article className="unit-card glass group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-5">
      <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-700 text-blue-ink backdrop-blur">
        <span className={`h-1.5 w-1.5 rounded-full ${availabilityDot[unit.availability]}`} />
        {unit.availability}
      </span>
      {unit.tag && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-hotpink px-3 py-1 text-[11px] font-700 text-white shadow">
          {unit.tag}
        </span>
      )}

      <div className="relative mb-4 mt-2 h-48 overflow-hidden rounded-2xl bg-gradient-to-b from-white/70 to-white/30">
        <DevicePreview unit={unit} color={color.hex} />
      </div>

      <div className="mb-3 flex items-center gap-1.5">
        {unit.colors.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Show ${unit.name} in ${c.name}`}
            aria-pressed={c.name === color.name}
            className={`h-5 w-5 rounded-full border transition ${c.name === color.name ? "ring-2 ring-blue ring-offset-1" : "border-black/15"}`}
            style={{ background: c.hex }}
          />
        ))}
        <span className="ml-1 text-xs font-600 text-ink-soft">{color.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <h3 className="font-display text-xl font-700 text-blue-ink">{unit.name}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-700 ${
            unit.condition === "Brand New" ? "bg-blue/15 text-blue" : "bg-lilac/25 text-[#6b4fb0]"
          }`}
        >
          {unit.condition}
        </span>
      </div>
      <p className="mt-0.5 text-sm font-600 text-ink-soft">{unit.grade ?? "Sealed & warranty-ready"}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {unit.storage.map((s) => (
          <span key={s} className="rounded-lg bg-blue-ink/5 px-2 py-1 text-[11px] font-700 text-blue-ink/70">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-display text-2xl font-700 holo-text">
            ₱{unit.daily}
            <span className="text-sm text-ink-soft">/day</span>
          </p>
          <p className="text-xs font-600 text-ink-soft/80">Weekly, 15 &amp; 30, or monthly</p>
        </div>
        <a
          href="#join"
          className="grid h-11 w-11 place-items-center rounded-full btn-candy"
          aria-label={`Reserve ${unit.name}`}
        >
          <ArrowUpRight weight="bold" className="h-5 w-5" />
        </a>
      </div>
    </article>
  );
}

export default function Models() {
  const [filter, setFilter] = useState<Filter>("All");
  const [ascending, setAscending] = useState(true);

  const shown = units
    .filter((u) =>
      filter === "All" ? true : filter === "Brand New" ? u.condition === "Brand New" : u.type === filter,
    )
    .sort((a, b) => (ascending ? a.daily - b.daily : b.daily - a.daily));

  return (
    <section id="units" className="relative scroll-mt-24 px-4 py-20">
      <SectionHeading
        title={
          <>
            Phones for your <span className="holo-text">next chapter</span>
          </>
        }
        subtitle="Clear pricing, payment schedules, and availability—before you message us."
      />

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-blue-ink/5 p-1">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-4 py-1.5 text-sm font-700 transition ${
                filter === f ? "bg-white text-blue-ink shadow" : "text-ink-soft hover:text-blue-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAscending((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-1.5 text-sm font-700 text-blue-ink transition hover:border-black/25"
        >
          Daily price <span aria-hidden="true">{ascending ? "↑" : "↓"}</span>
        </button>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((u, i) => (
          <Reveal key={u.name} delay={(i % 3) * 90}>
            <UnitCard unit={u} />
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-8 text-center">
        <p className="text-sm font-600 text-ink-soft">
          Looking for a different model or storage?{" "}
          <a href="#join" className="font-700 text-blue underline-offset-2 hover:underline">
            Message us and we&apos;ll set up a plan for you.
          </a>
        </p>
      </Reveal>
    </section>
  );
}
