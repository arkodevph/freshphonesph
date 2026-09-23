/* Decorative Y2K SVG primitives: glossy 3D-style stars, hearts, sparkles, clouds.
   Pure presentational, server-rendered. Marked aria-hidden. */

type SvgProps = React.SVGProps<SVGSVGElement> & { className?: string };

export function GlossyStar({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...p}>
      <defs>
        <radialGradient id="gs1" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#bcd2ff" />
          <stop offset="100%" stopColor="#6f8fe6" />
        </radialGradient>
      </defs>
      <path
        d="M50 4c5 22 18 35 42 42-24 7-37 20-42 42-5-22-18-35-42-42 24-7 37-20 42-42Z"
        fill="url(#gs1)"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <ellipse cx="40" cy="32" rx="9" ry="5" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function PinkStar({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...p}>
      <defs>
        <radialGradient id="ps1" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#ffc3e2" />
          <stop offset="100%" stopColor="#ff5fa8" />
        </radialGradient>
      </defs>
      <path
        d="M50 4c5 22 18 35 42 42-24 7-37 20-42 42-5-22-18-35-42-42 24-7 37-20 42-42Z"
        fill="url(#ps1)"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <ellipse cx="40" cy="32" rx="8" ry="5" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function GlossyHeart({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...p}>
      <defs>
        <radialGradient id="gh1" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#ffb6da" />
          <stop offset="100%" stopColor="#ff4f9d" />
        </radialGradient>
      </defs>
      <path
        d="M50 86C22 66 8 50 8 33 8 20 18 11 30 11c8 0 15 4 20 12 5-8 12-12 20-12 12 0 22 9 22 22 0 17-14 33-42 53Z"
        fill="url(#gh1)"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <ellipse cx="33" cy="30" rx="9" ry="6" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function Sparkle({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...p}>
      <path
        d="M50 6c4 28 16 40 44 44-28 4-40 16-44 44-4-28-16-40-44-44 28-4 40-16 44-44Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function PixelHeart({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden {...p}>
      <path
        fill="currentColor"
        d="M3 1h4v2h2V1h4v2h2v6h-2v2h-2v2h-2v2H7v-2H5v-2H3V9H1V3h2V1Z"
      />
    </svg>
  );
}

export function CloudBlob({ className, ...p }: SvgProps) {
  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden {...p}>
      <defs>
        <radialGradient id="cb1" cx="42%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cfe0ff" />
          <stop offset="100%" stopColor="#8aa2f2" />
        </radialGradient>
      </defs>
      <path
        d="M55 120c-24 0-43-17-43-39 0-19 14-34 33-38 4-23 24-39 48-39 22 0 41 14 47 35 21 1 38 17 38 38 0 23-19 43-43 43H55Z"
        fill="url(#cb1)"
        stroke="#ffffff"
        strokeWidth="3"
      />
      <ellipse cx="78" cy="48" rx="26" ry="13" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

/* A field of softly floating decorations positioned around a section. */
export function DecorField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden>
      <GlossyStar className="absolute left-[4%] top-[14%] h-10 w-10 animate-[twinkle_2.4s_ease-in-out_infinite]" />
      <PinkStar className="absolute right-[8%] top-[10%] h-8 w-8 animate-[twinkle_3s_ease-in-out_infinite]" />
      <GlossyHeart className="absolute left-[10%] bottom-[16%] h-9 w-9 animate-[bob_4s_ease-in-out_infinite]" />
      <Sparkle className="absolute right-[16%] bottom-[24%] h-6 w-6 animate-[twinkle_2.8s_ease-in-out_infinite] drop-shadow" />
      <PixelHeart className="absolute left-[44%] top-[6%] h-6 w-6 text-lilac animate-[bob_5s_ease-in-out_infinite]" />
      <GlossyStar className="absolute right-[4%] bottom-[10%] h-7 w-7 animate-[float_7s_ease-in-out_infinite]" />
    </div>
  );
}
