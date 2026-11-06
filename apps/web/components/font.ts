import localFont from "next/font/local";

export const landingV2Font = localFont({
  src: "./fonts/sono-variable.woff2",
  variable: "--font-landing-v2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
});
